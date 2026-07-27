import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Support Router leads with the real Python command", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Run the Python CLI/);
  assert.match(page, /runInTerminal\("python3 support_agent_router\.py --help"\)/);
  assert.doesNotMatch(
    page.slice(page.indexOf("function SupportFolderApp"), page.indexOf("function ToolsApp")),
    /AppGlyph glyph="AI"/,
  );
});
