import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-004 — bare router commands called input() in Pyodide without stdin.
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27.md
test("bare router commands use browser prompts before invoking the real script", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /\^python3\?\\s\+support_agent_router/);
  assert.match(page, /setBrowserPrompt\("customer-id"\)/);
  assert.match(page, /setBrowserPrompt\("issue"\)/);
  assert.match(page, /--give-reply prepared/);
  assert.match(page, /event\.key === "Tab"/);
});
