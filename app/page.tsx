"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type AppId = "doom" | "flash" | "router" | "tools" | "files" | "terminal" | "about" | "work" | "notes" | "help";
type RouteName =
  | "RateLimitAgent"
  | "LatencyAgent"
  | "UsageCostAgent"
  | "APIErrorAgent"
  | "FeedbackAgent"
  | "FallbackAgent";

type WindowState = {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type RouteResult = {
  summary: string;
  route: RouteName;
  reply: string;
  action: string;
};

const APPS: Record<AppId, { title: string; glyph: string; description: string }> = {
  doom: { title: "DOOM — js-dos", glyph: "D00M", description: "The classic desktop break, embedded from the requested js-dos build" },
  flash: { title: "Flash Files", glyph: "SWF", description: "Badger Badger Badger and third-party attributions" },
  router: { title: "Support Workbench", glyph: "AI", description: "Router, operational tools, console, and help" },
  tools: { title: "Support Tools", glyph: "SLA", description: "Timers, request IDs, backoff, and status codes" },
  files: { title: "Documentation", glyph: "DIR", description: "Source, tests, README, and design notes" },
  terminal: { title: "support_agent_router.py — CLI", glyph: ">_", description: "Browser-safe command-line mirror of the Python workflow" },
  about: { title: "https://ryanw.eu", glyph: "WEB", description: "Profile, selected work, and field notes" },
  work: { title: "Selected Work", glyph: "LAB", description: "Current systems and public projects" },
  notes: { title: "PROCESS.md", glyph: "MD", description: "Decisions, boundaries, and interview notes" },
  help: { title: "Help & UX Review", glyph: "?", description: "Shortcuts, safeguards, and Nielsen review" },
};

const FILES = [
  {
    name: "support_agent_router.py",
    glyph: "PY",
    href: "/downloads/support_agent_router.py",
    description: "OpenAI Agents SDK CLI with multi-issue triage and draft-reply workflow.",
  },
  {
    name: "test_pure.py",
    glyph: "TST",
    href: "/downloads/test_pure.py",
    description: "Fast, deterministic checks for parsing, routing, and formatting without network access.",
  },
  {
    name: "test_support_agent_router.py",
    glyph: "TST",
    href: "/downloads/test_support_agent_router.py",
    description: "Boundary tests for the Agents SDK integration.",
  },
  {
    name: "router-design.md",
    glyph: "MD",
    href: "/downloads/2026-07-27-multi-issue-support-router-design.md",
    description: "The bounded-context design and interview decisions.",
  },
  {
    name: "README.md",
    glyph: "MD",
    href: "/downloads/README.md",
    description: "Install, run, test, and review the support-agent router.",
  },
] as const;

const STATUS_CODES = [
  ["400", "Bad request", "Validate the request shape before retrying."],
  ["401", "Unauthorised", "Check the API key and project access."],
  ["403", "Forbidden", "Confirm model, project, and organisation permissions."],
  ["408", "Request timeout", "Retry only when the operation is safe to repeat."],
  ["429", "Rate limited", "Use exponential backoff, jitter, and concurrency limits."],
  ["500", "Server error", "Capture the request ID and retry with backoff."],
  ["503", "Unavailable", "Check status, preserve request IDs, and degrade safely."],
] as const;

const INITIAL_WINDOWS: Record<AppId, WindowState> = {
  doom: { open: true, minimized: false, maximized: false, x: 405, y: 58, width: 690, height: 565, z: 6 },
  flash: { open: false, minimized: false, maximized: false, x: 255, y: 96, width: 720, height: 570, z: 2 },
  router: { open: false, minimized: false, maximized: false, x: 120, y: 76, width: 760, height: 650, z: 2 },
  tools: { open: false, minimized: false, maximized: false, x: 410, y: 92, width: 690, height: 600, z: 2 },
  files: { open: false, minimized: false, maximized: false, x: 170, y: 104, width: 720, height: 560, z: 2 },
  terminal: { open: true, minimized: false, maximized: false, x: 225, y: 186, width: 760, height: 520, z: 4 },
  about: { open: false, minimized: false, maximized: false, x: 190, y: 66, width: 760, height: 610, z: 3 },
  work: { open: false, minimized: false, maximized: false, x: 330, y: 82, width: 740, height: 590, z: 2 },
  notes: { open: true, minimized: false, maximized: false, x: 1050, y: 105, width: 365, height: 665, z: 5 },
  help: { open: false, minimized: false, maximized: false, x: 380, y: 112, width: 690, height: 570, z: 2 },
};

const DEFAULT_ISSUE =
  "We are seeing intermittent 429s during traffic bursts and customers are waiting too long for a response.";
const PUBLIC_APPS: AppId[] = ["doom", "flash", "router", "tools", "files", "terminal", "about", "help"];

function routeIssue(issue: string): RouteResult {
  const text = issue.toLowerCase();
  const firstSentence = issue.trim().split(/(?<=[.!?])\s+/)[0] || "The customer needs support.";
  const summary = firstSentence.length > 150 ? `${firstSentence.slice(0, 147)}…` : firstSentence;

  if (/\b429\b|rate.?limit|quota|burst|too many requests|retry.after/.test(text)) {
    return {
      route: "RateLimitAgent",
      summary,
      action: "Capture request IDs, respect retry headers, and reduce burst concurrency.",
      reply:
        "Thanks for flagging this. I can see the requests are being rate limited during bursts. Please share a recent request ID and timestamp if available. In the meantime, respect retry headers and use exponential backoff with jitter while reducing concurrent requests. We can then distinguish a transient burst from a quota constraint.",
    };
  }
  if (/latency|slow|timeout|time.?to.?first|ttft|degraded|taking too long/.test(text)) {
    return {
      route: "LatencyAgent",
      summary,
      action: "Compare end-to-end latency with TTFT and capture a request ID plus region.",
      reply:
        "Thanks for the detail. The request appears to be completing more slowly than expected. Please capture one recent request ID, its timestamp, region, model, and whether the delay is before the first token or across the full response. That will help separate connection, queue, and generation time.",
    };
  }
  if (/token|cost|billing|spend|cache.?hit|cached|usage/.test(text)) {
    return {
      route: "UsageCostAgent",
      summary,
      action: "Compare token counts, cached tokens, model, and request volume for the affected window.",
      reply:
        "Thanks for raising the usage change. Please compare the model, input and output token counts, cached-token fields, and request volume for the affected period. A small prompt or model change can alter both cache hits and total usage. Those details should show whether the increase comes from traffic, longer context, or reduced caching.",
    };
  }
  if (/\b5\d\d\b|server error|platform.?side|failed request|internal error|bad gateway/.test(text)) {
    return {
      route: "APIErrorAgent",
      summary,
      action: "Preserve request IDs and timestamps, check status, then retry safe requests with backoff.",
      reply:
        "I’m sorry these requests failed. Please preserve the request IDs, UTC timestamps, model, and endpoint for two recent examples. Check the OpenAI status page and retry only safe, repeatable requests with bounded backoff. Those details will make a platform-side investigation much faster.",
    };
  }
  if (/feedback|unhappy|frustrat|disappoint|do not like|don't like|complaint/.test(text)) {
    return {
      route: "FeedbackAgent",
      summary,
      action: "Acknowledge the impact, record the feedback verbatim, and confirm the follow-up owner.",
      reply:
        "Thank you for being direct about this. I’m sorry the experience has been frustrating. I’ve captured the concern as product feedback and would like to make sure the impact is understood correctly. If you can share the outcome you expected, we can record that alongside the issue and confirm the right follow-up.",
    };
  }
  return {
    route: "FallbackAgent",
    summary,
    action: "Ask for the endpoint, timestamp, request ID, expected result, and actual result.",
    reply:
      "Thanks for getting in touch. I want to make sure we investigate the right problem. Could you share the endpoint and model, a recent UTC timestamp and request ID, what you expected to happen, and what happened instead? Please remove any secrets or personal data before sending logs.",
  };
}

function splitIssues(input: string): string[] {
  const blocks = input
    .split(/\n\s*(?:[-*]\s+|\d+[.)]\s+)?|\s+(?=(?:also|additionally|separately|another issue)\b)/i)
    .map((item) => item.trim())
    .filter(Boolean);
  return blocks.length > 1 ? blocks : [input.trim()];
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, "0")).join(":");
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Desktop() {
  const [windows, setWindows] = useState(INITIAL_WINDOWS);
  const [startOpen, setStartOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [launcherQuery, setLauncherQuery] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [toast, setToast] = useState("Ryan's support workstation is ready.");
  const [routedCount, setRoutedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const zRef = useRef(6);
  const launcherRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setNow(new Date());
      setRoutedCount(Number(localStorage.getItem("rw-routed-count") || 0));
      setDraftCount(Number(localStorage.getItem("rw-draft-count") || 0));
    }, 0);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const session = window.setInterval(() => setSessionSeconds((value) => value + 1), 1000);
    return () => {
      window.clearTimeout(hydrate);
      window.clearInterval(clock);
      window.clearInterval(session);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLauncherOpen(true);
        window.setTimeout(() => launcherRef.current?.focus(), 20);
      }
      if (event.key === "Escape") {
        setStartOpen(false);
        setLauncherOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const focusApp = (id: AppId) => {
    zRef.current += 1;
    setWindows((current) => ({
      ...current,
      [id]: { ...current[id], open: true, minimized: false, z: zRef.current },
    }));
  };

  const openApp = (id: AppId) => {
    focusApp(id);
    setStartOpen(false);
    setLauncherOpen(false);
    setToast(`${APPS[id].title} opened.`);
  };

  const patchWindow = (id: AppId, patch: Partial<WindowState>) =>
    setWindows((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  const beginDrag = (id: AppId, event: ReactPointerEvent<HTMLElement>) => {
    if (windows[id].maximized || window.innerWidth < 760 || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = { x: event.clientX, y: event.clientY, left: windows[id].x, top: windows[id].y };
    const onMove = (moveEvent: PointerEvent) => {
      patchWindow(id, {
        x: Math.max(0, Math.min(window.innerWidth - 260, origin.left + moveEvent.clientX - origin.x)),
        y: Math.max(8, Math.min(window.innerHeight - 110, origin.top + moveEvent.clientY - origin.y)),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const incrementRouted = (by: number) => {
    setRoutedCount((current) => {
      const next = current + by;
      localStorage.setItem("rw-routed-count", String(next));
      return next;
    });
  };

  const incrementDrafts = () => {
    setDraftCount((current) => {
      const next = current + 1;
      localStorage.setItem("rw-draft-count", String(next));
      return next;
    });
  };

  const filteredApps = PUBLIC_APPS.filter((id) =>
    `${APPS[id].title} ${APPS[id].description}`.toLowerCase().includes(launcherQuery.toLowerCase()),
  );

  return (
    <main className="desktop-shell">
      <a className="skip-link" href="#desktop">
        Skip to desktop
      </a>

      <section id="desktop" className="desktop" aria-label="Ryan Winkler support engineering desktop">
        <div className="wallpaper-orb wallpaper-orb-one" aria-hidden="true" />
        <div className="wallpaper-orb wallpaper-orb-two" aria-hidden="true" />

        <nav className="desktop-icons" aria-label="Desktop files and folders">
          {FILES.filter((file) => file.name.endsWith(".py") || file.name === "README.md").map((file) => (
            <a className="desktop-icon" href={file.href} download key={file.name}>
              <DesktopArtifact kind="file" glyph={file.glyph} />
              <span>{file.name}</span>
            </a>
          ))}
          <button className="desktop-icon" onClick={() => openApp("about")}>
            <DesktopArtifact kind="folder" glyph="WEB" />
            <span>https://ryanw.eu</span>
          </button>
          <button className="desktop-icon" onClick={() => openApp("router")}>
            <DesktopArtifact kind="folder" glyph="SLA" />
            <span>Support Workbench</span>
          </button>
          <button className="desktop-icon" onClick={() => openApp("files")}>
            <DesktopArtifact kind="folder" glyph="DOC" />
            <span>Documentation</span>
          </button>
          <button className="desktop-icon" onClick={() => openApp("flash")}>
            <DesktopArtifact kind="folder" glyph="SWF" />
            <span>Flash Files</span>
          </button>
        </nav>

        <aside className="desktop-status" aria-label="Session counters">
          <span>Support session</span>
          <strong>{formatDuration(sessionSeconds)}</strong>
          <dl>
            <div>
              <dt>Issues routed</dt>
              <dd>{routedCount}</dd>
            </div>
            <div>
              <dt>Drafts saved</dt>
              <dd>{draftCount}</dd>
            </div>
            <div>
              <dt>Send state</dt>
              <dd>Review only</dd>
            </div>
          </dl>
        </aside>

        {(Object.keys(APPS) as AppId[]).map((id) => {
          const state = windows[id];
          if (!state.open || state.minimized) return null;
          return (
            <AppWindow
              key={id}
              id={id}
              state={state}
              title={APPS[id].title}
              glyph={APPS[id].glyph}
              onFocus={() => focusApp(id)}
              onDrag={(event) => beginDrag(id, event)}
              onClose={() => {
                patchWindow(id, { open: false });
                setToast(`${APPS[id].title} closed.`);
              }}
              onMinimize={() => patchWindow(id, { minimized: true })}
              onMaximize={() => patchWindow(id, { maximized: !state.maximized })}
            >
              {id === "doom" && <DoomApp />}
              {id === "flash" && <FlashFolderApp />}
              {id === "router" && (
                <SupportFolderApp
                  onRouted={incrementRouted}
                  onDraftSaved={incrementDrafts}
                  notify={setToast}
                  openApp={openApp}
                />
              )}
              {id === "tools" && <ToolsApp />}
              {id === "files" && <FilesApp notify={setToast} />}
              {id === "terminal" && <TerminalApp openApp={openApp} />}
              {id === "about" && <WebsiteFolderApp openApp={openApp} />}
              {id === "work" && <WorkApp />}
              {id === "notes" && <DecisionMarkdownApp />}
              {id === "help" && <HelpApp openApp={openApp} />}
            </AppWindow>
          );
        })}
      </section>

      {startOpen && (
        <section className="start-menu glass-panel" aria-label="Start menu">
          <div className="start-profile">
            <span className="avatar">RW</span>
            <div>
              <strong>Ryan Winkler</strong>
              <span>Support workstation</span>
            </div>
          </div>
          <div className="start-grid">
            {PUBLIC_APPS.map((id) => (
              <button key={id} onClick={() => openApp(id)}>
                <AppGlyph glyph={APPS[id].glyph} small />
                <span>{APPS[id].title}</span>
              </button>
            ))}
          </div>
          <div className="start-footer">
            <span>Local demo · no customer messages sent</span>
            <a href="https://github.com/ryan-winkler" target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          </div>
        </section>
      )}

      {launcherOpen && (
        <section className="launcher glass-panel" aria-label="Application launcher">
          <label htmlFor="launcher-search">Find an app</label>
          <input
            ref={launcherRef}
            id="launcher-search"
            value={launcherQuery}
            onChange={(event) => setLauncherQuery(event.target.value)}
            placeholder="Search apps and tools"
          />
          <div className="launcher-results">
            {filteredApps.map((id) => (
              <button key={id} onClick={() => openApp(id)}>
                <AppGlyph glyph={APPS[id].glyph} small />
                <span>
                  <strong>{APPS[id].title}</strong>
                  <small>{APPS[id].description}</small>
                </span>
              </button>
            ))}
            {!filteredApps.length && <p>No matching app. Press Escape to close.</p>}
          </div>
        </section>
      )}

      <footer className="taskbar glass-panel">
        <button
          className={`start-button ${startOpen ? "active" : ""}`}
          aria-expanded={startOpen}
          onClick={() => {
            setStartOpen((current) => !current);
            setLauncherOpen(false);
          }}
        >
          <span>RW</span>
          <span className="taskbar-label">Start</span>
        </button>
        <button
          className="search-button"
          onClick={() => {
            setLauncherOpen(true);
            setStartOpen(false);
            window.setTimeout(() => launcherRef.current?.focus(), 20);
          }}
        >
          <span>⌕</span>
          <span className="taskbar-label">Find an app</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="taskbar-apps" aria-label="Open applications">
          {(Object.keys(APPS) as AppId[])
            .filter((id) => windows[id].open)
            .map((id) => (
              <button
                key={id}
                className={!windows[id].minimized ? "active" : ""}
                aria-label={`${windows[id].minimized ? "Restore" : "Focus"} ${APPS[id].title}`}
                onClick={() =>
                  windows[id].minimized
                    ? focusApp(id)
                    : patchWindow(id, { minimized: true })
                }
              >
                <AppGlyph glyph={APPS[id].glyph} small />
                <span className="taskbar-label">{APPS[id].title}</span>
              </button>
            ))}
        </div>
        <div className="taskbar-clock" aria-label={now?.toLocaleString("en-IE") ?? "Loading time"}>
          <strong>{now?.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</strong>
          <span>{now?.toLocaleDateString("en-IE", { day: "2-digit", month: "short" }) ?? "—"}</span>
        </div>
      </footer>

      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}

function AppGlyph({ glyph, small = false, tone = "app" }: { glyph: string; small?: boolean; tone?: "app" | "file" }) {
  return <span className={`app-glyph ${small ? "small" : ""} ${tone}`}>{glyph}</span>;
}

function DesktopArtifact({ kind, glyph }: { kind: "file" | "folder"; glyph: string }) {
  return (
    <span className={`desktop-artifact ${kind}`} aria-hidden="true">
      <span>{glyph}</span>
    </span>
  );
}

function AppWindow({
  id,
  state,
  title,
  glyph,
  onFocus,
  onDrag,
  onClose,
  onMinimize,
  onMaximize,
  children,
}: {
  id: AppId;
  state: WindowState;
  title: string;
  glyph: string;
  onFocus: () => void;
  onDrag: (event: ReactPointerEvent<HTMLElement>) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`app-window ${state.maximized ? "maximized" : ""}`}
      aria-label={`${title} application`}
      onPointerDown={onFocus}
      style={
        state.maximized
          ? { zIndex: state.z }
          : { left: state.x, top: state.y, width: state.width, height: state.height, zIndex: state.z }
      }
    >
      <header className="window-titlebar" onPointerDown={onDrag} onDoubleClick={onMaximize}>
        <span className="window-title">
          <AppGlyph glyph={glyph} small />
          <strong>{title}</strong>
        </span>
        <span className="window-actions">
          <button onClick={onMinimize} aria-label={`Minimise ${title}`} title="Minimise">
            —
          </button>
          <button onClick={onMaximize} aria-label={`${state.maximized ? "Restore" : "Maximise"} ${title}`} title="Maximise">
            □
          </button>
          <button className="window-close" onClick={onClose} aria-label={`Close ${title}`} title="Close">
            ×
          </button>
        </span>
      </header>
      <div className="window-body" id={`${id}-window`}>
        {children}
      </div>
    </section>
  );
}

function RouterApp({
  onRouted,
  onDraftSaved,
  notify,
}: {
  onRouted: (count: number) => void;
  onDraftSaved: () => void;
  notify: (message: string) => void;
}) {
  const [issue, setIssue] = useState(DEFAULT_ISSUE);
  const [results, setResults] = useState<RouteResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState("");
  const [revision, setRevision] = useState("");
  const [showSendGate, setShowSendGate] = useState(false);

  const triage = () => {
    const issues = splitIssues(issue);
    const next = issues.filter(Boolean).map(routeIssue);
    setResults(next);
    setSelected(0);
    setDraft(next[0]?.reply ?? "");
    setShowSendGate(false);
    onRouted(next.length);
    notify(`${next.length} ${next.length === 1 ? "issue" : "issues"} triaged. Draft ready for review.`);
  };

  const chooseResult = (index: number) => {
    setSelected(index);
    setDraft(results[index].reply);
    setShowSendGate(false);
  };

  const revise = () => {
    const instruction = revision.trim();
    if (!instruction) return;
    setDraft((current) => `${current}\n\nRevision note: ${instruction}`);
    setRevision("");
    notify("Revision applied locally. Review the draft before saving.");
  };

  const saveDraft = () => {
    if (!draft.trim()) return;
    downloadText(`customer-reply-${new Date().toISOString().slice(0, 10)}.txt`, draft);
    onDraftSaved();
    notify("Draft saved to your device.");
  };

  return (
    <div className="app-stack">
      <div className="app-intro">
        <div>
          <span className="app-eyebrow">Human-in-the-loop workflow</span>
          <h2>Triage, prepare, review.</h2>
        </div>
        <span className="safety-chip">Sending disabled</span>
      </div>

      <label className="field">
        <span>Customer message</span>
        <textarea value={issue} onChange={(event) => setIssue(event.target.value)} rows={6} />
      </label>
      <div className="button-row">
        <button className="primary-button" onClick={triage} disabled={!issue.trim()}>
          Triage & give reply
        </button>
        <button
          className="quiet-button"
          onClick={() => {
            setIssue("");
            setResults([]);
            setDraft("");
          }}
        >
          Clear
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="triage-summary" role="status">
            <strong>{results.length} {results.length === 1 ? "issue" : "issues"} found</strong>
            <span>TriageAgent → exactly one specialist per issue → reply draft</span>
          </div>
          {results.length > 1 && (
            <div className="issue-tabs" aria-label="Detected customer issues">
              {results.map((result, index) => (
                <button className={selected === index ? "active" : ""} key={`${result.route}-${index}`} onClick={() => chooseResult(index)}>
                  <span>{index + 1}</span>
                  {result.route.replace("Agent", "")}
                </button>
              ))}
            </div>
          )}
          <section className="route-card">
            <div>
              <span>Selected agent</span>
              <strong>{results[selected].route}</strong>
            </div>
            <p>{results[selected].summary}</p>
            <small>Next action: {results[selected].action}</small>
          </section>
          <label className="field">
            <span>Prepared customer reply</span>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={9} />
          </label>
          <div className="revision-row">
            <label className="field compact">
              <span>Revision note</span>
              <input
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                placeholder="e.g. make it warmer and ask for one request ID"
              />
            </label>
            <button className="quiet-button" onClick={revise} disabled={!revision.trim()}>
              Revise
            </button>
          </div>
          <div className="button-row sticky-actions">
            <button className="primary-button" onClick={saveDraft}>Save draft</button>
            <button className="danger-button" onClick={() => setShowSendGate(true)}>Send reply</button>
          </div>
          {showSendGate && (
            <section className="send-gate" role="alert">
              <strong>Reply not sent</strong>
              <p>
                This interview build has no customer messaging API or authentication. A person must approve the draft, and the send boundary fails closed.
              </p>
              <div className="button-row">
                <button className="primary-button" onClick={saveDraft}>Save instead</button>
                <button className="quiet-button" onClick={() => setShowSendGate(false)}>Return to review</button>
              </div>
            </section>
          )}
        </>
      )}
      <p className="footnote">
        Browser demo: deterministic and local. The downloadable Python file uses the OpenAI Agents SDK.
      </p>
    </div>
  );
}

function SupportFolderApp({
  onRouted,
  onDraftSaved,
  notify,
  openApp,
}: {
  onRouted: (count: number) => void;
  onDraftSaved: () => void;
  notify: (message: string) => void;
  openApp: (id: AppId) => void;
}) {
  const [routerOpen, setRouterOpen] = useState(false);
  if (routerOpen) {
    return (
      <div className="website-folder-view">
        <nav className="folder-toolbar" aria-label="Support Workbench breadcrumb">
          <button onClick={() => setRouterOpen(false)}>← Support Workbench</button>
          <span>/ Support Router</span>
        </nav>
        <RouterApp onRouted={onRouted} onDraftSaved={onDraftSaved} notify={notify} />
      </div>
    );
  }
  return (
    <div className="website-folder">
      <header className="folder-toolbar">
        <button disabled>←</button>
        <button disabled>→</button>
        <button disabled>↑</button>
        <span className="folder-path">Desktop / Support Workbench</span>
      </header>
      <div className="folder-banner support-folder-banner">
        <span className="profile-mark">SLA</span>
        <div>
          <span className="app-eyebrow">Customer support operations</span>
          <h2>Triage, investigate, prepare, review.</h2>
          <p>Local demo tools with an explicit human approval boundary.</p>
        </div>
      </div>
      <div className="folder-grid">
        <button onClick={() => setRouterOpen(true)}>
          <AppGlyph glyph="AI" />
          <span><strong>Support Router</strong><small>Route issues and prepare customer replies</small></span>
        </button>
        <button onClick={() => openApp("tools")}>
          <AppGlyph glyph="SLA" />
          <span><strong>Support Tools</strong><small>Timer, request IDs, backoff, and HTTP reference</small></span>
        </button>
        <button onClick={() => openApp("terminal")}>
          <AppGlyph glyph=">_" />
          <span><strong>Local Console</strong><small>Safe commands for the browser demo</small></span>
        </button>
        <button onClick={() => openApp("help")}>
          <AppGlyph glyph="?" />
          <span><strong>Help & UX Review</strong><small>Safeguards, shortcuts, and heuristic checks</small></span>
        </button>
      </div>
      <footer className="folder-status">4 tools · No customer messaging API connected</footer>
    </div>
  );
}

function ToolsApp() {
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [requestText, setRequestText] = useState("Error 500 for request req_7f92a1b4 at 14:03 UTC");
  const [attempt, setAttempt] = useState(1);
  const requestIds = requestText.match(/\breq_[a-zA-Z0-9_-]+\b/g) ?? [];
  const backoff = Math.min(60, 2 ** Math.max(0, attempt - 1));

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setTimer((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  return (
    <div className="tools-grid">
      <section className="tool-card timer-card">
        <span className="app-eyebrow">Incident timer</span>
        <strong className="timer-value">{formatDuration(timer)}</strong>
        <div className="button-row">
          <button className="primary-button" onClick={() => setTimerRunning((value) => !value)}>
            {timerRunning ? "Pause" : "Start"}
          </button>
          <button className="quiet-button" onClick={() => { setTimer(0); setTimerRunning(false); }}>Reset</button>
        </div>
      </section>
      <section className="tool-card">
        <span className="app-eyebrow">Request ID finder</span>
        <textarea rows={4} value={requestText} onChange={(event) => setRequestText(event.target.value)} />
        <div className="result-strip">
          {requestIds.length ? requestIds.map((id) => <code key={id}>{id}</code>) : <span>No request IDs found</span>}
        </div>
      </section>
      <section className="tool-card">
        <span className="app-eyebrow">Retry backoff</span>
        <label className="field compact">
          <span>Attempt</span>
          <input type="number" min="1" max="10" value={attempt} onChange={(event) => setAttempt(Number(event.target.value))} />
        </label>
        <strong className="backoff-value">{backoff}s</strong>
        <p>Base exponential delay. Add jitter and always respect server retry guidance.</p>
      </section>
      <section className="tool-card status-reference">
        <span className="app-eyebrow">HTTP quick reference</span>
        <table>
          <thead><tr><th>Code</th><th>Meaning</th><th>First move</th></tr></thead>
          <tbody>
            {STATUS_CODES.map(([code, meaning, action]) => (
              <tr key={code}><td><code>{code}</code></td><td>{meaning}</td><td>{action}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function FilesApp({ notify }: { notify: (message: string) => void }) {
  const [activeFile, setActiveFile] = useState<(typeof FILES)[number] | null>(null);
  const [preview, setPreview] = useState("");

  const previewFile = async (file: (typeof FILES)[number]) => {
    setActiveFile(file);
    setPreview("Loading…");
    try {
      const response = await fetch(file.href);
      if (!response.ok) throw new Error("File unavailable");
      setPreview(await response.text());
    } catch {
      setPreview("Preview unavailable. The download remains available.");
    }
    notify(`${file.name} selected.`);
  };

  return (
    <div className="file-explorer">
      <aside>
        <span className="app-eyebrow">Places</span>
        <button className="active">Interview files</button>
        <button onClick={() => window.open("https://github.com/ryan-winkler", "_blank")}>GitHub ↗</button>
        <button onClick={() => window.open("https://ryanw.eu/", "_blank")}>ryanw.eu ↗</button>
      </aside>
      <div className="file-main">
        <div className="file-list">
          {FILES.map((file) => (
            <button className={activeFile?.name === file.name ? "active" : ""} key={file.name} onClick={() => previewFile(file)}>
              <AppGlyph glyph={file.glyph} tone="file" />
              <span><strong>{file.name}</strong><small>{file.description}</small></span>
            </button>
          ))}
        </div>
        {activeFile ? (
          <section className="file-preview">
            <header>
              <strong>{activeFile.name}</strong>
              <a className="primary-button" href={activeFile.href} download>Download</a>
            </header>
            <pre>{preview}</pre>
          </section>
        ) : (
          <section className="empty-state">
            <AppGlyph glyph="DIR" />
            <strong>Select a file to preview it</strong>
            <span>Every download is the exact interview source artifact.</span>
          </section>
        )}
      </div>
    </div>
  );
}

function TerminalApp({ openApp }: { openApp: (id: AppId) => void }) {
  const welcome = [
    "Ryan Support Workstation — CLI demonstration",
    '$ python3 support_agent_router.py --give-reply prepared "We receive 429 errors during traffic bursts."',
    "Selected agent: RateLimitAgent",
    "Agent flow: TriageAgent → RateLimitAgent → ReplyAgent → Human review",
    "Prepared reply: Thanks for flagging this. Please share a request ID and timestamp while bounded backoff and lower burst concurrency are applied.",
    "Delivery: draft prepared; no customer message sent.",
    "",
    'Type "help" for safe browser commands.',
  ];
  const [lines, setLines] = useState(welcome);
  const [command, setCommand] = useState("");

  const run = (event: FormEvent) => {
    event.preventDefault();
    const input = command.trim();
    if (!input) return;
    const [name, ...args] = input.split(/\s+/);
    let output: string[] = [];
    if (name === "help") output = ["help · ls · whoami · status · route <issue> · open router|tools|files|about · clear"];
    else if (name === "ls") output = FILES.map((file) => file.name);
    else if (name === "whoami") output = ["Ryan Winkler — Senior Product Manager, Dublin"];
    else if (name === "status") output = ["Local demo healthy · sending disabled · human review required"];
    else if (name === "route") {
      const issue = args.join(" ");
      output = issue ? [`${routeIssue(issue).route}: ${routeIssue(issue).action}`] : ["usage: route <customer issue>"];
    } else if (name === "open") {
      const target = args[0] as AppId;
      if (target in APPS) {
        openApp(target);
        output = [`Opened ${APPS[target].title}`];
      } else output = ["Unknown app. Try: router, tools, files, about"];
    } else if (name === "clear") {
      setLines([]);
      setCommand("");
      return;
    } else output = [`Command not found: ${name}. Type "help".`];
    setLines((current) => [...current, `rw@support:~$ ${input}`, ...output]);
    setCommand("");
  };

  return (
    <div className="terminal-app" onClick={(event) => (event.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
      <div className="terminal-output" aria-live="polite">
        {lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
      </div>
      <form onSubmit={run}>
        <label htmlFor="terminal-command">rw@support:~$</label>
        <input id="terminal-command" value={command} onChange={(event) => setCommand(event.target.value)} autoComplete="off" />
      </form>
    </div>
  );
}

function DoomApp() {
  return (
    <div className="doom-app">
      <iframe
        src="https://thedoggybrad.github.io/doom_on_js-dos/"
        title="DOOM running in js-dos"
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
      />
      <aside>
        <span>Desktop only · click the game panel to start</span>
        <a href="https://github.com/thedoggybrad/doom_on_js-dos" target="_blank" rel="noreferrer">
          Source and manual ↗
        </a>
      </aside>
    </div>
  );
}

function FlashFolderApp() {
  const [view, setView] = useState<"folder" | "badger" | "attributions">("folder");
  if (view === "badger") {
    return (
      <div className="flash-app">
        <nav className="folder-toolbar" aria-label="Flash Files breadcrumb">
          <button onClick={() => setView("folder")}>← Flash Files</button>
          <span>/ badger.swf</span>
        </nav>
        <iframe
          src="https://www.badgerbadgerbadger.com/badger.html"
          title="Badger Badger Badger by Jonti Picking"
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
        <aside>
          <span>Original animation and music © Jonti Picking / Weebl’s Stuff</span>
          <a href="https://weebls-stuff.com/toons/badgers/" target="_blank" rel="noreferrer">Creator’s page ↗</a>
        </aside>
      </div>
    );
  }
  if (view === "attributions") {
    return (
      <div className="website-folder-view">
        <nav className="folder-toolbar" aria-label="Flash Files breadcrumb">
          <button onClick={() => setView("folder")}>← Flash Files</button>
          <span>/ ATTRIBUTIONS.md</span>
          <a className="folder-download" href="/downloads/ATTRIBUTIONS.md" download>Download</a>
        </nav>
        <AttributionsDocument />
      </div>
    );
  }
  return (
    <div className="website-folder">
      <header className="folder-toolbar">
        <button disabled>←</button>
        <button disabled>→</button>
        <button disabled>↑</button>
        <span className="folder-path">Desktop / Flash Files</span>
      </header>
      <div className="folder-banner flash-folder-banner">
        <span className="profile-mark">SWF</span>
        <div>
          <span className="app-eyebrow">Internet archaeology</span>
          <h2>Badger. Badger. Badger.</h2>
          <p>The animation stays on its official host; attribution travels with the shortcut.</p>
        </div>
      </div>
      <div className="folder-grid flash-grid">
        <button onClick={() => setView("badger")}>
          <AppGlyph glyph="SWF" />
          <span><strong>badger.swf</strong><small>Open the official preserved web animation</small></span>
        </button>
        <button onClick={() => setView("attributions")}>
          <DesktopArtifact kind="file" glyph="MD" />
          <span><strong>ATTRIBUTIONS.md</strong><small>Copyright, licences, source links, and boundaries</small></span>
        </button>
      </div>
      <footer className="folder-status">2 items · Third-party media remains externally hosted</footer>
    </div>
  );
}

function AttributionsDocument() {
  return (
    <article className="markdown-app">
      <h1>Attributions and third-party boundaries</h1>
      <p className="markdown-meta">ATTRIBUTIONS.md · links verified 27 July 2026</p>
      <h2>Badger Badger Badger</h2>
      <p>
        Animation and music by <strong>Jonti Picking (Weebl)</strong>. This site embeds the preservation page from
        <code> badgerbadgerbadger.com</code>; it does not copy or redistribute the animation or audio.
      </p>
      <p><a href="https://weebls-stuff.com/toons/badgers/" target="_blank" rel="noreferrer">Official creator page ↗</a></p>
      <h2>DOOM on js-dos</h2>
      <p>
        The miniapp is an external embed of <code>thedoggybrad/doom_on_js-dos</code>, whose wrapper repository is MIT-licensed.
        DOOM game content and marks remain the property of their respective rights holders. This project does not copy the game archive.
      </p>
      <p><a href="https://github.com/thedoggybrad/doom_on_js-dos" target="_blank" rel="noreferrer">Source and licence ↗</a></p>
      <h2>Desktop references</h2>
      <p>
        daedalOS and CoffeeOS informed the interaction quality bar. The implementation here is original and no upstream source,
        marks, or bundled assets were copied. The awesome-web-desktops list was used for comparative research.
      </p>
      <h2>OpenAI</h2>
      <p>
        The downloadable CLI uses the OpenAI Agents SDK. Specialist learning links are restricted to official OpenAI Developer Docs,
        Cookbook, and Learn pages. The social preview was generated with OpenAI image generation for this project.
      </p>
    </article>
  );
}

function DecisionMarkdownApp() {
  return (
    <article className="markdown-app">
      <h1>Support router: process and decisions</h1>
      <p className="markdown-meta">PROCESS.md · interview build · 27 July 2026</p>

      <h2>Goal</h2>
      <p>
        Turn one customer message into one or more explicit issues, route each issue to exactly one specialist, and prepare a concise customer reply for human review.
      </p>

      <h2>Why these boundaries?</h2>
      <ul>
        <li><strong>Network:</strong> <code>invoke_agent()</code> is the only Agents SDK runner boundary.</li>
        <li><strong>Parsing:</strong> customer text becomes individual issues before routing.</li>
        <li><strong>Computation:</strong> allowlists and workflow decisions remain deterministic.</li>
        <li><strong>Formatting:</strong> CLI output, customer replies, and logs are separate.</li>
      </ul>

      <h2>Human in the loop</h2>
      <p>
        The system may draft and revise, but it cannot send. <strong>Send Reply</strong> fails closed until an authenticated customer channel exists, then offers Save instead.
      </p>

      <h2>Desktop decisions</h2>
      <p>
        Four deliverable files stay visible. Portfolio, support tools, and documentation are grouped into folders. The three open windows show the interview story at a glance: a human break, the working CLI, and the rationale.
      </p>

      <h2>Automatic customer context</h2>
      <p>
        With no connected APIs, context comes only from the message and explicitly supplied local fields: request IDs, timestamps, endpoint, model, region, customer reference, and observed error. Secrets and raw personal data are excluded from logs.
      </p>

      <h2>One concrete AI correction</h2>
      <p>
        A broad keyword route could let “slow” override an explicit 429. The final priority makes concrete protocol evidence win over ambiguous wording.
      </p>

      <h2>With fifteen more minutes</h2>
      <ol>
        <li>Bounded retry with backoff for 429 responses.</li>
        <li>A <code>--json-lines</code> output mode.</li>
        <li>Per-model cost estimates from token counts.</li>
      </ol>

      <h2>Evidence</h2>
      <pre><code>python3 test_pure.py{"\n"}# 18 tests · 0 network</code></pre>
      <p>
        Specialist learning context is restricted to the OpenAI Developer Docs, Cookbook, and Learn surfaces.
      </p>
    </article>
  );
}

function AboutApp({ openApp }: { openApp: (id: AppId) => void }) {
  return (
    <article className="profile-app">
      <header className="profile-hero">
        <div className="profile-mark">RW</div>
        <div>
          <span className="app-eyebrow">Senior Product Manager · Dublin</span>
          <h2>Systems that earn trust at scale.</h2>
          <p>
            I work where internal platforms, trust-sensitive operations, and AI quality meet—especially when teams need a shared definition of “done”.
          </p>
          <div className="button-row">
            <button className="primary-button" onClick={() => openApp("router")}>Open support router</button>
            <a className="quiet-button" href="https://ryanw.eu/" target="_blank" rel="noreferrer">Visit ryanw.eu ↗</a>
          </div>
        </div>
      </header>
      <dl className="metric-grid">
        <div><dt>Engineering teams supported</dt><dd>40+</dd></div>
        <div><dt>Agreement cycle</dt><dd>30d → &lt;48h</dd></div>
        <div><dt>Live AI conversations</dt><dd>10,000+</dd></div>
        <div><dt>Contribution flow</dt><dd>+135%</dd></div>
      </dl>
      <section className="principle-grid">
        <div><span>01</span><strong>System resilience</strong><p>Design the operating model, not only the happy path.</p></div>
        <div><span>02</span><strong>Enterprise trust</strong><p>Make ownership, controls, and failure states visible.</p></div>
        <div><span>03</span><strong>Evidence over ritual</strong><p>Use observable outcomes to settle ambiguous work.</p></div>
      </section>
      <footer className="profile-links">
        <a href="https://github.com/ryan-winkler" target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href="https://ryanw.eu/about/" target="_blank" rel="noreferrer">Full profile ↗</a>
        <span>Thank you to OpenAI for the opportunity.</span>
      </footer>
    </article>
  );
}

function WebsiteFolderApp({ openApp }: { openApp: (id: AppId) => void }) {
  const [view, setView] = useState<"folder" | "about" | "work" | "notes">("folder");
  if (view !== "folder") {
    return (
      <div className="website-folder-view">
        <nav className="folder-toolbar" aria-label="Website folder breadcrumb">
          <button onClick={() => setView("folder")}>← https://ryanw.eu</button>
          <span>/ {view === "about" ? "About Ryan" : view === "work" ? "Selected Work" : "Field Notes"}</span>
        </nav>
        {view === "about" && <AboutApp openApp={openApp} />}
        {view === "work" && <WorkApp />}
        {view === "notes" && <NotesApp />}
      </div>
    );
  }
  return (
    <div className="website-folder">
      <header className="folder-toolbar">
        <button disabled>←</button>
        <button disabled>→</button>
        <button disabled>↑</button>
        <span className="folder-path">Desktop / https://ryanw.eu</span>
      </header>
      <div className="folder-banner">
        <span className="profile-mark">RW</span>
        <div>
          <span className="app-eyebrow">Ryan Winkler · Dublin</span>
          <h2>I build systems that earn trust at scale.</h2>
          <p>Portfolio content stays together in this folder.</p>
        </div>
      </div>
      <div className="folder-grid">
        <button onClick={() => setView("about")}>
          <DesktopArtifact kind="folder" glyph="RW" />
          <span><strong>About Ryan</strong><small>Profile, principles, and track record</small></span>
        </button>
        <button onClick={() => setView("work")}>
          <DesktopArtifact kind="folder" glyph="LAB" />
          <span><strong>Selected Work</strong><small>Current public projects and systems</small></span>
        </button>
        <button onClick={() => setView("notes")}>
          <DesktopArtifact kind="folder" glyph="TXT" />
          <span><strong>Field Notes</strong><small>Writing on trust, platforms, and AI quality</small></span>
        </button>
        <a href="https://github.com/ryan-winkler" target="_blank" rel="noreferrer">
          <DesktopArtifact kind="folder" glyph="GIT" />
          <span><strong>GitHub</strong><small>Public source and experiments ↗</small></span>
        </a>
      </div>
      <footer className="folder-status">4 items · Content adapted from ryanw.eu</footer>
    </div>
  );
}

function WorkApp() {
  const projects = [
    ["Coolock Village", "Community-first local information and service design.", "https://ryanw.eu/now/"],
    ["Meitheal", "A public-interest operating model for useful, governed technology.", "https://ryanw.eu/now/"],
    ["ElectricTown", "Commerce infrastructure built around clear tenant and platform boundaries.", "https://ryanw.eu/now/"],
    ["BulkheadOS", "Resilience patterns made concrete through product and system documentation.", "https://github.com/ryan-winkler"],
    ["Captain’s Log", "Local-first transcription and reflection tooling.", "https://github.com/ryan-winkler/captainslog-whisper"],
    ["Support Agent Router", "Multi-issue triage, specialist routing, and human-approved customer replies.", "/downloads/support_agent_router.py"],
  ];
  return (
    <div className="work-app">
      <header className="section-heading">
        <span className="app-eyebrow">Selected public work</span>
        <h2>Systems with visible boundaries.</h2>
        <p>Current work spans local communities, resilient platforms, support operations, and practical AI evaluation.</p>
      </header>
      <div className="project-grid">
        {projects.map(([name, description, href], index) => (
          <a key={name} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{name}</strong>
            <p>{description}</p>
            <small>Open project ↗</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function NotesApp() {
  const notes = [
    ["How to be AI-forward without being AI-first", "A practical distinction between useful capability and technology theatre.", "https://ryanw.eu/field-notes/"],
    ["Evidence before confidence", "How teams make better decisions when the proof is legible.", "https://ryanw.eu/field-notes/"],
    ["The operating model is the product", "Why ownership, escalation, and feedback loops belong in the design.", "https://ryanw.eu/field-notes/"],
  ];
  return (
    <div className="notes-app">
      <header className="section-heading">
        <span className="app-eyebrow">Field notes</span>
        <h2>Working notes, not thought leadership.</h2>
        <p>Short essays on platform work, AI quality, trust, and the organisational mechanics behind durable products.</p>
      </header>
      <div className="notes-list">
        {notes.map(([title, description, href], index) => (
          <a href={href} target="_blank" rel="noreferrer" key={title}>
            <time>Note {String(index + 1).padStart(2, "0")}</time>
            <div><strong>{title}</strong><p>{description}</p></div>
            <span>↗</span>
          </a>
        ))}
      </div>
      <a className="primary-button" href="https://ryanw.eu/field-notes/" target="_blank" rel="noreferrer">Read all field notes</a>
    </div>
  );
}

function HelpApp({ openApp }: { openApp: (id: AppId) => void }) {
  return (
    <div className="help-app">
      <header className="section-heading">
        <span className="app-eyebrow">Help and safeguards</span>
        <h2>The system explains itself.</h2>
      </header>
      <div className="help-grid">
        <section>
          <h3>Get started</h3>
          <ol>
            <li>Open <button onClick={() => openApp("router")}>Support Router</button>.</li>
            <li>Paste one or several customer issues.</li>
            <li>Review the specialist route and prepared reply.</li>
            <li>Revise or save. Sending stays blocked without an authenticated channel.</li>
          </ol>
        </section>
        <section>
          <h3>Keyboard</h3>
          <dl className="shortcut-list">
            <div><dt><kbd>Ctrl K</kbd></dt><dd>Open app finder</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Close menus</dd></div>
            <div><dt><kbd>Tab</kbd></dt><dd>Move through controls</dd></div>
            <div><dt><kbd>Enter</kbd></dt><dd>Activate focused control</dd></div>
          </dl>
        </section>
      </div>
      <section className="heuristics">
        <h3>Nielsen heuristic check</h3>
        <div>
          {[
            ["System status", "Open windows, counters, active states, and live notices stay visible."],
            ["Real-world match", "Apps, files, drafts, and incidents use familiar support language."],
            ["Control & freedom", "Minimise, restore, close, clear, revise, and cancel are always available."],
            ["Consistency", "One window model and one action hierarchy apply across the desktop."],
            ["Error prevention", "The send boundary is disabled until a real authenticated channel exists."],
            ["Recognition", "Desktop icons, Start, app finder, and file metadata reduce recall."],
            ["Efficiency", "Ctrl K, taskbar switching, local counters, and direct downloads serve repeat use."],
            ["Minimalism", "Each app owns one bounded job; operational detail appears only where needed."],
            ["Recovery", "Failed send explains the cause and offers Save or Return to review."],
            ["Help", "This panel documents the flow, shortcuts, safeguards, and source links."],
          ].map(([title, text], index) => (
            <article key={title}><span>{index + 1}</span><strong>{title}</strong><p>{text}</p></article>
          ))}
        </div>
      </section>
      <section className="neuro-panel">
        <div>
          <span className="app-eyebrow">Neuroinclusive heuristic panel</span>
          <h3>ADHD and AuDHD review</h3>
          <p>This is an expert heuristic pass, not a substitute for research with neurodivergent users.</p>
        </div>
        <div className="neuro-grid">
          {[
            ["Attention", "The first screen exposes one primary action and keeps operational counters peripheral."],
            ["Working memory", "Visible apps, taskbar state, labels, and saved drafts reduce the need to remember prior steps."],
            ["Predictability", "Windows use stable controls; no sound, auto-send, surprise navigation, or timed dismissal is used."],
            ["Sensory load", "Motion is restrained, reduced-motion is respected, and high-detail content stays inside the selected app."],
            ["Task recovery", "Drafts remain editable, send fails closed, and every destructive-looking action offers a safe next step."],
            ["Choice load", "The desktop offers many tools, but the About window and Support Router establish a clear starting path."],
          ].map(([title, text]) => (
            <article key={title}><strong>{title}</strong><p>{text}</p></article>
          ))}
        </div>
      </section>
      <footer className="source-links">
        <a href="https://developers.openai.com/api/docs/guides/agents" target="_blank" rel="noreferrer">OpenAI Agents guide ↗</a>
        <a href="https://developers.openai.com/cookbook" target="_blank" rel="noreferrer">OpenAI Cookbook ↗</a>
        <a href="https://developers.openai.com/learn" target="_blank" rel="noreferrer">OpenAI Learn ↗</a>
      </footer>
    </div>
  );
}
