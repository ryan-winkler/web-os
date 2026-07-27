# Ryan Winkler support workstation

An original browser desktop for Ryan's support-agent interview project.

## What it shows

- a polished windowed desktop with Start, taskbar, app finder, files, and local console
- an opening three-window composition with DOOM, the running CLI mirror, and `PROCESS.md`
- deterministic multi-issue triage and specialist routing with no browser-side API key
- editable customer-reply preparation with revise, save, and fail-closed send controls
- incident timer, request-ID extraction, retry backoff, and HTTP status guidance
- Ryan's profile, selected work, public field notes, and exact interview downloads
- a Flash Files folder with the externally hosted Badger animation and a downloadable attribution record
- an in-product review against Nielsen's ten usability heuristics

The website is an original implementation. It does not copy code from the
web-desktop references used for visual research. The browser demo does not
execute Python, call an LLM, or send a customer message. Download the CLI to
run the OpenAI Agents SDK flow. Drafts remain subject to human review, and Send
Reply is unavailable until an authenticated messaging API is connected.

## Local development

```bash
npm install
npm run dev
npm test
```

Node.js 22.13 or newer is required.
