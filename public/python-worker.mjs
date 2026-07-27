import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs";
import { parsePythonCommand } from "./python-command.mjs";

const INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";
const FILES = [
  "support_agent_router.py",
  "test_pure.py",
  "test_support_agent_router.py",
];

let runtimePromise;
let sessionApiKey = "";

function progress(message) {
  self.postMessage({ type: "progress", message });
}

async function bootRuntime() {
  progress("Loading CPython in WebAssembly…");
  const pyodide = await loadPyodide({ indexURL: INDEX_URL });
  progress("Loading the shipped Python dependencies…");
  await pyodide.loadPackage(["micropip", "pydantic", "pytest"]);
  await pyodide.runPythonAsync(`
import micropip
await micropip.install("openai-agents", reinstall=True)
  `);

  progress("Mounting the interview files…");
  await Promise.all(FILES.map(async (name) => {
    const response = await fetch(`/downloads/${name}`);
    if (!response.ok) throw new Error(`Could not load ${name}.`);
    pyodide.FS.writeFile(name, await response.text(), { encoding: "utf8" });
  }));
  progress("Python runtime ready.");
  return pyodide;
}

async function run(command) {
  const { file, args: parsedArgs } = parsePythonCommand(command);
  const apiBase = `${self.location.origin}/api/openai/v1`;
  const args = file === "support_agent_router.py"
    ? [...parsedArgs, "--api-key", sessionApiKey || "sk-site-proxy-not-a-secret"]
    : parsedArgs;
  runtimePromise ??= bootRuntime().catch((error) => {
    runtimePromise = undefined;
    throw error;
  });
  const pyodide = await runtimePromise;
  pyodide.globals.set("_run_spec_json", JSON.stringify({ file, args }));
  pyodide.globals.set("_openai_base_url", file === "support_agent_router.py" ? apiBase : "");
  const proxy = pyodide.runPython(`
import contextlib
import io
import json
import os
import runpy
import sys
import traceback

_spec = json.loads(_run_spec_json)
_stdout = io.StringIO()
_stderr = io.StringIO()
_exit_code = 0
_old_argv = sys.argv[:]
_old_openai_base_url = os.environ.get("OPENAI_BASE_URL")

try:
    if _openai_base_url:
        os.environ["OPENAI_BASE_URL"] = _openai_base_url
    else:
        os.environ.pop("OPENAI_BASE_URL", None)
    sys.argv = [_spec["file"], *_spec["args"]]
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
        runpy.run_path(_spec["file"], run_name="__main__")
except SystemExit as _exit:
    _exit_code = _exit.code if isinstance(_exit.code, int) else int(bool(_exit.code))
except BaseException:
    _exit_code = 1
    traceback.print_exc(file=_stderr)
finally:
    sys.argv = _old_argv
    if _old_openai_base_url is None:
        os.environ.pop("OPENAI_BASE_URL", None)
    else:
        os.environ["OPENAI_BASE_URL"] = _old_openai_base_url

{
    "stdout": _stdout.getvalue(),
    "stderr": _stderr.getvalue(),
    "exitCode": _exit_code,
}
  `);
  const result = proxy.toJs({ dict_converter: Object.fromEntries });
  proxy.destroy();
  const redact = (value) => String(value ?? "")
    .split(sessionApiKey || "\u0000").join(sessionApiKey ? "[secret redacted]" : "")
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[secret redacted]");
  return {
    ...result,
    stdout: redact(result.stdout),
    stderr: redact(result.stderr),
  };
}

self.onmessage = async ({ data }) => {
  if (data.type === "set-key") {
    sessionApiKey = String(data.apiKey ?? "");
    self.postMessage({
      type: "key-status",
      message: sessionApiKey ? "Session key loaded in isolated worker memory" : "No session key loaded",
    });
    return;
  }
  if (data.type !== "run") return;
  try {
    self.postMessage({ type: "result", ...(await run(data.command)) });
  } catch (error) {
    self.postMessage({
      type: "result",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    });
  }
};
