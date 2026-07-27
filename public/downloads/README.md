# Support Agent Router

A command-line support workflow built with the OpenAI Agents SDK. It separates
customer issue parsing, specialist routing, reply preparation, human review,
logging, and output formatting so each boundary can be tested independently.

## Install

Use Python 3.10 or newer in a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install openai-agents
export OPENAI_API_KEY="your-key"
```

## Run

Interactive mode:

```bash
python support_agent_router.py
```

One issue from the command line:

```bash
python support_agent_router.py \
  "We receive 429 errors when traffic spikes."
```

Prepare a reply without sending it:

```bash
python support_agent_router.py \
  --give-reply \
  "Requests are timing out and the customer is frustrated."
```

The workflow detects multiple issues in one customer message, asks the triage
agent to select exactly one specialist for each issue, and prepares a concise
reply. The CLI offers Draft Reply, Revise, and Send Reply. Send Reply is
intentionally unavailable until an authenticated customer messaging boundary
is connected; it fails closed and offers to save the draft.

## Test without the API

```bash
python test_pure.py
```

The pure suite exercises parsing, deterministic routing helpers, logging
formatting, and printable output without network access. The SDK boundary has
separate mocked tests:

```bash
python test_support_agent_router.py
```

## Browser workstation

The accompanying website runs these exact Python files in CPython compiled to
WebAssembly with Pyodide. The first Python command loads the runtime and the
OpenAI Agents SDK; later commands reuse it. `python test_pure.py`,
`python test_support_agent_router.py`, and CLI help run in the browser. API
requests still require `OPENAI_API_KEY` and are intentionally run locally
rather than asking for a secret on a public website.

The desktop also includes a local DOOM manual, Start menu, games, editor,
calculator, Code Lab, image viewer, local media player, permission-gated camera,
wallpaper controls, paint canvas, system monitor, and one ZIP download of the
interview artifacts. None of these tools sends customer replies or uploads
local files.

## Boundaries

- Network: `invoke_agent()` is the only Agents SDK runner boundary.
- Parsing: customer text is divided into individual issues.
- Computation: route validation and workflow decisions stay deterministic.
- Formatting: customer replies, CLI output, and logs are rendered separately.
- Delivery: no email or ticketing API is connected in this interview build.

Operational logs default to a local text file and avoid customer PII where
possible. The code comments identify the narrow integration point for an API
logger or standard-output stream.

## Documentation sources

Specialist context is restricted to official OpenAI learning material:

- [OpenAI Agents guide](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI Developer Docs](https://developers.openai.com/api/docs)
- [OpenAI Cookbook](https://developers.openai.com/cookbook)
- [OpenAI Learn](https://developers.openai.com/learn)

## Interview notes

- The function boundaries make network, parsing, computation, and formatting
  independently replaceable and testable.
- A concrete AI-generated change: broad keyword routing was tightened so an
  arbitrary mention of “slow” does not silently override an explicit 429.
- With fifteen more minutes: bounded retry/backoff for 429s, JSON Lines output,
  and per-model cost estimates from token counts.
