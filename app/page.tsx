"use client";

import { FormEvent, useState } from "react";

type Route = {
  agent: string;
  issue: string;
  action: string;
  customerReply: string;
};

const samples = [
  ["429", "Our burst traffic is getting HTTP 429 responses."],
  ["Latency", "Time to first token is slow and requests time out."],
  ["Usage", "Token usage and cost jumped; are cache hits working?"],
  ["5xx", "Requests fail with 503 responses and request ID req_ABCdef12."],
  ["Mixed", "We get 429s, requests are slow, and I am frustrated."],
  ["Unclear", "Something is not right with our integration."],
];

const routingRules = [
  {
    agent: "RateLimitAgent",
    pattern: /\b(429|rate limit|quota|burst|concurren)/i,
    action: "Inspect the 429 response and headers, then add bounded exponential backoff with jitter.",
    customerReply: "Please add bounded exponential backoff with jitter and check the rate-limit headers before retrying.",
  },
  {
    agent: "LatencyAgent",
    pattern: /\b(slow|latency|timeout|ttft|time to first token|degraded)/i,
    action: "Measure TTFT and total request time separately, then compare streaming and model choices.",
    customerReply: "Please measure time to first token and total request time separately, then compare a streamed request.",
  },
  {
    agent: "UsageCostAgent",
    pattern: /\b(token|cost|billing|cache hit|cached token|usage)/i,
    action: "Inspect response.usage and cached-token fields before comparing request shape and volume.",
    customerReply: "Please check response.usage and the cached-token fields before comparing request shape and volume.",
  },
  {
    agent: "APIErrorAgent",
    pattern: /\b(5\d\d|5xx|failed request|platform error|api error)/i,
    action: "Capture the status, error body, SDK exception, and request ID, then retry only transient failures.",
    customerReply: "Please retain the status, error body, SDK exception, and request ID, and retry only if the failure is transient.",
  },
  {
    agent: "FeedbackAgent",
    pattern: /\b(frustrated|disappointed|unhappy|complaint|don'?t like|feedback)/i,
    action: "Acknowledge the experience and record a privacy-bounded feedback event for review.",
    customerReply: "Thank you for being direct about the experience. Your feedback should be reviewed alongside the technical issue.",
  },
];

function routeIssue(input: string): Route[] {
  const routes = routingRules
    .filter(({ pattern }) => pattern.test(input))
    .map(({ agent, action }) => ({ agent, action, issue: input.trim() }));

  return routes.length
    ? routes
    : [{
        agent: "FallbackAgent",
        issue: input.trim(),
        action: "Ask for the HTTP status, error text, request ID, timing, and a minimal reproduction.",
        customerReply: "Please share the HTTP status, error text, request ID, timing, and a minimal reproduction so the issue can be narrowed down.",
      }];
}

function prepareReply(routes: Route[]): string {
  const actions = routes
    .map((route, index) => `${index + 1}. ${route.customerReply}`)
    .join("\n");
  return `Subject: Follow-up on your OpenAI API support request

Hello,

Thanks for explaining what happened. I understand there ${routes.length === 1 ? "is one issue" : `are ${routes.length} issues`} to work through.

${actions}

This draft has been prepared for a support person to review before it is sent.

Best,
Support`;
}

const sourceLinks = [
  ["Agents SDK orchestration", "https://developers.openai.com/api/docs/guides/agents/orchestration"],
  ["Rate limits", "https://developers.openai.com/api/docs/guides/rate-limits"],
  ["Latency optimisation", "https://developers.openai.com/api/docs/guides/latency-optimization"],
  ["Cost optimisation", "https://developers.openai.com/api/docs/guides/cost-optimization"],
  ["Error codes", "https://developers.openai.com/api/docs/guides/error-codes"],
  ["OpenAI Cookbook", "https://developers.openai.com/cookbook"],
];

export default function Home() {
  const [issue, setIssue] = useState(samples[4][1]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [reply, setReply] = useState("");
  const [autoReply, setAutoReply] = useState(false);
  const [sendBlocked, setSendBlocked] = useState(false);

  function runDemo(event: FormEvent) {
    event.preventDefault();
    if (!issue.trim()) return;
    const nextRoutes = routeIssue(issue);
    setRoutes(nextRoutes);
    setReply(autoReply ? prepareReply(nextRoutes) : "");
    setSendBlocked(false);
  }

  function saveDraft() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`${reply}\n`], { type: "text/plain" }));
    link.download = "support-agent-reply.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main>
      <div className="scanlines" aria-hidden="true" />
      <a className="skip-link" href="#console">Skip to routing console</a>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href="#top">SAR<span>{"//"}</span>01</a>
        <div className="navlinks">
          <a href="#brief">Brief</a>
          <a href="#architecture">Boundaries</a>
          <a href="#console">Console</a>
          <a href="#install">Install</a>
        </div>
        <a className="nav-download" href="/downloads/support_agent_router.py" download>
          Download .py
        </a>
      </nav>

      <section className="hero circuit" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>LIVE BUILD</span> OPENAI AGENTS SDK</p>
          <h1 data-text="SUPPORT AGENT ROUTER">
            SUPPORT AGENT<br /><em>ROUTER</em>
          </h1>
          <p className="lede">
            A compact Python CLI that separates triage, domain routing, SDK calls,
            logging, and reply preparation. One message can contain several issues;
            each reaches one specialist before ReplyAgent prepares human-reviewed copy.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#console">Run browser demo</a>
            <a className="button secondary" href="#architecture">Read the design</a>
          </div>
          <p className="microcopy">No history across runs · privacy-bounded logs · official OpenAI sources only</p>
        </div>

        <aside className="terminal hero-terminal" aria-label="Router status">
          <div className="terminal-bar">
            <span>router.status</span>
            <span className="live">● READY</span>
          </div>
          <div className="terminal-body">
            <p><b>$</b> python support_agent_router.py</p>
            <p className="muted">Support Agent Router. Type &apos;quit&apos; to exit.</p>
            <p><span className="cyan">triage</span> incoming customer message</p>
            <p><span className="green">split</span> 3 distinct issues</p>
            <p><span className="magenta">route</span> RateLimitAgent</p>
            <p><span className="magenta">route</span> LatencyAgent</p>
            <p><span className="magenta">route</span> FeedbackAgent</p>
            <p><span className="cyan">draft</span> ReplyAgent → human review</p>
            <div className="hud-stats">
              <div><strong>8</strong><span>AGENTS</span></div>
              <div><strong>1</strong><span>SDK BOUNDARY</span></div>
              <div><strong>18</strong><span>NO-NET TESTS</span></div>
            </div>
          </div>
        </aside>
      </section>

      <section className="section brief" id="brief">
        <div className="section-label">01 // THE BRIEF</div>
        <div className="brief-grid">
          <h2>One customer message.<br />Several support issues.<br /><span>Clean ownership.</span></h2>
          <div className="brief-copy">
            <p className="question">
              Build an OpenAI Agents SDK support router that invokes TriageAgent first,
              splits multi-issue messages, then invokes exactly one approved specialist
              per issue and prepares a concise customer reply.
            </p>
            <p>
              Automatic mode routes immediately. Manual mode lets an operator review the
              agent and internal owner first. ReplyAgent drafts the response, but a person
              must review it. Send Reply is intentionally blocked without API authentication.
            </p>
          </div>
        </div>
      </section>

      <section className="section architecture circuit" id="architecture">
        <div className="section-label">02 // LIGHT DDD</div>
        <div className="section-head">
          <h2>BOUNDARIES THAT<br /><span>EXPLAIN THEMSELVES</span></h2>
          <p>
            The implementation stays in one interview-sized module, but its functions
            still have explicit jobs. That keeps the SDK replaceable and the core logic
            testable without a network.
          </p>
        </div>

        <div className="flow" aria-label="Routing flow">
          {["Customer input", "TriageAgent", "Validated routes", "One specialist", "ReplyAgent", "Human review", "Save or send"].map((step, index, steps) => (
            <div className="flow-step" key={step}>
              <span>0{index + 1}</span>
              <strong>{step}</strong>
              {index < steps.length - 1 && <i aria-hidden="true">→</i>}
            </div>
          ))}
        </div>

        <div className="boundary-list">
          <article>
            <span>INTERFACE</span>
            <h3>CLI + input</h3>
            <p>Argparse, interactive prompts, manual review, and input limits live at the edge.</p>
            <code>main() · interactive_loop()</code>
          </article>
          <article>
            <span>APPLICATION</span>
            <h3>Orchestration</h3>
            <p>Runs triage, assigned specialists, and the optional reply draft in a fixed order.</p>
            <code>process_customer() · draft_reply()</code>
          </article>
          <article>
            <span>DOMAIN</span>
            <h3>Rules + allowlists</h3>
            <p>Agent names, owners, issue bounds, validated outputs, and approved sources are plain data.</p>
            <code>build_routes() · parse_*()</code>
          </article>
          <article>
            <span>INFRASTRUCTURE</span>
            <h3>External effects</h3>
            <p>One function owns SDK calls. Logging is local; delivery fails closed until API and auth exist.</p>
            <code>invoke_agent() · send_reply()</code>
          </article>
          <article>
            <span>PRESENTATION</span>
            <h3>Report + reply</h3>
            <p>Internal routing details stay separate from the customer-facing subject and body.</p>
            <code>format_report() · format_reply()</code>
          </article>
        </div>
      </section>

      <section className="section console-section" id="console">
        <div className="section-label">03 // ROUTING CONSOLE</div>
        <div className="console-grid">
          <div>
            <h2>TRY THE<br /><span>ROUTER</span></h2>
            <p>
              This zero-network browser demo mirrors the category allowlist. The
              downloadable Python CLI uses TriageAgent and the OpenAI Agents SDK.
            </p>
            <div className="sample-list" aria-label="Example issues">
              {samples.map(([label, text]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={issue === text}
                  onClick={() => { setIssue(text); setRoutes([]); setReply(""); setSendBlocked(false); }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form className="terminal console" onSubmit={runDemo}>
            <div className="terminal-bar">
              <span>browser_demo.py</span>
              <span className="live">● LOCAL / NO API</span>
            </div>
            <div className="console-input">
              <label htmlFor="issue">CUSTOMER MESSAGE</label>
              <textarea
                id="issue"
                value={issue}
                maxLength={10000}
                required
                onChange={(event) => setIssue(event.target.value)}
                rows={5}
              />
              <div className="console-controls">
                <span>{issue.length} / 10,000</span>
                <button className="button primary" type="submit">Run routing demo</button>
              </div>
              <label className="auto-reply">
                <input
                  type="checkbox"
                  checked={autoReply}
                  onChange={(event) => setAutoReply(event.target.checked)}
                />
                Auto-prepare reply after routing — review still required
              </label>
            </div>
            <div className="console-output" aria-live="polite">
              {routes.length === 0 ? (
                <p className="muted">$ awaiting input_</p>
              ) : (
                <>
                  <p><span className="green">triage</span> {routes.length} issue{routes.length === 1 ? "" : "s"} found</p>
                  {routes.map((route, index) => (
                    <div className="route-output" key={route.agent}>
                      <p><span className="cyan">Issue {index + 1}</span> {route.issue}</p>
                      <p>Selected agent: <b className="magenta">{route.agent}</b></p>
                      <p>Agent flow: TriageAgent → {route.agent}</p>
                      <p>Next action: {route.action}</p>
                    </div>
                  ))}
                  <button
                    className="button secondary give-reply"
                    type="button"
                    onClick={() => { setReply(prepareReply(routes)); setSendBlocked(false); }}
                  >
                    Give reply
                  </button>
                </>
              )}
            </div>
            {reply && (
              <div className="reply-review">
                <div className="reply-state">HUMAN REVIEW REQUIRED · NOT SENT</div>
                <label htmlFor="prepared-reply">PREPARED CUSTOMER REPLY</label>
                <textarea
                  id="prepared-reply"
                  value={reply}
                  onChange={(event) => { setReply(event.target.value); setSendBlocked(false); }}
                  rows={14}
                />
                <div className="reply-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => document.getElementById("prepared-reply")?.focus()}
                  >
                    Revise
                  </button>
                  <button className="button secondary" type="button" onClick={saveDraft}>
                    Save Draft
                  </button>
                  <button className="button send" type="button" onClick={() => setSendBlocked(true)}>
                    Send Reply
                  </button>
                </div>
                {sendBlocked && (
                  <div className="send-blocked" role="alert">
                    <strong>Send Reply is unavailable.</strong>
                    <p>No customer messaging API or authentication is connected. Save the reviewed draft instead.</p>
                    <button className="button primary" type="button" onClick={saveDraft}>Save Draft</button>
                    <button className="button secondary" type="button" onClick={() => setSendBlocked(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="section install circuit" id="install">
        <div className="section-label">04 // INSTALL + SOURCE</div>
        <div className="install-grid">
          <div>
            <h2>RUN THE<br /><span>REAL CLI</span></h2>
            <ol>
              <li>Download the Python source and tests.</li>
              <li>Create a virtual environment.</li>
              <li>Install the Agents SDK and Pydantic.</li>
              <li>Set your API key, then run interactive or one-shot mode.</li>
              <li>Use Give reply to draft, revise, or test the fail-closed send path.</li>
            </ol>
            <p className="note">
              Python 3.10+ recommended. API keys stay in your environment; they are
              never accepted by this website or written to the local event log.
            </p>
          </div>
          <div className="terminal code-terminal">
            <div className="terminal-bar"><span>install.sh</span><span>PYTHON 3.10+</span></div>
            <pre><code>{`python -m venv .venv
source .venv/bin/activate
pip install openai-agents pydantic

export OPENAI_API_KEY="your-key"
python support_agent_router.py

# one-shot, manual review
python support_agent_router.py --manual \\
  "429s and slow responses"

# prepare a reply automatically; it is not sent
python support_agent_router.py \\
  "429s and slow responses" --give-reply auto

# demonstrate blocked delivery, then offer to save
python support_agent_router.py \\
  "Requests fail with 503" --give-reply send

# 18 tests, 0 network
python test_pure.py`}</code></pre>
          </div>
        </div>

        <div className="downloads">
          <a href="/downloads/support_agent_router.py" download>
            <span>PY</span><strong>support_agent_router.py</strong><small>Main CLI · Agents SDK</small><i>↓</i>
          </a>
          <a href="/downloads/test_pure.py" download>
            <span>TEST</span><strong>test_pure.py</strong><small>18 tests · zero network</small><i>↓</i>
          </a>
          <a href="/downloads/test_support_agent_router.py" download>
            <span>TEST</span><strong>test_support_agent_router.py</strong><small>Core interview tests</small><i>↓</i>
          </a>
          <a href="/downloads/2026-07-27-multi-issue-support-router-design.md" download>
            <span>DOC</span><strong>design-spec.md</strong><small>Decisions + boundaries</small><i>↓</i>
          </a>
        </div>
      </section>

      <section className="section sources">
        <div className="section-label">05 // CONTEXT GRAPH</div>
        <div className="sources-grid">
          <div>
            <h2>CONTEXT, NOT<br /><span>GUESSWORK</span></h2>
            <p>
              Every agent receives a small, domain-specific knowledge map: what to
              inspect and which learning resources to return. Links are allowlisted
              to OpenAI Developer Docs, Cookbook, and Learn.
            </p>
          </div>
          <div className="source-links">
            {sourceLinks.map(([title, href], index) => (
              <a href={href} key={href} target="_blank" rel="noreferrer">
                <span>0{index + 1}</span><strong>{title}</strong><i>↗</i>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div>
          <p className="eyebrow">BUILT FOR THE INTERVIEW</p>
          <h2>Thank you to OpenAI<br />for the opportunity.</h2>
        </div>
        <div className="footer-links">
          <a href="https://ryanw.eu" target="_blank" rel="noreferrer">ryanw.eu ↗</a>
          <a href="https://github.com/ryan-winkler" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="#top">Back to top ↑</a>
        </div>
        <p className="copyright">RYAN WINKLER · SUPPORT AGENT ROUTER · 2026</p>
      </footer>
    </main>
  );
}
