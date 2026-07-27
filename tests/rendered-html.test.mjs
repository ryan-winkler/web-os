import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the finished case study", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Support Agent Router — OpenAI Agents SDK<\/title>/i);
  assert.match(html, /SUPPORT AGENT/);
  assert.match(html, /Run routing demo/);
  assert.match(html, /ReplyAgent/);
  assert.match(html, /Send Reply is intentionally blocked/);
  assert.match(html, /Thank you to OpenAI/);
  assert.match(html, /support_agent_router\.py/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps customer reply copy on every routed issue", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /\.map\(\(\{ agent, action, customerReply \}\) => \(\{ agent, action, customerReply, issue:/,
  );
});

test("ships the exact downloadable source files", async () => {
  const pairs = [
    ["support_agent_router.py", "../../support_agent_router.py"],
    ["test_pure.py", "../../test_pure.py"],
    ["test_support_agent_router.py", "../../test_support_agent_router.py"],
  ];
  for (const [download, source] of pairs) {
    const [published, original] = await Promise.all([
      readFile(new URL(`../public/downloads/${download}`, import.meta.url), "utf8"),
      readFile(new URL(source, import.meta.url), "utf8"),
    ]);
    assert.equal(published, original);
  }
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  assert.equal(new URL(".", root).pathname.endsWith("/site/"), true);
});
