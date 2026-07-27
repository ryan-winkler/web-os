import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-003 — Clear discarded a drawing without confirmation.
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27.md
test("paint confirms before clearing non-empty work", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const paint = page.slice(page.indexOf("function PaintApp"), page.indexOf("function NoughtsAndCrosses"));

  assert.match(paint, /setHasDrawing\(true\)/);
  assert.match(paint, /hasDrawing && !window\.confirm\("Clear this drawing\?"\)/);
  assert.match(paint, /setHasDrawing\(false\)/);
});
