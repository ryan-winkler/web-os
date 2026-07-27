# Multi-Issue Support Router Design

## Goal

Extend the standalone `support_agent_router.py` CLI so one customer message can
produce one or more independently routed support issues. Preserve the original
Agents SDK boundary and plain-text output while adding optional regional/account
context, manual routing overrides, and explicit feedback capture.

## Agent roles

`TriageAgent` preserves the original interview contract: for one issue it
returns only one of the five exact specialist names. `run_once()` invokes that
agent first and then invokes exactly one selected specialist.

`MultiIssueTriageAgent` is the optional extension. It reads a complete customer
message once and returns structured, validated issue entries. Each entry
contains:

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

`ReplyAgent` is not a routing destination. It receives only validated issue
summaries, specialist answers, and recommended next actions. It turns those into
one customer-facing subject and body after routing is complete.

## Orchestration

Use code-controlled orchestration rather than SDK handoffs:

1. Build fresh agents for each CLI invocation.
2. For the original one-shot path, invoke `TriageAgent`, validate one allowed
   name, then invoke exactly one specialist.
3. For the extended path, invoke `MultiIssueTriageAgent` once for the full
   customer message.
4. Validate its structured output.
5. For each detected issue, select the recommended specialist automatically or
   prompt for a manual override.
6. Invoke exactly one specialist for each detected issue.
7. Render one combined internal plain-text result.
8. On request, invoke `ReplyAgent` once to prepare customer-facing copy.
9. Require a person to review, revise, save, or attempt delivery.

Specialists run sequentially to keep API usage and burst concurrency predictable.
No conversation or session state is retained between CLI calls.

The original public functions remain available: `build_agents`, `invoke_agent`,
`select_agent`, `answer_issue`, and `run_once`. `Runner.run_sync` remains confined
to `invoke_agent`.

## CLI

The original one-shot route is the default:

```bash
python support_agent_router.py "Customer message with one or more issues"
```

If the positional message is omitted, the CLI enters the extended interactive
loop. `--manual` or `--give-reply` also selects the extended workflow. Manual
routing accepts the recommended specialist or an allowed override.

Prepare a customer reply automatically:

```bash
python support_agent_router.py \
  "We receive 429s and requests are slow." \
  --give-reply auto
```

Revise the first prepared draft:

```bash
python support_agent_router.py \
  "We receive 429s." \
  --give-reply revise \
  --revision "Make the next action more direct."
```

`--give-reply send` deliberately fails because no customer messaging API or
authentication is configured. The CLI then offers to save the prepared reply.
`--save-draft PATH` provides the same fallback non-interactively.

## Data handling

Customer facts are accepted only when the triage output quotes evidence from the
original message. Logs contain operational identifiers and routing metadata, not
the customer message, specialist answer, or reply body. Local logs and saved
drafts use owner-only file permissions.

## Output

The internal routing output remains plain text:

```text
Issues found: 2
Issue 1: Intermittent 503 responses
Selected agent: APIErrorAgent
Agent flow: MultiIssueTriageAgent -> APIErrorAgent
Answer: ...
Issue 2: Dissatisfaction with support
Selected agent: FeedbackAgent
Agent flow: MultiIssueTriageAgent -> FeedbackAgent
Answer: ...
```

Prepared replies are visibly marked `HUMAN REVIEW REQUIRED - NOT SENT`. The
delivery boundary never sends in this interview build.

## Failure behavior

- An unknown specialist becomes `FallbackAgent`.
- Invalid or empty structured triage output becomes one fallback issue containing
  a concise representation of the original message.
- Invalid context JSON or invalid IP syntax exits with a clear CLI error.
- Empty customer input exits with a clear CLI error.
- SDK/API failures are not silently swallowed; the CLI reports failure and exits
  nonzero.
- A Send Reply attempt reports that delivery is unavailable, offers to save the
  draft, and exits with status 5.

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
- Reply generation excludes internal agent and owner names.
- Revision passes the current draft and human instruction to `ReplyAgent`.
- Send Reply never calls a network service and offers a private local draft.
