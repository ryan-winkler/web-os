import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-001 — the two-word phrase “time out” routed to UsageCostAgent.
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27.md
test("latency routing recognises the common two-word time-out form", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const latencyBranch = page.slice(page.indexOf("if (/latency"), page.indexOf("if (/token"));

  assert.match(latencyBranch, /time\.\?out/);
  assert.match(latencyBranch, /route: "LatencyAgent"/);
});
