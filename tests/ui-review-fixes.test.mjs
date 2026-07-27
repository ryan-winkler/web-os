import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("review fixes preserve focus, feedback, and customer work", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.ok(page.includes('closest<HTMLElement>(".app-window")?.focus'));
  assert.match(page, /Clear the customer message and prepared draft\?/);
  assert.match(page, /Triage & give reply/);
  assert.doesNotMatch(css, /\.toast \{ display: none; \}/);
  assert.match(css, /\.primary-button,[\s\S]*?min-height: 44px/);
});
