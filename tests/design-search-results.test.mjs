import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("search hides the interview-files section when no files match", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const section = page.slice(page.indexOf('aria-label="Start menu"'), page.indexOf('aria-label="Desktop taskbar"'));

  assert.match(section, /\{filteredFiles\.length > 0 && \(/);
});
