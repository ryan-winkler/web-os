import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Start and Search are separate indexed surfaces", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const \[startOpen, setStartOpen\] = useState\(false\)/);
  assert.match(page, /const \[searchOpen, setSearchOpen\] = useState\(false\)/);
  assert.match(page, /aria-label="Start menu"/);
  assert.match(page, /aria-label="Search"/);
  assert.match(page, /"All", "Apps", "Files", "Commands"/);
  assert.match(page, /filteredApps\.map/);
  assert.match(page, /filteredFiles\.map/);
  assert.match(page, /filteredCommands\.map/);
});
