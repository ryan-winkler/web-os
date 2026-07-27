const CACHE_NAME = "ryan-workstation-runtime-v7";
const ASSET_VERSION = "20260728-1";
const LEGACY_DOOM_LAUNCHER = "/doom/launcher.html";
const LOCAL_RUNTIME = new Set([
  "/doom/index.html",
  "/doom/launcher",
  "/doom/js-dos-api.js",
  "/doom/js-dos-v3.js",
  "/python-command.mjs",
  "/python-worker.mjs",
  "/pyodide/pyodide.mjs",
  "/pyodide/pyodide.asm.mjs",
  "/pyodide/pyodide.asm.wasm",
  "/pyodide/python_stdlib.zip",
  "/pyodide/pyodide-lock.json",
  "/pyodide/micropip-0.11.1-py3-none-any.whl",
  "/pyodide/annotated_types-0.7.0-py3-none-any.whl",
  "/pyodide/anyio-4.13.0-py3-none-any.whl",
  "/pyodide/attrs-26.1.0-py3-none-any.whl",
  "/pyodide/certifi-2026.4.22-py3-none-any.whl",
  "/pyodide/cffi-2.0.0-cp314-cp314-pyemscripten_2026_0_wasm32.whl",
  "/pyodide/charset_normalizer-3.4.7-py3-none-any.whl",
  "/pyodide/cryptography-47.0.0-cp314-abi3-pyemscripten_2026_0_wasm32.whl",
  "/pyodide/distro-1.9.0-py3-none-any.whl",
  "/pyodide/httpx-0.28.1-py3-none-any.whl",
  "/pyodide/idna-3.11-py3-none-any.whl",
  "/pyodide/jiter-0.13.0-cp314-cp314-pyemscripten_2026_0_wasm32.whl",
  "/pyodide/jsonschema-4.26.0-py3-none-any.whl",
  "/pyodide/jsonschema_specifications-2025.9.1-py3-none-any.whl",
  "/pyodide/pycparser-3.0-py3-none-any.whl",
  "/pyodide/pydantic-2.12.5-py3-none-any.whl",
  "/pyodide/pydantic_core-2.41.5-cp314-cp314-pyemscripten_2026_0_wasm32.whl",
  "/pyodide/pyrsistent-0.20.0-cp314-cp314-pyemscripten_2026_0_wasm32.whl",
  "/pyodide/referencing-0.37.0-py3-none-any.whl",
  "/pyodide/requests-2.33.1-py3-none-any.whl",
  "/pyodide/rpds_py-0.30.0-cp314-cp314-pyemscripten_2026_0_wasm32.whl",
  "/pyodide/six-1.17.0-py2.py3-none-any.whl",
  "/pyodide/sniffio-1.3.1-py3-none-any.whl",
  "/pyodide/starlette-1.0.0-py3-none-any.whl",
  "/pyodide/tqdm-4.67.3-py3-none-any.whl",
  "/pyodide/typing_extensions-4.15.0-py3-none-any.whl",
  "/pyodide/typing_inspection-0.4.2-py3-none-any.whl",
  "/pyodide/urllib3-2.6.3-py3-none-any.whl",
  "/downloads/support_agent_router.py",
  "/downloads/test_pure.py",
  "/downloads/test_support_agent_router.py",
]);
const VERSIONED_RUNTIME = new Set([
  "/doom/launcher",
  "/doom/js-dos-api.js",
  "/doom/js-dos-v3.js",
  "/python-command.mjs",
  "/python-worker.mjs",
  "/downloads/support_agent_router.py",
  "/downloads/test_pure.py",
  "/downloads/test_support_agent_router.py",
]);
const DOOM_GAME =
  "https://thedoggybrad.github.io/doom_on_js-dos/DOOM-@evilution.zip";

function isRuntimeRequest(url) {
  if (url.origin === self.location.origin) return LOCAL_RUNTIME.has(url.pathname);
  if (url.href === DOOM_GAME) return true;
  if (url.hostname === "cdn.jsdelivr.net") {
    return url.pathname.startsWith("/pyodide/v314.0.2/full/");
  }
  return url.hostname === "files.pythonhosted.org" &&
    url.pathname.startsWith("/packages/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return withRuntimeMime(request, cached);

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return withRuntimeMime(request, response);
}

function withRuntimeMime(request, response) {
  if (!new URL(request.url).pathname.endsWith(".wasm")) return response;
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/wasm");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      [...LOCAL_RUNTIME].map((url) =>
        cache
          .add(VERSIONED_RUNTIME.has(url) ? `${url}?v=${ASSET_VERSION}` : url)
          .catch(() => undefined),
      ),
    );
    await cache.add(DOOM_GAME).catch(() => undefined);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith("ryan-workstation-runtime-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname === LEGACY_DOOM_LAUNCHER) {
    const canonicalUrl = new URL("/doom/launcher", url);
    canonicalUrl.search = url.search;
    event.respondWith(
      cacheFirst(
        new Request(canonicalUrl, {
          credentials: "same-origin",
          headers: event.request.headers,
          redirect: "follow",
        }),
      ),
    );
    return;
  }
  if (isRuntimeRequest(url)) event.respondWith(cacheFirst(event.request));
});
