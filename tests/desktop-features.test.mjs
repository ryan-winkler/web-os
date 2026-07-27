import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the local help, supplied images, and one complete archive", async () => {
  const [manual, doomLauncher, doomApi, doomRuntime, doomLicense] = await Promise.all([
    readFile(new URL("public/downloads/MANUAL.md", root), "utf8"),
    readFile(new URL("public/doom/launcher.html", root), "utf8"),
    readFile(new URL("public/doom/js-dos-api.js", root), "utf8"),
    stat(new URL("public/doom/js-dos-v3.js", root)),
    readFile(new URL("public/doom/THIRD_PARTY_LICENSE.txt", root), "utf8"),
  ]);
  assert.match(manual, /DOOM on JS-DOS User Manual/);
  assert.match(manual, /\| Fire \| S \|/);
  assert.match(doomLauncher, /href="\/downloads\/MANUAL\.md"/);
  assert.match(doomLauncher, /src="\/doom\/js-dos-api\.js\?v=20260727-6"/);
  assert.match(doomLauncher, /Content-Security-Policy/);
  assert.match(doomLauncher, /href="\/doom\/js-dos-v3\.js\?v=20260727-6"/);
  assert.match(doomLauncher, /thedoggybrad\.github\.io\/doom_on_js-dos\/DOOM-@evilution\.zip/);
  assert.doesNotMatch(doomLauncher, /thedoggybrad\.github\.io\/doom_on_js-dos\/(?:js-dos-api|js-dos-v3|DOOM\.png)/);
  assert.match(doomApi, /\/doom\/js-dos-v3\.js/);
  assert.doesNotMatch(doomApi, /thedoggybrad\.github\.io\/doom_on_js-dos\/js-dos-v3\.js/);
  assert.ok(doomRuntime.size > 5_000_000);
  assert.match(doomLicense, /MIT License/);
  assert.match(doomLicense, /TheDoggyBrad Software Lab/);

  await access(new URL("public/wallpaper.png", root));
  await access(new URL("public/ryan-profile-card.png", root));
  const archive = await stat(new URL("public/downloads/support-agent-router-interview.zip", root));
  assert.ok(archive.size > 1_000);
});

test("uses the real Python boundary, warms it once, and preserves the public-site safety gate", async () => {
  const [page, worker, layout, serviceWorker] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("public/python-worker.mjs", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8"),
  ]);
  assert.match(page, /new Worker\(`\/python-worker\.mjs\?v=\$\{RUNTIME_ASSET_VERSION\}`/);
  assert.match(page, /support-agent-router-interview\.zip\?v=\$\{RUNTIME_ASSET_VERSION\}/);
  assert.match(page, /AI Support Engineer \(hopefully\)/);
  assert.match(page, /session-only key/i);
  assert.match(page, /Never saved to local storage, terminal history, logs, or source/i);
  assert.match(page, /Use for session/);
  assert.match(worker, /runpy\.run_path/);
  assert.match(worker, /import \{ loadPyodide \} from "\.\/pyodide\/pyodide\.mjs"/);
  assert.match(worker, /const INDEX_URL = "\/pyodide\/"/);
  assert.match(worker, /micropip\.install\("openai-agents==0\.18\.3", reinstall=True\)/);
  assert.match(worker, /runPythonAsync\("import support_agent_router"\)/);
  assert.match(worker, /content-type.*application\/wasm/s);
  assert.match(worker, /loadPackage\(\["micropip", "pydantic"\]\)/);
  assert.doesNotMatch(worker, /loadPackage\([^)]*"pytest"/);
  assert.match(worker, /data\.type === "warm"/);
  assert.match(worker, /type: "ready"/);
  assert.match(worker, /sessionApiKey/);
  assert.match(worker, /\[secret redacted\]/);
  assert.match(layout, /navigator\.serviceWorker\.register\("\/sw\.js\?v=20260727-6"\)/);
  assert.match(serviceWorker, /const VERSIONED_RUNTIME = new Set/);
  assert.match(serviceWorker, /DOOM-@evilution\.zip/);
  assert.match(serviceWorker, /cdn\.jsdelivr\.net/);
  assert.match(serviceWorker, /files\.pythonhosted\.org/);
  assert.match(serviceWorker, /Content-Type", "application\/wasm"/);
  assert.doesNotMatch(serviceWorker, /cache\.addAll/);
  assert.doesNotMatch(serviceWorker, /api\/openai/);
  const pyodideWasm = await stat(new URL("public/pyodide/pyodide.asm.wasm", root));
  await Promise.all([
    access(new URL("public/pyodide/pyodide.asm.mjs", root)),
    access(new URL("public/pyodide/pydantic-2.12.5-py3-none-any.whl", root)),
  ]);
  assert.ok(pyodideWasm.size > 9_000_000);
});

test("exposes the requested desktop interactions and direct attributions", async () => {
  const [page, css, attributions] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("public/downloads/ATTRIBUTIONS.md", root), "utf8"),
  ]);
  assert.match(page, /MovableDesktopItem/);
  const movable = page.slice(page.indexOf("function MovableDesktopItem"), page.indexOf("function AppWindow"));
  assert.doesNotMatch(movable, /setPointerCapture/);
  assert.match(movable, /pointercancel/);
  assert.match(page, /onDrag=\{\(event\) => beginDrag/);
  assert.match(page, /<span>Public<\/span>/);
  assert.match(page, /Run in Command Prompt/);
  assert.match(page, /Search apps, files, and commands/);
  assert.match(page, /About me/);
  assert.match(page, /https:\/\/ryanw\.eu/);
  assert.match(page, /Open local manual/);
  assert.match(page, /Download all \(\.zip\)/);
  assert.match(page, /Scratchpad/);
  assert.match(page, /Code Lab/);
  assert.match(page, /Media Deck/);
  assert.match(page, /Camera/);
  assert.match(page, /Wallpaper Studio/);
  assert.match(page, /Paint/);
  assert.match(css, /url\("\/wallpaper\.png"\)/);
  assert.match(css, /\.taskbar-system/);
  assert.match(css, /\.start-recents/);
  assert.match(attributions, /daedalOS by Dustin Brett is a direct design, interaction, and implementation/);
  assert.match(attributions, /CoffeeOS by jsagayap is a direct design reference/);
  assert.match(attributions, /Hyggshi OS Web Edition by HyggshiOSDeveloper was researched as a direct/);
});
