# Multi-Issue Support Router Design

## Goal

Extend the standalone `support_agent_router.py` CLI so one customer message can
produce one or more independently routed support issues. Preserve the original
Agents SDK boundary and plain-text output while adding optional regional/account
context, manual routing overrides, and explicit feedback capture.

## Agent roles

`TriageAgent` reads the complete customer message once and returns structured,
validated issue entries. Each entry contains:

- A concise statement of what the customer appears to be reporting.
- Exactly one recommended specialist name.

The allowed specialists are:

- `RateLimitAgent`
- `LatencyAgent`
- `UsageCostAgent`
- `APIErrorAgent`
- `FeedbackAgent`
- `FallbackAgent`

`FeedbackAgent` captures explicit dissatisfaction, complaints, or product/service
feedback. Triage may produce both a technical issue and a feedback issue from the
same customer message when both are independently actionable.

## Orchestration

Use code-controlled orchestration rather than SDK handoffs:

1. Build fresh agents for each CLI invocation.
2. Invoke `TriageAgent` once for the full customer message.
3. Validate its structured output.
4. For each detected issue, select the recommended specialist automatically or
   prompt for a manual override.
5. Invoke exactly one specialist for each detected issue.
6. Render one combined plain-text result.

Specialists run sequentially to keep API usage and burst concurrency predictable.
No conversation or session state is retained between CLI calls.

The original public functions remain available: `build_agents`, `invoke_agent`,
`select_agent`, `answer_issue`, and `run_once`. `Runner.run_sync` remains confined
to `invoke_agent`.

## CLI

Automatic routing is the default:

```bash
python support_agent_router.py "Customer message with one or more issues"
```

If the positional message is omitted, the CLI prompts for it. Manual routing uses
`--manual`; pressing Enter accepts the recommended specialist, while entering an
allowed specialist name overrides it.

Optional context is loaded with:

```bash
python support_agent_router.py --context customer_context.json --manual
```

The accepted JSON fields are:

```json
{
  "region": "EMEA",
  "account_id": "acct_123",
  "account_tier": "enterprise",
  "account_status": "active",
  "request_ip": "203.0.113.10"
}
```

All fields are optional. Without a context file, routing works normally and uses
`Global / <SpecialistAgent>` as the queue.

The CLI validates JSON shape and IP syntax. It does not perform a third-party
GeoIP lookup; a supplied region is authoritative.

## Data handling

Only region, account tier, and account status are provided to agents when present.
Account ID and request IP remain local and are not included in model prompts or
printed output. The CLI does not log customer context.

## Output

The final output remains plain text:

```text
Detected issues: 2

Issue 1: Intermittent 503 responses
Queue: EMEA / APIErrorAgent
Agent flow: TriageAgent -> APIErrorAgent
Answer: ...

Issue 2: Dissatisfaction with support
Queue: EMEA / FeedbackAgent
Agent flow: TriageAgent -> FeedbackAgent
Answer: ...
```

## Failure behavior

- An unknown specialist becomes `FallbackAgent`.
- Invalid or empty structured triage output becomes one fallback issue containing
  a concise representation of the original message.
- Invalid context JSON or invalid IP syntax exits with a clear CLI error.
- Empty customer input exits with a clear CLI error.
- SDK/API failures are not silently swallowed; the CLI reports failure and exits
  nonzero.

## Verification

Deterministic checks will cover:

- Three issues detected and routed independently from one message.
- A technical issue plus explicit dissatisfaction routes to both the technical
  specialist and `FeedbackAgent`.
- A normal single-issue message.
- Manual acceptance and manual override.
- Unknown or empty triage results falling back safely.
- Missing context producing Global queues.
- Invalid context JSON and invalid IP rejection.
- Account ID and request IP staying out of prompts and output.
- `Runner.run_sync` appearing only in `invoke_agent`.
- Plain-text output shape.

After deterministic checks pass, run one live multi-issue CLI example through the
OpenAI Agents SDK.
