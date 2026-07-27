const PYTHON_FILES = new Set([
  "support_agent_router.py",
  "test_pure.py",
  "test_support_agent_router.py",
]);

export function tokenizeCommand(input) {
  const tokens = [];
  let token = "";
  let quote = "";
  let escaping = false;

  for (const character of input.trim()) {
    if (escaping) {
      token += character;
      escaping = false;
    } else if (character === "\\" && quote !== "'") {
      escaping = true;
    } else if (quote) {
      if (character === quote) quote = "";
      else token += character;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (/\s/.test(character)) {
      if (token) {
        tokens.push(token);
        token = "";
      }
    } else {
      token += character;
    }
  }

  if (quote) throw new Error("Close the quoted argument before running the command.");
  if (escaping) token += "\\";
  if (token) tokens.push(token);
  return tokens;
}

export function parsePythonCommand(input) {
  if (input.length > 12_000) {
    throw new Error("Command cannot exceed 12,000 characters.");
  }
  const [executable, file, ...args] = tokenizeCommand(input);
  if (!["python", "python3"].includes(executable)) {
    throw new Error("Start Python commands with python or python3.");
  }
  if (!PYTHON_FILES.has(file)) {
    throw new Error(`Choose a shipped Python file: ${[...PYTHON_FILES].join(", ")}.`);
  }
  if (args.some((argument) => argument === "--api-key" || argument.startsWith("--api-key="))) {
    throw new Error("Use the session-only key field instead of command arguments.");
  }
  return { file, args };
}
