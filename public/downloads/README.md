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

`OPENAI_API_KEY` is the safer option. `--api-key` is also available for a
single process, but command-line arguments can appear in shell history and
process listings:

```bash
python support_agent_router.py \
  --api-key "sk-…" \
  "We receive 429 errors when traffic spikes."
```

The key is configured in memory with Agents SDK tracing disabled. It is never
written to the local support log.

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

That original one-shot path invokes `TriageAgent`, then exactly one specialist,
and prints only the selected agent, agent flow, answer, and recommended next
action. Invalid triage output routes to `FallbackAgent`.

Prepare a reply without sending it:

```bash
python support_agent_router.py \
  --give-reply \
  "Requests are timing out and the customer is frustrated."
```

The extended workflow detects multiple issues in one customer message, uses
`MultiIssueTriageAgent` to select exactly one specialist for each issue, and
prepares a concise reply. The CLI offers Draft Reply, Revise, and Send Reply.
Send Reply is
intentionally unavailable until an authenticated customer messaging boundary
is connected; it fails closed and offers to save the draft.

## Test without the API

```bash
python test_pure.py
```

The pure suite exercises parsing, deterministic routing helpers, logging
formatting, security boundaries, and printable output without network access.
It currently runs 22 tests. The SDK boundary has separate mocked tests:

```bash
python test_support_agent_router.py
```

## Browser workstation

The accompanying website runs these exact Python files in CPython compiled to
WebAssembly with Pyodide. The shell appears immediately while the pinned
runtime and OpenAI Agents SDK warm in a worker; later commands reuse it.
`python test_pure.py`,
`python test_support_agent_router.py`, and CLI help run in the browser. The
bare `python3 support_agent_router.py` command uses browser-native customer
prompts before invoking the real one-shot script, because a Web Worker has no
interactive stdin. Press Tab to complete commands, filenames, apps, and reply
modes.

Hosted agent runs use a server-side OpenAI key with a lifetime €30 application
cap, a fixed `gpt-4.1-mini` model, bounded output, no tools, and anonymous
per-IP throttling. The key is stored as a hosting secret and never enters the
browser or repository. A visitor may instead load their own key into the
isolated Web Worker for the current tab and explicitly discard it. A personal
key is sent over TLS only for that visitor's OpenAI request through the
same-origin proxy; it is not placed in React state, terminal history, browser
storage, logs, or downloads. For local use, `OPENAI_API_KEY` remains the safest
path. See OpenAI's
[API-key guidance](https://developers.openai.com/api/docs/guides/production-best-practices#api-keys)
and [current pricing](https://developers.openai.com/api/docs/pricing).
The single SDK boundary uses `Runner.run_sync` locally and the async runner
through Pyodide's supported stack-switching bridge in the browser.

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

Customer messages are capped at 10,000 characters. Every agent receives the
payload inside an `untrusted_customer_content` envelope, has no tools or
handoffs, is limited to one model turn, and has a capped output size. Key-like
values are removed from customer input before model invocation and from model
text before display. These controls prevent customer text from gaining network
or send authority; prepared replies still require human review.

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
