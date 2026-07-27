# Support Agent Router case study

Interactive interview case study for `support_agent_router.py`.

## What it shows

- the interview brief and a light Domain-Driven Design boundary map
- an honest, deterministic browser routing demo with no API key or network
- customer-reply preparation with revise, save, and fail-closed send controls
- installation instructions and exact source/test downloads
- approved OpenAI Developer Docs, Cookbook, and Learn references

The browser demo mirrors the specialist category allowlist; it does not execute
Python, call an LLM, or send a customer message. Download the CLI to run the
actual OpenAI Agents SDK flow. Both versions mark drafts for human review, and
Send Reply remains unavailable until an authenticated messaging API is added.

## Local development

```bash
npm install
npm run dev
npm test
```

Node.js 22.13 or newer is required.
