/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  RATE_LIMIT_SALT?: string;
  HOSTED_BUDGET_EUR_CENTS?: string;
  HOSTED_MAX_REQUESTS_PER_DAY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const OPENAI_RESPONSES_PATH = "/api/openai/v1/responses";
const OPENAI_BUDGET_PATH = "/api/openai/budget";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const HOSTED_MODEL = "gpt-4.1-mini";
const HOSTED_PROXY_KEY = "sk-site-proxy-not-a-secret";
const MAX_REQUEST_BYTES = 64_000;
const MAX_OUTPUT_TOKENS = 800;
const USD_TO_EUR_BUFFER = 1.25;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function budgetMicros(env: Env) {
  const cents = Number.parseInt(env.HOSTED_BUDGET_EUR_CENTS ?? "3000", 10);
  return Math.min(3000, Math.max(1, Number.isFinite(cents) ? cents : 3000)) * 10_000;
}

function dailyLimit(env: Env) {
  const limit = Number.parseInt(env.HOSTED_MAX_REQUESTS_PER_DAY ?? "40", 10);
  return Math.min(100, Math.max(1, Number.isFinite(limit) ? limit : 40));
}

async function ensureBudgetTables(env: Env) {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS budget_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        budget_micros INTEGER NOT NULL,
        spent_micros INTEGER NOT NULL DEFAULT 0,
        reserved_micros INTEGER NOT NULL DEFAULT 0
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS request_limits (
        client_hash TEXT NOT NULL,
        day TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (client_hash, day)
      )`,
    ),
  ]);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO budget_state (id, budget_micros) VALUES (1, ?)",
  ).bind(budgetMicros(env)).run();
  await env.DB.prepare(
    "UPDATE budget_state SET budget_micros = ? WHERE id = 1",
  ).bind(budgetMicros(env)).run();
}

async function clientHash(request: Request, salt: string) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${ip}`),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function checkRateLimit(request: Request, env: Env) {
  if (!env.RATE_LIMIT_SALT) return false;
  const hash = await clientHash(request, env.RATE_LIMIT_SALT);
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(
    `INSERT INTO request_limits (client_hash, day, request_count)
     VALUES (?, ?, 1)
     ON CONFLICT(client_hash, day)
     DO UPDATE SET request_count = request_count + 1`,
  ).bind(hash, day).run();
  const row = await env.DB.prepare(
    "SELECT request_count FROM request_limits WHERE client_hash = ? AND day = ?",
  ).bind(hash, day).first<{ request_count: number }>();
  return Number(row?.request_count ?? 0) <= dailyLimit(env);
}

function estimateReservedMicros(requestBytes: number) {
  // OpenAI prices in USD; the buffer keeps the €30 application cap conservative.
  return Math.ceil((requestBytes * 0.4 + MAX_OUTPUT_TOKENS * 1.6) * USD_TO_EUR_BUFFER);
}

function actualCostMicros(payload: Record<string, unknown>, reserve: number) {
  const usage = payload.usage as Record<string, unknown> | undefined;
  if (!usage) return reserve;
  const input = Math.max(0, Number(usage.input_tokens ?? 0));
  const output = Math.max(0, Number(usage.output_tokens ?? 0));
  const details = usage.input_tokens_details as Record<string, unknown> | undefined;
  const cached = Math.min(input, Math.max(0, Number(details?.cached_tokens ?? 0)));
  const micros = Math.ceil(
    ((input - cached) * 0.4 + cached * 0.1 + output * 1.6) * USD_TO_EUR_BUFFER,
  );
  return Math.min(reserve, Math.max(0, micros));
}

function redactSecrets(value: string) {
  return value.replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[secret redacted]");
}

async function budgetStatus(env: Env) {
  await ensureBudgetTables(env);
  const row = await env.DB.prepare(
    "SELECT budget_micros, spent_micros, reserved_micros FROM budget_state WHERE id = 1",
  ).first<{ budget_micros: number; spent_micros: number; reserved_micros: number }>();
  const cap = Number(row?.budget_micros ?? budgetMicros(env));
  const spent = Number(row?.spent_micros ?? 0);
  const reserved = Number(row?.reserved_micros ?? 0);
  return {
    cap_eur: cap / 1_000_000,
    spent_eur: spent / 1_000_000,
    remaining_eur: Math.max(0, cap - spent - reserved) / 1_000_000,
  };
}

