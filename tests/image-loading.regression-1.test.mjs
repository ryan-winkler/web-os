import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-002 — local Next images hit vinext's failing optimiser.
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27.md
test("all shipped local images bypass the vinext optimiser", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const imageTags = page.match(/<Image(?:\s|>)[\s\S]*?\/>/g) ?? [];

  assert.equal(imageTags.length, 4);
  imageTags.forEach((tag) => assert.match(tag, /\bunoptimized\b/));
});
