const PYTHON_FILES = new Set([
  "support_agent_router.py",
  "test_pure.py",
  "test_support_agent_router.py",
]);

export const TERMINAL_COMPLETIONS = [
  "help",
  "clear",
  "cls",
  "cd Desktop",
  "cd Public",
  "date",
  "time",
  "dir",
  "ls",
  "tree",
  "pwd",
  "find ",
  "echo ",
  "color blue",
  "color green",
  "color amber",
  "route ",
  "history",
  "whoami",
  "hostname",
  "ver",
  "neofetch",
  "ipconfig",
  "status",
  "manual",
  "license",
  "exit",
  "cat README.md",
  "cat MANUAL.md",
  "download all",
  "open router",
  "open terminal",
  "open files",
  "open tools",
  "open games",
  "open doom",
  "open flash",
  "open about",
  "open browser",
  "open devtools",
  "open monaco",
  "open tinymce",
  "open pdf",
  "open marked",
  "open paint",
  "open photos",
  "open opentype",
  "open video",
  "open webamp",
  "open ruffle",
  "open irc",
  "open messenger",
  "open chess",
  "open classicube",
  "open dxball",
  "open spacecadet",
  "open quake3",
  "open emulator",
  "open tic80",
  "open v86",
  "open boxedwine",
  "open stable",
  "open vim",
  "python3 support_agent_router.py",
  "python3 support_agent_router.py --help",
  "python3 support_agent_router.py --give-reply prepared",
  "python3 support_agent_router.py --give-reply auto",
  "python3 support_agent_router.py --give-reply draft",
  "python3 support_agent_router.py --give-reply revise",
  "python3 support_agent_router.py --give-reply send",
  "python test_pure.py",
  "python test_support_agent_router.py",
];

export function getTerminalCompletions(input) {
  const prefix = input.toLowerCase();
  return TERMINAL_COMPLETIONS.filter((candidate) =>
    candidate.toLowerCase().startsWith(prefix),
  );
}

export function completeTerminalInput(input) {
  const matches = getTerminalCompletions(input);
  if (matches.length < 2) return { value: matches[0] ?? input, matches };
  const commonPrefix = matches.reduce((prefix, candidate) => {
    let index = 0;
    while (
      index < prefix.length
      && index < candidate.length
      && prefix[index].toLowerCase() === candidate[index].toLowerCase()
    ) index += 1;
    return prefix.slice(0, index);
  });
  return {
    value: commonPrefix.length > input.length ? commonPrefix : input,
    matches,
  };
}

export function quoteCommandArgument(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

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
