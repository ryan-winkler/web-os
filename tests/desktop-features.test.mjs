import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the local help, supplied images, and one complete archive", async () => {
  const [manual, doomLauncher] = await Promise.all([
    readFile(new URL("public/downloads/MANUAL.md", root), "utf8"),
    readFile(new URL("public/doom/index.html", root), "utf8"),
  ]);
  assert.match(manual, /DOOM on JS-DOS User Manual/);
  assert.match(manual, /\| Fire \| S \|/);
  assert.match(doomLauncher, /href="\/downloads\/MANUAL\.md"/);
  assert.match(doomLauncher, /thedoggybrad\.github\.io\/doom_on_js-dos\/DOOM-@evilution\.zip/);

  await access(new URL("public/wallpaper.png", root));
  await access(new URL("public/ryan-profile-card.png", root));
  const archive = await stat(new URL("public/downloads/support-agent-router-interview.zip", root));
  assert.ok(archive.size > 1_000);
});

test("uses the real Python boundary and preserves the public-site safety gate", async () => {
  const [page, worker] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("public/python-worker.mjs", root), "utf8"),
  ]);
  assert.match(page, /new Worker\("\/python-worker\.mjs"/);
  assert.match(page, /AI Support Engineer \(hopefully\)/);
  assert.match(page, /no API key is stored here/i);
  assert.match(worker, /runpy\.run_path/);
  assert.match(worker, /micropip\.install\("openai-agents", reinstall=True\)/);
});

test("exposes the requested desktop interactions and direct attributions", async () => {
  const [page, css, attributions] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("public/downloads/ATTRIBUTIONS.md", root), "utf8"),
  ]);
  assert.match(page, /MovableDesktopItem/);
  assert.match(page, /onDrag=\{\(event\) => beginDrag/);
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
  assert.match(attributions, /daedalOS by Dustin Brett is a direct design and interaction reference/);
  assert.match(attributions, /CoffeeOS by jsagayap is a direct design reference/);
  assert.match(attributions, /Hyggshi OS Web Edition by HyggshiOSDeveloper was researched as a direct/);
});
