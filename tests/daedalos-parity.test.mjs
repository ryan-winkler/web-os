import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the registry includes every daedalOS user-facing app family", async () => {
  const registry = await readFile(new URL("app/desktop/appRegistry.ts", root), "utf8");
  for (const title of [
    "BoxedWine",
    "Browser",
    "Chess",
    "ClassiCube",
    "DX-Ball",
    "DevTools",
    "EmulatorJS",
    "IRC",
    "Marked",
    "Messenger",
    "Monaco Editor",
    "OpenType",
    "PDF",
    "Paint",
    "Photos",
    "Quake III Arena",
    "Ruffle",
    "Space Cadet Pinball",
    "Stable Diffusion",
    "Terminal",
    "TIC-80",
    "TinyMCE",
    "Virtual x86",
    "Video Player",
    "Vim",
    "Webamp",
  ]) {
    assert.match(registry, new RegExp(`title: "${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
});

test("minimising preserves mounted app and worker state", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /if \(!state\.open\) return null/);
  assert.match(page, /hidden=\{state\.minimized\}/);
  assert.doesNotMatch(page, /if \(!state\.open \|\| state\.minimized\) return null/);
  assert.match(page, /postMessage\(\{ type: "warm" \}\)/);
});

test("named productivity apps use their real browser runtimes", async () => {
  const apps = await readFile(new URL("app/desktop/DaedalApps.tsx", root), "utf8");
  assert.match(apps, /monaco-editor@0\.52\.2/);
  assert.match(apps, /tinymce@7\.9\.1/);
  assert.match(apps, /license_key: "gpl"/);
  assert.match(apps, /@ruffle-rs\/ruffle/);
  assert.match(apps, /application\/pdf/);
});

test("copied app entries launch direct app runtimes, never another desktop", async () => {
  const [apps, pinball] = await Promise.all([
    readFile(new URL("app/desktop/DaedalApps.tsx", root), "utf8"),
    readFile(new URL("public/apps/spacecadet/index.html", root), "utf8"),
  ]);

  assert.doesNotMatch(apps, /dustinbrett\.com\/\?app=/);
  assert.doesNotMatch(apps, /is not installed/);
  assert.match(apps, /runtime: "\/apps\/spacecadet\/"/);
  for (const runtime of [
    "kiwiirc.com/nextclient/",
    "classicube.net/server/play/",
    "sqmscm.github.io/dxball/",
    "lrusso.github.io/Quake3/Quake3.htm",
    "tic80.com/play",
    "websd.mlc.ai/",
    "emulatorjs.github.io/EmulatorJS/",
    "copy.sh/v86/",
    "boxedwine.org/demo/",
  ]) {
    assert.match(apps, new RegExp(runtime.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(pinball, /pinball\.alula\.me\/SpaceCadetPinball\.js/);
  assert.match(pinball, /Content-Security-Policy/);
});

test("DOOM uses the canonical launcher path and repairs legacy html requests", async () => {
  const [page, layout, serviceWorker] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8"),
  ]);

  assert.match(page, /src=\{`\/doom\/launcher\?v=\$\{RUNTIME_ASSET_VERSION\}`\}/);
  assert.doesNotMatch(page, /src=\{`\/doom\/launcher\.html/);
  assert.match(layout, /navigator\.serviceWorker\.register\("\/sw\.js\?v=20260728-1"\)/);
  assert.match(serviceWorker, /LEGACY_DOOM_LAUNCHER/);
  assert.match(serviceWorker, /url\.pathname === LEGACY_DOOM_LAUNCHER/);
  assert.match(serviceWorker, /\/doom\/launcher/);
});
