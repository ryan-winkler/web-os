import assert from "node:assert/strict";
import test from "node:test";

import {
  completeTerminalInput,
  getTerminalCompletions,
  parsePythonCommand,
  quoteCommandArgument,
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
  assert.throws(
    () => parsePythonCommand("python support_agent_router.py --api-key sk-proj-abcdefghijklmnop"),
    /session-only key field/,
  );
  assert.throws(
    () => parsePythonCommand(`python support_agent_router.py "${"x".repeat(12_001)}"`),
    /12,000/,
  );
  assert.throws(() => tokenizeCommand('python "unfinished'), /Close the quoted argument/);
});

test("completes shipped commands and safely quotes interactive input", () => {
  assert.deepEqual(completeTerminalInput("cat READ"), {
    value: "cat README.md",
    matches: ["cat README.md"],
  });
  assert.ok(
    getTerminalCompletions("python3 support_agent_router.py --give-r")
      .every((candidate) => candidate.includes("--give-reply")),
  );
  const quoted = quoteCommandArgument('a "quoted" path\\value');
  assert.deepEqual(
    tokenizeCommand(`python3 support_agent_router.py ${quoted}`),
    ["python3", "support_agent_router.py", 'a "quoted" path\\value'],
  );
});
