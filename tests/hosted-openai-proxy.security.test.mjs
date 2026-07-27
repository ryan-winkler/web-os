import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hosted OpenAI access keeps the shared key behind a bounded server proxy", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  const browserWorker = await readFile(new URL("../public/python-worker.mjs", import.meta.url), "utf8");
  const router = await readFile(
    new URL("../public/downloads/support_agent_router.py", import.meta.url),
    "utf8",
  );

  assert.match(worker, /OPENAI_API_KEY\?: string/);
  assert.match(worker, /payload\.model !== HOSTED_MODEL/);
  assert.match(worker, /payload\.max_output_tokens = Math\.min/);
  assert.match(worker, /payload\.tools = \[\]/);
  assert.match(worker, /spent_micros \+ reserved_micros \+ \? <= budget_micros/);
  assert.match(worker, /request_count = request_count \+ 1/);
  assert.match(worker, /request\.headers\.get\("Origin"\) !== url\.origin/);
  assert.match(worker, /const usesHostedKey = suppliedKey === HOSTED_PROXY_KEY/);
  assert.match(worker, /const upstreamKey = usesHostedKey \? env\.OPENAI_API_KEY! : suppliedKey/);
  assert.doesNotMatch(worker, /console\.log\(.*OPENAI_API_KEY/);

  assert.match(browserWorker, /api\/openai\/v1/);
  assert.match(browserWorker, /sessionApiKey \|\| "sk-site-proxy-not-a-secret"/);
  assert.match(browserWorker, /file === "support_agent_router\.py" \? apiBase : ""/);
  assert.match(router, /set_default_openai_client\(AsyncOpenAI\(api_key=api_key, base_url=base_url\)\)/);
});
