# Ryan Winkler support workstation

A browser desktop for Ryan's support-agent interview project, with its process
registry, Start/Search interaction model, and preload strategy adapted from
the MIT-licensed daedalOS design.

## What it shows

- a polished windowed desktop with Start, taskbar, app finder, files, and local console
- the complete daedalOS user-facing app inventory, including Monaco, TinyMCE,
  PDF, media tools, emulators, and games; large third-party apps run in
  sandboxed attributed frames instead of duplicating their licensed assets
- an opening three-window composition with DOOM, the running CLI mirror, and `PROCESS.md`
- deterministic multi-issue triage and specialist routing through the exact Python files
- editable customer-reply preparation with revise, save, and fail-closed send controls
- incident timer, request-ID extraction, retry backoff, and HTTP status guidance
- Ryan's profile, selected work, public field notes, and exact interview downloads
- a Flash Files folder with the externally hosted Badger animation and a downloadable attribution record
- an in-product review against Nielsen's ten usability heuristics

The implementation is tailored to this interview and retains direct source and
licence attribution for the web-desktop patterns and third-party runtimes it
adapts. The Terminal shell renders immediately while a self-hosted Pyodide and
the Agents SDK warm in a persistent worker. DOOM and the Python runtime are
versioned in the service-worker cache. Hosted agent runs use a server-side
key behind a lifetime €30 application cap, fixed model and output limits,
per-IP throttling, and a no-tools policy. A visitor can instead use a personal
key held in isolated worker memory for the current tab and sent over TLS only
for that visitor's OpenAI request. Drafts remain subject to human review, and
Send Reply is unavailable until an authenticated messaging API is connected.
The token ledger applies a conservative USD-to-EUR buffer; it is an application
guardrail rather than an OpenAI account-level billing limit.
The single SDK boundary uses `Runner.run_sync` locally and the async runner
through Pyodide's supported stack-switching bridge in the browser.
Running `python3 support_agent_router.py` opens browser-native customer
prompts; press Tab to complete commands, filenames, apps, and reply modes.
The final design audit keeps informational text at 11px or larger and gives
terminal inputs and API-access controls a 44px minimum target.

## Local development

```bash
npm install
npm run dev
npm test
```

Node.js 22.13 or newer is required.
