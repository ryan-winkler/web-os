"use client";

import { FormEvent, useState } from "react";

type Route = {
  agent: string;
  issue: string;
  action: string;
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
  },
  {
    agent: "LatencyAgent",
    pattern: /\b(slow|latency|timeout|ttft|time to first token|degraded)/i,
    action: "Measure TTFT and total request time separately, then compare streaming and model choices.",
  },
  {
    agent: "UsageCostAgent",
    pattern: /\b(token|cost|billing|cache hit|cached token|usage)/i,
    action: "Inspect response.usage and cached-token fields before comparing request shape and volume.",
  },
  {
    agent: "APIErrorAgent",
    pattern: /\b(5\d\d|5xx|failed request|platform error|api error)/i,
    action: "Capture the status, error body, SDK exception, and request ID, then retry only transient failures.",
  },
  {
    agent: "FeedbackAgent",
    pattern: /\b(frustrated|disappointed|unhappy|complaint|don'?t like|feedback)/i,
    action: "Acknowledge the experience and record a privacy-bounded feedback event for review.",
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
      }];
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

  function runDemo(event: FormEvent) {
    event.preventDefault();
    if (issue.trim()) setRoutes(routeIssue(issue));
  }

  return (
    <main>
      <div className="scanlines" aria-hidden="true" />
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
            logging, and plain-text presentation. One message can contain several
            issues; each issue reaches exactly one specialist.
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
            <div className="hud-stats">
              <div><strong>7</strong><span>AGENTS</span></div>
              <div><strong>1</strong><span>SDK BOUNDARY</span></div>
              <div><strong>13</strong><span>NO-NET TESTS</span></div>
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
              per issue and returns a concise plain-text answer.
            </p>
            <p>
              Automatic mode routes immediately. Manual mode lets an operator review the
              agent and internal owner first. Interactive mode keeps accepting independent
              messages without carrying conversation history between customers.
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
          {["Customer input", "TriageAgent", "Validated routes", "One specialist", "Plain-text answer"].map((step, index) => (
            <div className="flow-step" key={step}>
              <span>0{index + 1}</span>
              <strong>{step}</strong>
              {index < 4 && <i aria-hidden="true">→</i>}
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
            <p>Runs triage first, builds independent routes, then calls only the assigned specialists.</p>
            <code>process_customer() · run_once()</code>
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
            <p>One small function owns the SDK Runner call. A rotating JSONL file owns operational events.</p>
            <code>invoke_agent() · configure_logging()</code>
          </article>
          <article>
            <span>PRESENTATION</span>
            <h3>Printable report</h3>
            <p>Formatting is separate from routing so output remains inspectable and easy to change.</p>
            <code>format_report()</code>
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
                <button key={label} type="button" onClick={() => { setIssue(text); setRoutes([]); }}>
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
                onChange={(event) => setIssue(event.target.value)}
                rows={5}
              />
              <div className="console-controls">
                <span>{issue.length} / 10,000</span>
                <button className="button primary" type="submit">Run routing demo</button>
              </div>
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
                </>
              )}
            </div>
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

# 13 tests, 0 network
python test_pure.py`}</code></pre>
          </div>
        </div>

        <div className="downloads">
          <a href="/downloads/support_agent_router.py" download>
            <span>PY</span><strong>support_agent_router.py</strong><small>Main CLI · Agents SDK</small><i>↓</i>
          </a>
          <a href="/downloads/test_pure.py" download>
            <span>TEST</span><strong>test_pure.py</strong><small>13 tests · zero network</small><i>↓</i>
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
