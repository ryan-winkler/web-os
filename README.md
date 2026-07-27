# Ryan Winkler support workstation

An original browser desktop for Ryan's support-agent interview project.

## What it shows

- a polished windowed desktop with Start, taskbar, app finder, files, and local console
- an opening three-window composition with DOOM, the running CLI mirror, and `PROCESS.md`
- deterministic multi-issue triage and specialist routing through the exact Python files
- editable customer-reply preparation with revise, save, and fail-closed send controls
- incident timer, request-ID extraction, retry backoff, and HTTP status guidance
- Ryan's profile, selected work, public field notes, and exact interview downloads
- a Flash Files folder with the externally hosted Badger animation and a downloadable attribution record
- an in-product review against Nielsen's ten usability heuristics

The website is an original implementation. It does not copy code from the
web-desktop references used for visual research. Its Command Prompt runs the
shipped files in CPython through Pyodide. Hosted agent runs use a server-side
key behind a lifetime €30 application cap, fixed model and output limits,
per-IP throttling, and a no-tools policy. A visitor can instead use a personal
key held in isolated worker memory for the current tab and sent over TLS only
for that visitor's OpenAI request. Drafts remain subject to human review, and
Send Reply is unavailable until an authenticated messaging API is connected.
The single SDK boundary uses `Runner.run_sync` locally and the async runner
through Pyodide's supported stack-switching bridge in the browser.
Running `python3 support_agent_router.py` opens browser-native customer
prompts; press Tab to complete commands, filenames, apps, and reply modes.

## Local development

```bash
npm install
npm run dev
npm test
```

Node.js 22.13 or newer is required.
