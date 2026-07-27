# Local Pyodide runtime

These files are the browser runtime and compatible dependency wheels from the
official Pyodide `v314.0.2` distribution. Keeping the CPython WebAssembly core
and its compiled dependencies local removes the largest third-party requests
from the terminal boot path. The version-pinned OpenAI Agents SDK wheel and any
remaining pure-Python dependencies come from their canonical package host and
are cached by the workstation service worker.

Pyodide is distributed under the Mozilla Public License 2.0. The licence is
preserved in `LICENSE`.
