import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("smaller screens start on the desktop instead of an unsupported game window", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /window\.innerWidth <= 1050/);
  assert.match(page, /current\[id\]\.open \? \{ \.\.\.current\[id\], minimized: true \}/);
  assert.match(page, /setDesktopRevealed\(true\)/);
});