async function handleHostedOpenAI(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === OPENAI_BUDGET_PATH && request.method === "GET") {
    if (!env.OPENAI_API_KEY || !env.RATE_LIMIT_SALT) {
      return jsonResponse({ available: false }, 503);
    }
    return jsonResponse({ available: true, ...(await budgetStatus(env)) });
  }
  if (url.pathname !== OPENAI_RESPONSES_PATH) return null;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  if (
    request.headers.get("Origin") !== url.origin ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  ) {
    return jsonResponse({ error: "Use the Support Workstation terminal." }, 403);
  }
  const suppliedKey = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const usesHostedKey = suppliedKey === HOSTED_PROXY_KEY;
  if (!usesHostedKey && !/^sk-[A-Za-z0-9_-]{16,}$/.test(suppliedKey)) {
    return jsonResponse({ error: "A valid OpenAI API key is required." }, 401);
  }
  if (usesHostedKey && (!env.OPENAI_API_KEY || !env.RATE_LIMIT_SALT)) {
    return jsonResponse({ error: "The hosted API allowance is not configured." }, 503);
  }
  const upstreamKey = usesHostedKey ? env.OPENAI_API_KEY! : suppliedKey;

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "Request is too large." }, 413);
  }
  const bodyText = await request.text();
  if (!bodyText || bodyText.length > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "Request must contain at most 64 KB." }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400);
  }
  if (payload.model !== HOSTED_MODEL || payload.stream === true) {
    return jsonResponse({ error: "The hosted allowance supports gpt-4.1-mini without streaming." }, 400);
  }
  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    return jsonResponse({ error: "Tools are disabled on the hosted allowance." }, 400);
  }
  payload.max_output_tokens = Math.min(
    MAX_OUTPUT_TOKENS,
    Math.max(1, Number(payload.max_output_tokens ?? MAX_OUTPUT_TOKENS)),
  );
  payload.store = false;
  payload.tools = [];

  const reserve = usesHostedKey ? estimateReservedMicros(bodyText.length) : 0;
  if (usesHostedKey) {
    await ensureBudgetTables(env);
    if (!(await checkRateLimit(request, env))) {
      return jsonResponse({ error: "Daily hosted allowance reached. Use your own key or try tomorrow." }, 429);
    }
    const reservation = await env.DB.prepare(
      `UPDATE budget_state
       SET reserved_micros = reserved_micros + ?
       WHERE id = 1 AND spent_micros + reserved_micros + ? <= budget_micros`,
    ).bind(reserve, reserve).run();
    if (Number(reservation.meta?.changes ?? 0) !== 1) {
      return jsonResponse({ error: "The €30 hosted allowance has been used. Add your own key to continue." }, 402);
    }
  }

  try {
    const upstream = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstreamKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseText = redactSecrets(await upstream.text());
    let responsePayload: Record<string, unknown> = {};
    try {
      responsePayload = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      responsePayload = {};
    }
    if (usesHostedKey) {
      const actual = upstream.ok ? actualCostMicros(responsePayload, reserve) : 0;
      await env.DB.prepare(
        `UPDATE budget_state
         SET reserved_micros = MAX(0, reserved_micros - ?),
             spent_micros = MIN(budget_micros, spent_micros + ?)
         WHERE id = 1`,
      ).bind(reserve, actual).run();
    }
    return new Response(responseText, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    if (usesHostedKey) {
      await env.DB.prepare(
        "UPDATE budget_state SET reserved_micros = MAX(0, reserved_micros - ?) WHERE id = 1",
      ).bind(reserve).run();
    }
    return jsonResponse({ error: "OpenAI could not be reached. Try again." }, 502);
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostedOpenAIResponse = await handleHostedOpenAI(request, env);
    if (hostedOpenAIResponse) return hostedOpenAIResponse;

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
