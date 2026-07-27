import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePythonCommand,
  tokenizeCommand,
} from "../public/python-command.mjs";

test("tokenizes quoted CLI arguments without changing their content", () => {
  assert.deepEqual(
    tokenizeCommand('python3 support_agent_router.py --give-reply prepared "429 during traffic bursts"'),
    ["python3", "support_agent_router.py", "--give-reply", "prepared", "429 during traffic bursts"],
  );
});

test("accepts each shipped Python entry point", () => {
  assert.deepEqual(parsePythonCommand("python test_pure.py"), { file: "test_pure.py", args: [] });
  assert.deepEqual(
    parsePythonCommand("python3 support_agent_router.py --help"),
    { file: "support_agent_router.py", args: ["--help"] },
  );
});

test("rejects non-Python commands and unshipped files", () => {
  assert.throws(() => parsePythonCommand("node support_agent_router.py"), /python or python3/);
  assert.throws(() => parsePythonCommand("python secrets.py"), /Choose a shipped Python file/);
  assert.throws(() => tokenizeCommand('python "unfinished'), /Close the quoted argument/);
});
