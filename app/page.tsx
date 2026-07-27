"use client";

import Image from "next/image";
import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type AppId = "doom" | "games" | "utilities" | "flash" | "router" | "tools" | "files" | "terminal" | "about" | "work" | "notes" | "help";
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

type TrayPanel = "system" | "calendar" | null;
type Wallpaper = "sunset" | "teal";
type PythonRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};
type TerminalRequest = { id: number; command: string };
type DesktopContextMenu = {
  x: number;
  y: number;
  target: "desktop" | "public" | "python";
  fileName?: string;
};

const APPS: Record<AppId, { title: string; glyph: string; description: string }> = {
  doom: { title: "DOOM — js-dos", glyph: "D00M", description: "The classic desktop break, embedded from the requested js-dos build" },
  games: { title: "Games", glyph: "GAME", description: "DOOM and two small local break games" },
  utilities: { title: "Utilities", glyph: "UTIL", description: "Scratchpad, calculator, image viewer, and system monitor" },
  flash: { title: "Flash Files", glyph: "SWF", description: "Badger Badger Badger and third-party attributions" },
  router: { title: "Support Router", glyph: "PY", description: "Route customer issues and prepare a human-reviewed reply" },
  tools: { title: "Support Tools", glyph: "SLA", description: "Timers, request IDs, backoff, and status codes" },
  files: { title: "Public", glyph: "DIR", description: "Apps, source, tests, README, downloads, and project notes" },
  terminal: { title: "Command Prompt — support_agent_router.py", glyph: ">_", description: "Run the shipped Python files in the command console" },
  about: { title: "About me", glyph: "RW", description: "Profile card, selected work, and field notes" },
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
    name: "MANUAL.md",
    glyph: "MD",
    href: "/downloads/MANUAL.md",
    description: "Local copy of the DOOM on JS-DOS controls and launch instructions.",
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
  games: { open: false, minimized: false, maximized: false, x: 310, y: 84, width: 720, height: 590, z: 2 },
  utilities: { open: false, minimized: false, maximized: false, x: 330, y: 88, width: 730, height: 600, z: 2 },
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
const PUBLIC_APPS: AppId[] = ["doom", "games", "utilities", "flash", "router", "tools", "files", "terminal", "about", "help"];
const TASKBAR_PINNED: AppId[] = ["files", "terminal", "router"];
const DOWNLOAD_ARCHIVE = "/downloads/support-agent-router-interview.zip";

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
  if (/latency|slow|time.?out|time.?to.?first|ttft|degraded|taking too long/.test(text)) {
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
  const [launcherQuery, setLauncherQuery] = useState("");
  const [trayPanel, setTrayPanel] = useState<TrayPanel>(null);
  const [contextMenu, setContextMenu] = useState<DesktopContextMenu | null>(null);
  const [terminalRequest, setTerminalRequest] = useState<TerminalRequest | null>(null);
  const [wallpaper, setWallpaper] = useState<Wallpaper>("sunset");
  const [desktopRevealed, setDesktopRevealed] = useState(false);
  const [desktopLayoutVersion, setDesktopLayoutVersion] = useState(0);
  const [online, setOnline] = useState(true);
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
      if (window.innerWidth <= 1050) {
        setWindows((current) =>
          Object.fromEntries(
            (Object.keys(current) as AppId[]).map((id) => [
              id,
              current[id].open ? { ...current[id], minimized: true } : current[id],
            ]),
          ) as Record<AppId, WindowState>,
        );
        setDesktopRevealed(true);
      }
    }, 0);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const session = window.setInterval(() => setSessionSeconds((value) => value + 1), 1000);
    const updateConnection = () => setOnline(window.navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.clearTimeout(hydrate);
      window.clearInterval(clock);
      window.clearInterval(session);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setStartOpen(true);
        setTrayPanel(null);
        window.setTimeout(() => launcherRef.current?.focus(), 20);
      }
      if (event.shiftKey && event.key === "Escape") {
        event.preventDefault();
        setStartOpen((current) => !current);
        setTrayPanel(null);
      }
      if (event.shiftKey && event.key === "F10") {
        event.preventDefault();
        zRef.current += 1;
        setWindows((current) => ({
          ...current,
          terminal: { ...current.terminal, open: true, minimized: false, z: zRef.current },
        }));
      }
      if (event.key === "Escape") {
        setStartOpen(false);
        setTrayPanel(null);
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const closeTransientPanels = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".start-menu, .taskbar, .tray-panel, .desktop-context-menu")) return;
      setStartOpen(false);
      setTrayPanel(null);
      setContextMenu(null);
    };
    document.addEventListener("pointerdown", closeTransientPanels);
    return () => document.removeEventListener("pointerdown", closeTransientPanels);
  }, []);

  const focusApp = (id: AppId) => {
    zRef.current += 1;
    setWindows((current) => ({
      ...current,
      [id]: { ...current[id], open: true, minimized: false, z: zRef.current },
    }));
    window.requestAnimationFrame(() => {
      document.getElementById(`${id}-window`)?.closest<HTMLElement>(".app-window")?.focus({ preventScroll: true });
    });
  };

  const openApp = (id: AppId) => {
    focusApp(id);
    setStartOpen(false);
    setTrayPanel(null);
    setContextMenu(null);
    setDesktopRevealed(false);
    setToast(`${APPS[id].title} opened.`);
  };

  const runInTerminal = (command: string) => {
    focusApp("terminal");
    setTerminalRequest({ id: Date.now(), command });
    setStartOpen(false);
    setTrayPanel(null);
    setContextMenu(null);
    setToast(`Running ${command}.`);
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
    `${APPS[id].title} ${APPS[id].description} ${id} ${
      id === "terminal" ? "command cmd python console" : ""
    }`.toLowerCase().includes(launcherQuery.toLowerCase()),
  );
  const filteredFiles = FILES.filter((file) =>
    `${file.name} ${file.description}`.toLowerCase().includes(launcherQuery.toLowerCase()),
  );
  const focusedApp = (Object.keys(APPS) as AppId[])
    .filter((id) => windows[id].open && !windows[id].minimized)
    .sort((a, b) => windows[b].z - windows[a].z)[0];
  const taskbarApps = [
    ...TASKBAR_PINNED,
    ...(Object.keys(APPS) as AppId[]).filter(
      (id) => windows[id].open && !TASKBAR_PINNED.includes(id),
    ),
  ];

  const resetDesktop = () => {
    zRef.current = 6;
    setWindows(INITIAL_WINDOWS);
    setDesktopLayoutVersion((current) => current + 1);
    setDesktopRevealed(false);
    setContextMenu(null);
    setToast("Desktop layout reset.");
  };

  const toggleDesktop = () => {
    const shouldReveal = !desktopRevealed;
    setWindows((current) =>
      Object.fromEntries(
        (Object.keys(current) as AppId[]).map((id) => [
          id,
          current[id].open ? { ...current[id], minimized: shouldReveal } : current[id],
        ]),
      ) as Record<AppId, WindowState>,
    );
    setDesktopRevealed(shouldReveal);
    setToast(shouldReveal ? "Desktop revealed." : "Open windows restored.");
  };

  return (
    <main className="desktop-shell">
      <a className="skip-link" href="#desktop">
        Skip to desktop
      </a>

      <section
        id="desktop"
        className={`desktop wallpaper-${wallpaper}`}
        aria-label="Ryan Winkler support engineering desktop"
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest(".app-window")) return;
          event.preventDefault();
          setContextMenu({
            x: Math.min(event.clientX, window.innerWidth - 220),
            y: Math.min(event.clientY, window.innerHeight - 260),
            target: "desktop",
          });
          setStartOpen(false);
          setTrayPanel(null);
        }}
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest(".desktop-context-menu")) setContextMenu(null);
        }}
      >
        <div className="wallpaper-orb wallpaper-orb-one" aria-hidden="true" />
        <div className="wallpaper-orb wallpaper-orb-two" aria-hidden="true" />

        <nav key={desktopLayoutVersion} className="desktop-icons" aria-label="Desktop files and folders">
          {FILES.filter((file) => file.name.endsWith(".py")).map((file) => (
            <MovableDesktopItem key={file.name}>
              <button
                className="desktop-icon"
                onClick={() => runInTerminal(`python ${file.name}`)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenu({
                    x: Math.min(event.clientX, window.innerWidth - 220),
                    y: Math.min(event.clientY, window.innerHeight - 190),
                    target: "python",
                    fileName: file.name,
                  });
                }}
              >
                <DesktopArtifact kind="file" glyph={file.glyph} />
                <span>{file.name}</span>
              </button>
            </MovableDesktopItem>
          ))}
          <MovableDesktopItem>
            <button
              className="desktop-icon"
              onClick={() => openApp("files")}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setContextMenu({
                  x: Math.min(event.clientX, window.innerWidth - 220),
                  y: Math.min(event.clientY, window.innerHeight - 190),
                  target: "public",
                });
              }}
            >
              <DesktopArtifact kind="folder" glyph="PUB" />
              <span>Public</span>
            </button>
          </MovableDesktopItem>
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
              {id === "games" && <GamesApp openApp={openApp} />}
              {id === "utilities" && <UtilitiesApp wallpaper={wallpaper} setWallpaper={setWallpaper} />}
              {id === "flash" && <FlashFolderApp />}
              {id === "router" && (
                <SupportFolderApp
                  onRouted={incrementRouted}
                  onDraftSaved={incrementDrafts}
                  notify={setToast}
                  openApp={openApp}
                  runInTerminal={runInTerminal}
                />
              )}
              {id === "tools" && <ToolsApp />}
              {id === "files" && <FilesApp notify={setToast} openApp={openApp} runInTerminal={runInTerminal} />}
              {id === "terminal" && (
                <TerminalApp
                  openApp={openApp}
                  request={terminalRequest}
                  windows={windows}
                  patchWindow={patchWindow}
                />
              )}
              {id === "about" && <WebsiteFolderApp openApp={openApp} />}
              {id === "work" && <WorkApp />}
              {id === "notes" && <DecisionMarkdownApp />}
              {id === "help" && <HelpApp openApp={openApp} />}
            </AppWindow>
          );
        })}

        {contextMenu && (
          <nav
            className="desktop-context-menu glass-panel"
            aria-label="Desktop actions"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {contextMenu.target === "python" && contextMenu.fileName ? (
              <>
                <button onClick={() => runInTerminal(`python ${contextMenu.fileName}`)}>
                  <TaskbarIcon id="terminal" />
                  <span><strong>Run in Command Prompt</strong><small>{contextMenu.fileName}</small></span>
                </button>
                <a className="context-menu-link" href={`/downloads/${contextMenu.fileName}`} download>
                  <DesktopArtifact kind="file" glyph="PY" />
                  <span><strong>Download file</strong><small>Save the exact Python source</small></span>
                </a>
              </>
            ) : (
              <>
                <button onClick={() => openApp("files")}>
                  <TaskbarIcon id="files" />
                  <span><strong>Open Public</strong><small>Apps, source, README, and downloads</small></span>
                </button>
                <button onClick={() => openApp("terminal")}>
                  <TaskbarIcon id="terminal" />
                  <span><strong>Open Command Prompt</strong><small>Run the shipped Python files</small></span>
                </button>
              </>
            )}
            {contextMenu.target === "public" && (
              <a className="context-menu-link" href={DOWNLOAD_ARCHIVE} download>
                <DesktopArtifact kind="file" glyph="ZIP" />
                <span><strong>Download project ZIP</strong><small>Source, tests, docs, and attributions</small></span>
              </a>
            )}
            {contextMenu.target === "desktop" && (
              <>
            <button
              onClick={() => {
                setWallpaper((current) => current === "sunset" ? "teal" : "sunset");
                setContextMenu(null);
                setToast("Wallpaper changed.");
              }}
            >
              <span className="context-swatch" aria-hidden="true" />
              <span><strong>Change wallpaper</strong><small>Switch sunset and teal</small></span>
            </button>
            <button onClick={resetDesktop}>
              <span className="context-reset" aria-hidden="true">↺</span>
              <span><strong>Reset desktop layout</strong><small>Restore the interview opening</small></span>
            </button>
              </>
            )}
          </nav>
        )}
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
          <label className="start-search" htmlFor="start-search">
            <span className="search-icon" aria-hidden="true" />
            <input
              ref={launcherRef}
              id="start-search"
              value={launcherQuery}
              onChange={(event) => setLauncherQuery(event.target.value)}
              placeholder="Search apps, files, and commands"
            />
          </label>
          <div className="start-grid">
            {filteredApps.map((id) => (
              <button key={id} onClick={() => openApp(id)}>
                <AppGlyph glyph={APPS[id].glyph} small />
                <span>{APPS[id].title}</span>
              </button>
            ))}
          </div>
          {filteredFiles.length > 0 && (
            <section className="start-recents" aria-label="Recent interview files">
              <header>
                <strong>Interview files</strong>
                <span>
                  <a href={DOWNLOAD_ARCHIVE} download>Download all</a>
                  <button onClick={() => openApp("files")}>Open folder</button>
                </span>
              </header>
              <div>
                {filteredFiles.slice(0, 3).map((file) => (
                  <button key={file.name} onClick={() => file.name.endsWith(".py") ? runInTerminal(`python ${file.name}`) : openApp("files")}>
                    <DesktopArtifact kind="file" glyph={file.glyph} />
                    <span><strong>{file.name}</strong><small>{file.description}</small></span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {!filteredApps.length && !filteredFiles.length && (
            <p className="start-empty">No matching app or file.</p>
          )}
          <div className="start-footer">
            <span>Local demo · no customer messages sent</span>
            <button onClick={resetDesktop}>Reset layout</button>
          </div>
        </section>
      )}

      <footer className="taskbar glass-panel">
        <button
          className={`start-button ${startOpen ? "active" : ""}`}
          aria-label="Open Start menu"
          aria-expanded={startOpen}
          onClick={() => {
            setStartOpen((current) => !current);
            setTrayPanel(null);
          }}
        >
          <span className="launcher-grid-icon" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
          </span>
          <span className="taskbar-button-label">Start</span>
          <span className="taskbar-tooltip">Start <kbd>Shift Esc</kbd></span>
        </button>
        <span className="taskbar-divider" aria-hidden="true" />
        <button
          className={`search-button ${startOpen ? "active" : ""}`}
          aria-label="Find an app"
          onClick={() => {
            setStartOpen(true);
            setTrayPanel(null);
            window.setTimeout(() => launcherRef.current?.focus(), 20);
          }}
        >
          <span className="search-icon" aria-hidden="true" />
          <span className="taskbar-search-label">Type here to search</span>
          <span className="taskbar-tooltip">Find an app <kbd>Ctrl K</kbd></span>
        </button>
        <div className="taskbar-apps" aria-label="Open applications">
          {taskbarApps.map((id) => (
              <button
                key={id}
                className={[
                  windows[id].open ? "open" : "",
                  focusedApp === id ? "active" : "",
                ].filter(Boolean).join(" ")}
                aria-label={
                  !windows[id].open
                    ? `Open ${APPS[id].title}`
                    : windows[id].minimized
                      ? `Restore ${APPS[id].title}`
                      : focusedApp === id
                        ? `Minimise ${APPS[id].title}`
                        : `Focus ${APPS[id].title}`
                }
                onClick={() => {
                  if (!windows[id].open || windows[id].minimized || focusedApp !== id) focusApp(id);
                  else patchWindow(id, { minimized: true });
                }}
              >
                <TaskbarIcon id={id} />
                <span className="taskbar-app-label">{APPS[id].title}</span>
                <span className="taskbar-tooltip">
                  <strong>{APPS[id].title}</strong>
                  <small>{windows[id].open ? windows[id].minimized ? "Minimised" : focusedApp === id ? "In focus" : "Open" : "Pinned"}</small>
                </span>
              </button>
            ))}
        </div>
        <div className="taskbar-system">
          <button
            className={trayPanel === "system" ? "active" : ""}
            aria-label="Open workstation status"
            aria-expanded={trayPanel === "system"}
            onClick={() => {
              setTrayPanel((current) => current === "system" ? null : "system");
              setStartOpen(false);
            }}
          >
            <span className="network-icon" aria-hidden="true"><i /><i /><i /></span>
            <span className="speaker-icon" aria-hidden="true">◖</span>
            <span className="battery-icon" aria-hidden="true"><i /></span>
            <span className="taskbar-tooltip">Workstation status</span>
          </button>
          <button
            className={`taskbar-clock ${trayPanel === "calendar" ? "active" : ""}`}
            aria-label={now?.toLocaleString("en-IE") ?? "Loading time"}
            aria-expanded={trayPanel === "calendar"}
            onClick={() => {
              setTrayPanel((current) => current === "calendar" ? null : "calendar");
              setStartOpen(false);
            }}
          >
            <strong>{now?.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</strong>
            <span>{now?.toLocaleDateString("en-IE", { day: "2-digit", month: "short" }) ?? "—"}</span>
          </button>
          <button className="show-desktop-button" onClick={toggleDesktop} aria-label={desktopRevealed ? "Restore open windows" : "Show desktop"}>
            <span className="show-desktop-icon" aria-hidden="true">▯</span>
            <span className="taskbar-tooltip">{desktopRevealed ? "Restore windows" : "Show desktop"}</span>
          </button>
        </div>
      </footer>

      {trayPanel === "system" && (
        <section className="tray-panel system-panel glass-panel" aria-label="Workstation status">
          <header>
            <span>Workstation status</span>
            <strong>Review-safe</strong>
          </header>
          <dl>
            <div><dt><span className={`status-dot ${online ? "online" : "offline"}`} />Connection</dt><dd>{online ? "Online" : "Offline"}</dd></div>
            <div><dt><span className="status-dot local" />Customer data</dt><dd>Local only</dd></div>
            <div><dt><span className="status-dot review" />Reply delivery</dt><dd>Human review</dd></div>
          </dl>
          <div className="tray-actions">
            <button onClick={() => openApp("router")}>Open Workbench</button>
            <button onClick={resetDesktop}>Reset layout</button>
          </div>
        </section>
      )}

      {trayPanel === "calendar" && (
        <section className="tray-panel calendar-panel glass-panel" aria-label="Calendar and session status">
          <time dateTime={now?.toISOString()}>
            <strong>{now?.toLocaleDateString("en-IE", { weekday: "long" }) ?? "Today"}</strong>
            <span>{now?.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" }) ?? "Loading date"}</span>
          </time>
          <div className="calendar-day">{now?.getDate() ?? "—"}</div>
          <dl>
            <div><dt>Session</dt><dd>{formatDuration(sessionSeconds)}</dd></div>
            <div><dt>Issues routed</dt><dd>{routedCount}</dd></div>
            <div><dt>Drafts saved</dt><dd>{draftCount}</dd></div>
          </dl>
        </section>
      )}

      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}

function AppGlyph({ glyph, small = false, tone = "app" }: { glyph: string; small?: boolean; tone?: "app" | "file" }) {
  return <span className={`app-glyph ${small ? "small" : ""} ${tone}`}>{glyph}</span>;
}

function TaskbarIcon({ id }: { id: AppId }) {
  if (id === "files") return <span className="taskbar-icon taskbar-folder-icon" aria-hidden="true" />;
  if (id === "router") return <span className="taskbar-icon taskbar-router-icon" aria-hidden="true">Py</span>;
  if (id === "notes") return <span className="taskbar-icon taskbar-document-icon" aria-hidden="true"><i /><i /><i /></span>;
  if (id === "tools") return <span className="taskbar-icon taskbar-tools-icon" aria-hidden="true">✦</span>;
  if (id === "terminal") return <span className="taskbar-icon taskbar-terminal-icon" aria-hidden="true">&gt;_</span>;
  if (id === "games") return <span className="taskbar-icon taskbar-games-icon" aria-hidden="true">＋</span>;
  return <span className="taskbar-icon taskbar-letter-icon" aria-hidden="true">{APPS[id].glyph.slice(0, 2)}</span>;
}

function DesktopArtifact({ kind, glyph }: { kind: "file" | "folder"; glyph: string }) {
  return (
    <span className={`desktop-artifact ${kind}`} aria-hidden="true">
      <span>{glyph}</span>
    </span>
  );
}

function MovableDesktopItem({ children }: { children: ReactNode }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragged = useRef(false);

  const beginMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || window.innerWidth < 760) return;
    dragged.current = false;
    const origin = { pointerX: event.clientX, pointerY: event.clientY, ...offset };
    const onMove = (moveEvent: PointerEvent) => {
      const x = origin.x + moveEvent.clientX - origin.pointerX;
      const y = origin.y + moveEvent.clientY - origin.pointerY;
      if (Math.abs(x - origin.x) + Math.abs(y - origin.y) > 5) dragged.current = true;
      setOffset({ x, y });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className="desktop-icon-slot"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={beginMove}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (!dragged.current) return;
        event.preventDefault();
        event.stopPropagation();
        dragged.current = false;
      }}
    >
      {children}
    </div>
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
      tabIndex={-1}
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
            if ((issue || results.length || draft) && !window.confirm("Clear the customer message and prepared draft?")) return;
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
  runInTerminal,
}: {
  onRouted: (count: number) => void;
  onDraftSaved: () => void;
  notify: (message: string) => void;
  openApp: (id: AppId) => void;
  runInTerminal: (command: string) => void;
}) {
  const [routerOpen, setRouterOpen] = useState(false);
  if (routerOpen) {
    return (
      <div className="website-folder-view">
        <nav className="folder-toolbar" aria-label="Support Router breadcrumb">
          <button onClick={() => setRouterOpen(false)}>← Support Router</button>
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
        <span className="folder-path">Public / Support Router</span>
      </header>
      <div className="folder-banner support-folder-banner">
        <DesktopArtifact kind="file" glyph="PY" />
        <div>
          <span className="app-eyebrow">Python support router</span>
          <h2>Run the CLI. Review before send.</h2>
          <p>The real script runs in Command Prompt. Delivery remains disabled.</p>
        </div>
      </div>
      <div className="support-action-list">
        <button className="primary" onClick={() => runInTerminal("python3 support_agent_router.py --help")}>
          <span className="support-action-index">01</span>
          <span><strong>Run the Python CLI</strong><small>Execute support_agent_router.py in Command Prompt</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button onClick={() => setRouterOpen(true)}>
          <span className="support-action-index">02</span>
          <span><strong>Open the reply builder</strong><small>Triage, draft, revise, and test the fail-closed send boundary</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button onClick={() => openApp("tools")}>
          <span className="support-action-index">03</span>
          <span><strong>Support Tools</strong><small>Timer, request IDs, backoff, and HTTP reference</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button onClick={() => openApp("help")}>
          <span className="support-action-index">04</span>
          <span><strong>Help & UX Review</strong><small>Safeguards, shortcuts, and heuristic checks</small></span>
          <span aria-hidden="true">→</span>
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

function FilesApp({
  notify,
  openApp,
  runInTerminal,
}: {
  notify: (message: string) => void;
  openApp: (id: AppId) => void;
  runInTerminal: (command: string) => void;
}) {
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
        <button className="active">Public</button>
        <button onClick={() => window.open("https://github.com/ryan-winkler", "_blank")}>GitHub ↗</button>
        <button onClick={() => window.open("https://ryanw.eu/", "_blank")}>ryanw.eu ↗</button>
      </aside>
      <div className="file-main">
        <header className="file-main-toolbar">
          <span>
            <strong>Public</strong>
            <small>Apps, exact source, tests, manual, and decision notes</small>
          </span>
          <a className="primary-button" href={DOWNLOAD_ARCHIVE} download>Download all (.zip)</a>
        </header>
        <div className="public-app-grid" aria-label="Public applications">
          {PUBLIC_APPS.filter((id) => id !== "files").map((id) => (
            <button key={id} onClick={() => openApp(id)}>
              <TaskbarIcon id={id} />
              <span>{APPS[id].title}</span>
            </button>
          ))}
          <button onClick={() => openApp("work")}>
            <TaskbarIcon id="work" />
            <span>Selected Work</span>
          </button>
          <button onClick={() => openApp("notes")}>
            <TaskbarIcon id="notes" />
            <span>PROCESS.md</span>
          </button>
          <a href="https://ryanw.eu/" target="_blank" rel="noreferrer">
            <DesktopArtifact kind="file" glyph="HTML" />
            <span>ryanw.eu</span>
          </a>
        </div>
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
              <span>
                {activeFile.name.endsWith(".py") && (
                  <button className="primary-button" onClick={() => runInTerminal(`python ${activeFile.name}`)}>Run</button>
                )}
                <a className="primary-button" href={activeFile.href} download>Download</a>
              </span>
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

function TerminalApp({
  openApp,
  request,
  windows,
  patchWindow,
}: {
  openApp: (id: AppId) => void;
  request: TerminalRequest | null;
  windows: Record<AppId, WindowState>;
  patchWindow: (id: AppId, patch: Partial<WindowState>) => void;
}) {
  const welcome = [
    "Ryan Support Workstation — real browser Python terminal",
    "The first Python command loads CPython and the shipped dependencies.",
    "Try: python3 support_agent_router.py --help",
    "Try: python test_pure.py",
    "Agents SDK calls use the real script. A key can be held in this worker session only.",
    "For the strongest protection, run locally with OPENAI_API_KEY instead.",
    "",
    'Type "help" for commands.',
  ];
  const [lines, setLines] = useState(welcome);
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState("Python runtime loads on demand");
  const [workingDirectory, setWorkingDirectory] = useState("/Users/ryan/Desktop");
  const [keyStatus, setKeyStatus] = useState("No session key loaded");
  const [terminalTone, setTerminalTone] = useState("blue");
  const [historyCursor, setHistoryCursor] = useState(-1);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<((result: PythonRunResult) => void) | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const commandHistoryRef = useRef<string[]>([]);
  const lastRequestRef = useRef(0);
  const executeRef = useRef<(input: string) => Promise<void>>(async () => undefined);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const ensureWorker = () => {
    let worker = workerRef.current;
    if (!worker) {
      worker = new Worker("/python-worker.mjs", { type: "module" });
      workerRef.current = worker;
      worker.onmessage = ({ data }: MessageEvent<{ type: string; message?: string } & PythonRunResult>) => {
        if (data.type === "progress") {
          setRuntimeStatus(data.message ?? "Working…");
          return;
        }
        if (data.type === "key-status") {
          setKeyStatus(data.message ?? "Session key updated");
          return;
        }
        pendingRef.current?.(data);
        pendingRef.current = null;
      };
      worker.onerror = () => {
        pendingRef.current?.({
          stdout: "",
          stderr: "The browser Python runtime could not start. Download the ZIP and run the command locally.",
          exitCode: 1,
        });
        pendingRef.current = null;
        workerRef.current?.terminate();
        workerRef.current = null;
      };
    }
    return worker;
  };

  const runPython = (input: string) =>
    new Promise<PythonRunResult>((resolve) => {
      const worker = ensureWorker();
      pendingRef.current = resolve;
      worker.postMessage({ type: "run", command: input });
    });

  const storeSessionKey = () => {
    const input = apiKeyInputRef.current;
    const apiKey = input?.value.trim() ?? "";
    if (!/^sk-[A-Za-z0-9_-]{16,}$/.test(apiKey) || apiKey.length > 512) {
      setKeyStatus("Enter a valid OpenAI key beginning with sk-");
      return;
    }
    ensureWorker().postMessage({ type: "set-key", apiKey });
    if (input) input.value = "";
    setKeyStatus("Session key loaded in the isolated worker");
  };

  const forgetSessionKey = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    pendingRef.current = null;
    if (apiKeyInputRef.current) apiKeyInputRef.current.value = "";
    setRuntimeStatus("Python runtime loads on demand");
    setKeyStatus("Session key forgotten; worker memory cleared");
  };

  const execute = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input || running) return;
    const displayInput = input.replace(/(--api-key(?:=|\s+))\S+/i, "$1[redacted]");
    setCommand("");
    commandHistoryRef.current = [...commandHistoryRef.current, displayInput].slice(-50);
    setHistoryCursor(-1);
    setLines((current) => [...current, `rw@support:${workingDirectory}$ ${displayInput}`]);
    const [rawName, ...args] = input.split(/\s+/);
    const name = rawName.toLowerCase();
    let output: string[] = [];
    if (/--api-key(?:=|\s+)/i.test(input)) {
      output = ["For safety, enter the key in the session-only field above instead of command history."];
    } else if (name === "python" || name === "python3") {
      setRunning(true);
      setRuntimeStatus("Starting Python…");
      const result = await runPython(input);
      output = [
        ...result.stdout.replace(/\s+$/, "").split("\n").filter(Boolean),
        ...result.stderr.replace(/\s+$/, "").split("\n").filter(Boolean),
        `[exit ${result.exitCode}]`,
      ];
      if (/OPENAI_API_KEY|api key/i.test(result.stderr) && keyStatus.startsWith("No session")) {
        output.push("Load a session-only key above, or run locally with OPENAI_API_KEY.");
      }
      setRunning(false);
    } else if (name === "help") {
      output = [
        "python3 support_agent_router.py --help",
        'python3 support_agent_router.py "429 during a burst" --give-reply auto',
        "python test_pure.py",
        "python test_support_agent_router.py",
        "",
        "Files: dir/ls · tree · pwd · cd <Desktop|Public> · cat/type <file> · find <text> · download <file>",
        "System: help · clear/cls · date · time · history · whoami · hostname · ver · neofetch · ipconfig",
        "Apps: open/start <app> · tasklist · taskkill <app> · manual · license · exit",
        "Support: route <issue> · status · color <blue|green|amber> · echo <text>",
      ];
    } else if (name === "ls" || name === "dir") {
      output = workingDirectory.endsWith("/Public")
        ? [...FILES.map((file) => file.name), "support-agent-router-interview.zip"]
        : ["support_agent_router.py", "test_pure.py", "test_support_agent_router.py", "Public/"];
    } else if (name === "tree") {
      output = [
        "Desktop/",
        "├── support_agent_router.py",
        "├── test_pure.py",
        "├── test_support_agent_router.py",
        "└── Public/  (apps, docs, README, manual, ZIP)",
      ];
    } else if (name === "pwd") output = [workingDirectory];
    else if (name === "cd") {
      const target = (args[0] ?? "").replace(/\/$/, "").toLowerCase();
      if (!target || target === "~" || target === "desktop" || target === "..") {
        setWorkingDirectory("/Users/ryan/Desktop");
        output = ["/Users/ryan/Desktop"];
      } else if (target === "public" || target.endsWith("/public")) {
        setWorkingDirectory("/Users/ryan/Desktop/Public");
        output = ["/Users/ryan/Desktop/Public"];
      } else output = ["Directory not found. Available: Desktop, Public"];
    }
    else if (name === "whoami") output = ["Ryan Winkler — AI Support Engineer (hopefully), Dublin"];
    else if (name === "hostname") output = ["RYAN-SUPPORT-WORKSTATION"];
    else if (name === "ver") output = ["Ryan Support Workstation 1.0 · browser runtime"];
    else if (name === "date") output = [new Date().toLocaleDateString("en-IE", { dateStyle: "full" })];
    else if (name === "time") output = [new Date().toLocaleTimeString("en-IE")];
    else if (name === "history") output = commandHistoryRef.current.map((item, index) => `${index + 1}  ${item}`);
    else if (name === "neofetch") output = [
      "Ryan Support Workstation",
      `Browser: ${navigator.userAgent.split(" ").slice(-2).join(" ")}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      `Python: ${runtimeStatus}`,
      "Role: AI Support Engineer (hopefully)",
    ];
    else if (name === "ipconfig") output = [
      `Connection: ${navigator.onLine ? "online" : "offline"}`,
      `Origin: ${window.location.origin}`,
      "Public IP is not inspected by this local workstation.",
    ];
    else if (name === "status") output = [`${runtimeStatus} · sending disabled · human review required`];
    else if (name === "route") {
      const issue = args.join(" ");
      output = issue ? [`${routeIssue(issue).route}: ${routeIssue(issue).action}`] : ["usage: route <customer issue>"];
    } else if (name === "cat" || name === "type") {
      const file = FILES.find(({ name: filename }) => filename === args[0]);
      if (!file) output = ["Choose a text file shown by ls."];
      else {
        try {
          const response = await fetch(file.href);
          if (!response.ok) throw new Error();
          output = (await response.text()).split("\n");
        } catch {
          output = [`Could not read ${file.name}.`];
        }
      }
    } else if (name === "find") {
      const query = args.join(" ").toLowerCase();
      output = query
        ? [
            ...FILES.filter((file) => file.name.toLowerCase().includes(query)).map((file) => file.name),
            ...PUBLIC_APPS.filter((id) => APPS[id].title.toLowerCase().includes(query)).map((id) => `${id} — ${APPS[id].title}`),
          ]
        : ["usage: find <text>"];
      if (query && !output.length) output = ["No matches."];
    } else if (name === "open" || name === "start") {
      const target = args[0] as AppId;
      if (target in APPS) {
        openApp(target);
        output = [`Opened ${APPS[target].title}`];
      } else output = ["Unknown app. Try: router, terminal, files, tools, games, doom, flash, about"];
    } else if (name === "tasklist") {
      output = (Object.keys(windows) as AppId[])
        .filter((id) => windows[id].open)
        .map((id) => `${id.padEnd(12)} ${windows[id].minimized ? "minimised" : "running"}`);
    } else if (name === "taskkill") {
      const target = args[0] as AppId;
      if (target in windows && target !== "terminal") {
        patchWindow(target, { open: false });
        output = [`Closed ${APPS[target].title}`];
      } else output = ["usage: taskkill <running app>; use exit to close this terminal"];
    } else if (name === "download") {
      const file = FILES.find(({ name: filename }) => filename === args[0]);
      if (file) {
        const anchor = document.createElement("a");
        anchor.href = file.href;
        anchor.download = file.name;
        anchor.click();
        output = [`Downloading ${file.name}`];
      } else if (args[0] === "all" || args[0]?.endsWith(".zip")) {
        const anchor = document.createElement("a");
        anchor.href = DOWNLOAD_ARCHIVE;
        anchor.download = "support-agent-router-interview.zip";
        anchor.click();
        output = ["Downloading project ZIP"];
      } else output = ["usage: download <file|all>"];
    } else if (name === "manual") {
      openApp("doom");
      output = ["Opened DOOM. Select “Open local manual” below the game."];
    } else if (name === "license") {
      openApp("files");
      output = ["Opened Public. Select ATTRIBUTIONS.md for project licences and credits."];
    } else if (name === "echo") output = [args.join(" ")];
    else if (name === "color") {
      const tone = args[0]?.toLowerCase();
      if (["blue", "green", "amber"].includes(tone)) {
        setTerminalTone(tone);
        output = [`Terminal colour set to ${tone}.`];
      } else output = ["usage: color <blue|green|amber>"];
    } else if (name === "clear" || name === "cls") {
      setLines([]);
      return;
    } else if (name === "exit") {
      patchWindow("terminal", { minimized: true });
      output = ["Terminal minimised."];
    } else if (name === "shutdown") {
      output = ["Shutdown is disabled in the browser workstation. Use exit to minimise Command Prompt."];
    } else output = [`Command not found: ${name}. Type "help".`];
    setLines((current) => [...current, ...output]);
  };

  useEffect(() => {
    executeRef.current = execute;
  });
  useEffect(() => {
    if (!request || request.id === lastRequestRef.current) return;
    lastRequestRef.current = request.id;
    void executeRef.current(request.command);
  }, [request]);

  const run = (event: FormEvent) => {
    event.preventDefault();
    void execute(command);
  };

  return (
    <div className={`terminal-app terminal-${terminalTone}`}>
      <header className="terminal-toolbar">
        <span className={running ? "working" : ""}>{runtimeStatus}</span>
        <div>
          <button onClick={() => void execute("python3 support_agent_router.py --help")} disabled={running}>CLI help</button>
          <button onClick={() => void execute('python3 support_agent_router.py "429 during a burst" --give-reply auto')} disabled={running}>Run sample</button>
          <button onClick={() => void execute("python test_pure.py")} disabled={running}>Pure tests</button>
          <button onClick={() => void execute("python test_support_agent_router.py")} disabled={running}>SDK tests</button>
        </div>
      </header>
      <details className="terminal-key-panel">
        <summary>OpenAI API key · session only</summary>
        <div>
          <input
            ref={apiKeyInputRef}
            type="password"
            autoComplete="off"
            spellCheck={false}
            aria-label="OpenAI API key held in worker memory for this tab only"
            placeholder="sk-…"
          />
          <button type="button" onClick={storeSessionKey}>Use for session</button>
          <button type="button" onClick={forgetSessionKey}>Forget key</button>
        </div>
        <p>{keyStatus}. Never saved to local storage, terminal history, logs, or source. Local OPENAI_API_KEY is safer.</p>
      </details>
      <div className="terminal-output" aria-live="polite">
        {lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
      </div>
      <form onSubmit={run}>
        <label htmlFor="terminal-command">rw@support:~$</label>
        <input
          id="terminal-command"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const history = commandHistoryRef.current;
            if (!history.length) return;
            const next = event.key === "ArrowUp"
              ? Math.min(history.length - 1, historyCursor + 1)
              : Math.max(-1, historyCursor - 1);
            setHistoryCursor(next);
            setCommand(next < 0 ? "" : history[history.length - 1 - next]);
          }}
          autoComplete="off"
          disabled={running}
          aria-label="Terminal command"
        />
      </form>
    </div>
  );
}

function DoomApp() {
  const [view, setView] = useState<"game" | "manual">("game");
  if (view === "manual") {
    return (
      <div className="doom-manual">
        <nav className="folder-toolbar" aria-label="DOOM manual navigation">
          <button onClick={() => setView("game")}>← Back to game</button>
          <span>/ MANUAL.md</span>
          <a className="folder-download" href="/downloads/MANUAL.md" download>Download</a>
        </nav>
        <article className="markdown-app">
          <h1>DOOM on JS-DOS User Manual</h1>
          <p className="markdown-meta">Local copy of the upstream MANUAL.md</p>
          <h2>Start the game</h2>
          <ol>
            <li>Select <strong>Click to start</strong> and wait for the game to load.</li>
            <li>Press any movement key after loading.</li>
            <li>Use the movement keys to navigate the game menu.</li>
            <li>Enjoy.</li>
          </ol>
          <h2>Game controls</h2>
          <dl className="manual-controls">
            <div><dt>Move</dt><dd>Up, Down, Left, Right</dd></div>
            <div><dt>Use</dt><dd>W</dd></div>
            <div><dt>Fire</dt><dd>S</dd></div>
            <div><dt>Speed</dt><dd>Space</dd></div>
            <div><dt>Strafe mode</dt><dd>Alt</dd></div>
            <div><dt>Strafe</dt><dd>A, D</dd></div>
            <div><dt>Change weapon</dt><dd>1, 2, 3, 4, 5, 6, 7</dd></div>
          </dl>
          <p>
            Source: <a href="https://github.com/thedoggybrad/doom_on_js-dos/blob/main/MANUAL.MD" target="_blank" rel="noreferrer">
              thedoggybrad/doom_on_js-dos MANUAL.md ↗
            </a>
          </p>
        </article>
      </div>
    );
  }
  return (
    <div className="doom-app">
      <iframe
        src="/doom/index.html"
        title="DOOM running in js-dos"
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-pointer-lock allow-popups allow-downloads"
      />
      <aside>
        <span>Desktop only · click the game panel to start</span>
        <button onClick={() => setView("manual")}>Open local manual</button>
      </aside>
    </div>
  );
}

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

function gameWinner(board: string[]) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "Draw" : "";
}

function GamesApp({ openApp }: { openApp: (id: AppId) => void }) {
  const [view, setView] = useState<"folder" | "noughts" | "memory">("folder");
  if (view === "noughts") return <NoughtsAndCrosses onBack={() => setView("folder")} />;
  if (view === "memory") return <IncidentMemory onBack={() => setView("folder")} />;
  return (
    <div className="website-folder">
      <header className="folder-toolbar">
        <button disabled>←</button>
        <button disabled>→</button>
        <button disabled>↑</button>
        <span className="folder-path">Desktop / Games</span>
      </header>
      <div className="folder-banner games-folder-banner">
        <span className="profile-mark">GAME</span>
        <div>
          <span className="app-eyebrow">Short breaks, clean resets</span>
          <h2>Three ways to step away.</h2>
          <p>One preserved classic and two original local games.</p>
        </div>
      </div>
      <div className="folder-grid games-grid">
        <button onClick={() => openApp("doom")}>
          <AppGlyph glyph="D00M" />
          <span><strong>DOOM</strong><small>Open the requested js-dos build</small></span>
        </button>
        <button onClick={() => setView("noughts")}>
          <AppGlyph glyph="X/O" />
          <span><strong>Noughts & Crosses</strong><small>Two-player local board</small></span>
        </button>
        <button onClick={() => setView("memory")}>
          <AppGlyph glyph="PAIR" />
          <span><strong>Incident Memory</strong><small>Match support signals</small></span>
        </button>
      </div>
      <footer className="folder-status">3 games · Local games keep no scores or personal data</footer>
    </div>
  );
}

function calculateExpression(input: string) {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return "Use two numbers and +, -, *, or /.";
  const left = Number(match[1]);
  const right = Number(match[3]);
  if (match[2] === "/" && right === 0) return "Cannot divide by zero.";
  const result = match[2] === "+"
    ? left + right
    : match[2] === "-"
      ? left - right
      : match[2] === "*"
        ? left * right
        : left / right;
  return Number.isFinite(result) ? String(Number(result.toFixed(8))) : "Result is outside the supported range.";
}

function UtilitiesApp({ wallpaper, setWallpaper }: { wallpaper: Wallpaper; setWallpaper: (wallpaper: Wallpaper) => void }) {
  const [view, setView] = useState<
    "folder" | "scratchpad" | "calculator" | "images" | "system" | "code" | "browser" | "media" | "camera" | "wallpaper" | "paint"
  >("folder");
  if (view === "scratchpad") return <Scratchpad onBack={() => setView("folder")} />;
  if (view === "calculator") return <Calculator onBack={() => setView("folder")} />;
  if (view === "images") return <ImageViewer onBack={() => setView("folder")} />;
  if (view === "system") return <SystemMonitor onBack={() => setView("folder")} />;
  if (view === "code") return <CodeLab onBack={() => setView("folder")} />;
  if (view === "browser") return <LinkBrowser onBack={() => setView("folder")} />;
  if (view === "media") return <MediaDeck onBack={() => setView("folder")} />;
  if (view === "camera") return <CameraApp onBack={() => setView("folder")} />;
  if (view === "wallpaper") return <WallpaperStudio onBack={() => setView("folder")} wallpaper={wallpaper} setWallpaper={setWallpaper} />;
  if (view === "paint") return <PaintApp onBack={() => setView("folder")} />;
  return (
    <div className="website-folder">
      <header className="folder-toolbar">
        <button disabled>←</button>
        <button disabled>→</button>
        <button disabled>↑</button>
        <span className="folder-path">Desktop / Utilities</span>
      </header>
      <div className="folder-banner utilities-folder-banner">
        <span className="profile-mark">UTIL</span>
        <div>
          <span className="app-eyebrow">Local workstation utilities</span>
          <h2>Small tools that do real work.</h2>
          <p>No accounts, uploads, tracking, or pretend integrations.</p>
        </div>
      </div>
      <div className="folder-grid utilities-grid">
        <button onClick={() => setView("scratchpad")}>
          <AppGlyph glyph="TXT" />
          <span><strong>Scratchpad</strong><small>Write, save locally, or download a note</small></span>
        </button>
        <button onClick={() => setView("calculator")}>
          <AppGlyph glyph="1+1" />
          <span><strong>Calculator</strong><small>Evaluate a simple arithmetic expression</small></span>
        </button>
        <button onClick={() => setView("images")}>
          <AppGlyph glyph="IMG" />
          <span><strong>Image Viewer</strong><small>Inspect the supplied wallpaper and profile card</small></span>
        </button>
        <button onClick={() => setView("system")}>
          <AppGlyph glyph="SYS" />
          <span><strong>System Monitor</strong><small>Inspect this browser session without collecting data</small></span>
        </button>
        <button onClick={() => setView("code")}>
          <AppGlyph glyph="&lt;/&gt;" />
          <span><strong>Code Lab</strong><small>Edit and run a sandboxed HTML page</small></span>
        </button>
        <button onClick={() => setView("browser")}>
          <AppGlyph glyph="WEB" />
          <span><strong>Web Links</strong><small>Open useful support and portfolio destinations</small></span>
        </button>
        <button onClick={() => setView("media")}>
          <AppGlyph glyph="AV" />
          <span><strong>Media Deck</strong><small>Play a local audio or video file</small></span>
        </button>
        <button onClick={() => setView("camera")}>
          <AppGlyph glyph="CAM" />
          <span><strong>Camera</strong><small>Preview and capture locally with permission</small></span>
        </button>
        <button onClick={() => setView("wallpaper")}>
          <AppGlyph glyph="BG" />
          <span><strong>Wallpaper Studio</strong><small>Switch between the supplied and alternate desktop</small></span>
        </button>
        <button onClick={() => setView("paint")}>
          <AppGlyph glyph="ART" />
          <span><strong>Paint</strong><small>Draw on a local canvas and download it</small></span>
        </button>
      </div>
      <footer className="folder-status">10 utilities · Data stays in this browser</footer>
    </div>
  );
}

function UtilityShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="utility-app">
      <nav className="folder-toolbar"><button onClick={onBack}>← Utilities</button><span>/ {title}</span></nav>
      {children}
    </div>
  );
}

function Scratchpad({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("# Support scratchpad\n\nRequest ID:\nUTC timestamp:\nExpected:\nObserved:\n");
  const [status, setStatus] = useState("Not saved");
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <UtilityShell title="Scratchpad.md" onBack={onBack}>
      <div className="scratchpad-toolbar">
        <span>{wordCount} words · {text.length} characters</span>
        <div>
          <button onClick={() => {
            localStorage.setItem("rw-support-scratchpad", text);
            setStatus("Saved in this browser");
          }}>Save local</button>
          <button onClick={() => {
            const saved = localStorage.getItem("rw-support-scratchpad");
            if (saved !== null) {
              setText(saved);
              setStatus("Loaded local note");
            } else setStatus("No local note found");
          }}>Load local</button>
          <button onClick={() => downloadText("support-scratchpad.md", text)}>Download</button>
        </div>
      </div>
      <textarea className="scratchpad-area" value={text} onChange={(event) => {
        setText(event.target.value);
        setStatus("Not saved");
      }} aria-label="Support scratchpad" spellCheck />
      <footer className="utility-status">{status}</footer>
    </UtilityShell>
  );
}

function Calculator({ onBack }: { onBack: () => void }) {
  const [expression, setExpression] = useState("429 / 3");
  const [result, setResult] = useState("143");
  return (
    <UtilityShell title="Calculator" onBack={onBack}>
      <section className="calculator-app">
        <span className="app-eyebrow">Simple arithmetic</span>
        <label>
          <span>Expression</span>
          <input value={expression} onChange={(event) => setExpression(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") setResult(calculateExpression(expression));
          }} />
        </label>
        <output>{result}</output>
        <button className="primary-button" onClick={() => setResult(calculateExpression(expression))}>Calculate</button>
        <p>Supports two numbers and one operator: +, -, *, or /.</p>
      </section>
    </UtilityShell>
  );
}

function ImageViewer({ onBack }: { onBack: () => void }) {
  const images = [
    { name: "Generated image 1.png", src: "/wallpaper.png", width: 1672, height: 941 },
    { name: "codex-profile-card.png", src: "/ryan-profile-card.png", width: 998, height: 612 },
  ];
  const [selected, setSelected] = useState(0);
  const image = images[selected];
  return (
    <UtilityShell title="Image Viewer" onBack={onBack}>
      <div className="image-viewer-app">
        <aside>
          {images.map((item, index) => (
            <button key={item.name} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}>
              <Image src={item.src} width={120} height={72} alt="" />
              <span>{item.name}</span>
            </button>
          ))}
        </aside>
        <figure>
          <Image src={image.src} width={image.width} height={image.height} alt={image.name} />
          <figcaption>{image.name} · {image.width} × {image.height}</figcaption>
        </figure>
      </div>
    </UtilityShell>
  );
}

function SystemMonitor({ onBack }: { onBack: () => void }) {
  const inspect = () => ({
    connection: navigator.onLine ? "Online" : "Offline",
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    localItems: String(localStorage.length),
    session: formatDuration(Math.floor(performance.now() / 1000)),
  });
  const [metrics, setMetrics] = useState({ connection: "Select refresh", viewport: "—", localItems: "—", session: "—" });
  return (
    <UtilityShell title="System Monitor" onBack={onBack}>
      <section className="system-monitor">
        <header>
          <div><span className="app-eyebrow">Browser session only</span><h2>Workstation status</h2></div>
          <button className="primary-button" onClick={() => setMetrics(inspect())}>Refresh</button>
        </header>
        <dl>
          <div><dt>Connection</dt><dd>{metrics.connection}</dd></div>
          <div><dt>Viewport</dt><dd>{metrics.viewport}</dd></div>
          <div><dt>Local data items</dt><dd>{metrics.localItems}</dd></div>
          <div><dt>Page uptime</dt><dd>{metrics.session}</dd></div>
        </dl>
        <p>No metrics leave the browser. Refresh reads only the current page and local storage count.</p>
      </section>
    </UtilityShell>
  );
}

function CodeLab({ onBack }: { onBack: () => void }) {
  const initial = `<main>
  <h1>Support signal</h1>
  <p>Turn evidence into the next useful action.</p>
</main>
<style>
  body { margin: 0; padding: 2rem; background: #0b1422; color: #eef5ff; font: 16px system-ui; }
  h1 { color: #8dbaff; }
</style>`;
  const [source, setSource] = useState(initial);
  const [preview, setPreview] = useState(initial);
  return (
    <UtilityShell title="Code Lab" onBack={onBack}>
      <div className="code-lab">
        <div className="code-lab-toolbar">
          <span>Sandboxed HTML preview</span>
          <div>
            <button onClick={() => { setSource(initial); setPreview(initial); }}>Reset</button>
            <button className="primary-button" onClick={() => setPreview(source)}>Run</button>
          </div>
        </div>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} aria-label="HTML source" />
        <iframe title="Code Lab preview" sandbox="allow-scripts" srcDoc={preview} />
      </div>
    </UtilityShell>
  );
}

function LinkBrowser({ onBack }: { onBack: () => void }) {
  const [address, setAddress] = useState("https://ryanw.eu/");
  const [error, setError] = useState("");
  const openAddress = () => {
    try {
      const url = new URL(address);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      window.open(url.href, "_blank", "noopener,noreferrer");
      setError("");
    } catch {
      setError("Enter a complete http:// or https:// address.");
    }
  };
  const links = [
    ["ryanw.eu", "https://ryanw.eu/"],
    ["Ryan on GitHub", "https://github.com/ryan-winkler"],
    ["OpenAI Developer Docs", "https://developers.openai.com/api/docs"],
    ["OpenAI Cookbook", "https://developers.openai.com/cookbook"],
    ["OpenAI Learn", "https://developers.openai.com/learn"],
  ];
  return (
    <UtilityShell title="Web Links" onBack={onBack}>
      <section className="link-browser">
        <form onSubmit={(event) => { event.preventDefault(); openAddress(); }}>
          <input value={address} onChange={(event) => setAddress(event.target.value)} aria-label="Web address" />
          <button className="primary-button">Open ↗</button>
        </form>
        {error && <p className="utility-error">{error}</p>}
        <div>
          {links.map(([label, href]) => (
            <button key={href} onClick={() => { setAddress(href); window.open(href, "_blank", "noopener,noreferrer"); }}>
              <span>↗</span><strong>{label}</strong><small>{href}</small>
            </button>
          ))}
        </div>
      </section>
    </UtilityShell>
  );
}

function MediaDeck({ onBack }: { onBack: () => void }) {
  const [media, setMedia] = useState<{ url: string; kind: "audio" | "video"; name: string } | null>(null);
  useEffect(() => () => {
    if (media) URL.revokeObjectURL(media.url);
  }, [media]);
  return (
    <UtilityShell title="Media Deck" onBack={onBack}>
      <section className="media-deck">
        <header>
          <div><span className="app-eyebrow">Local playback</span><h2>{media?.name ?? "Choose a file"}</h2></div>
          <label className="primary-button">
            Open media
            <input type="file" accept="audio/*,video/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (media) URL.revokeObjectURL(media.url);
              setMedia({ url: URL.createObjectURL(file), kind: file.type.startsWith("video/") ? "video" : "audio", name: file.name });
            }} />
          </label>
        </header>
        {media?.kind === "video" && <video src={media.url} controls />}
        {media?.kind === "audio" && <audio src={media.url} controls />}
        {!media && <div className="media-empty"><AppGlyph glyph="AV" /><p>Files play from memory and are never uploaded.</p></div>}
      </section>
    </UtilityShell>
  );
}

function CameraApp({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("Camera is off");
  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("Camera is off");
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera access is unavailable in this browser");
      return;
    }
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("Camera is on · preview stays local");
    } catch {
      setStatus("Camera permission was not granted");
    }
  };
  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setStatus("Start the camera before capturing");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "camera-capture.png";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("Capture downloaded");
    }, "image/png");
  };
  return (
    <UtilityShell title="Camera" onBack={onBack}>
      <section className="camera-app">
        <video ref={videoRef} autoPlay muted playsInline />
        <div>
          <span>{status}</span>
          <nav>
            <button onClick={() => void start()}>Start camera</button>
            <button onClick={capture}>Capture</button>
            <button onClick={stop}>Stop</button>
          </nav>
        </div>
      </section>
    </UtilityShell>
  );
}

function WallpaperStudio({
  onBack,
  wallpaper,
  setWallpaper,
}: {
  onBack: () => void;
  wallpaper: Wallpaper;
  setWallpaper: (wallpaper: Wallpaper) => void;
}) {
  return (
    <UtilityShell title="Wallpaper Studio" onBack={onBack}>
      <section className="wallpaper-studio">
        <header><span className="app-eyebrow">Desktop appearance</span><h2>Choose a workspace.</h2></header>
        <div>
          <button className={wallpaper === "sunset" ? "active" : ""} onClick={() => setWallpaper("sunset")}>
            <Image src="/wallpaper.png" width={480} height={270} alt="Sunset ocean wallpaper" />
            <span><strong>Input to meaning</strong><small>Supplied project image</small></span>
          </button>
          <button className={`teal-wallpaper-choice ${wallpaper === "teal" ? "active" : ""}`} onClick={() => setWallpaper("teal")}>
            <span className="wallpaper-swatch-teal" />
            <span><strong>Teal geometry</strong><small>Original alternate</small></span>
          </button>
        </div>
      </section>
    </UtilityShell>
  );
}

function PaintApp({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [colour, setColour] = useState("#76a9ff");
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 6;
    context.strokeStyle = colour;
    context.lineTo(
      (event.clientX - bounds.left) * (canvas.width / bounds.width),
      (event.clientY - bounds.top) * (canvas.height / bounds.height),
    );
    context.stroke();
  };
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#07101d";
    context.fillRect(0, 0, canvas.width, canvas.height);
  };
  const download = () => {
    const anchor = document.createElement("a");
    anchor.href = canvasRef.current?.toDataURL("image/png") ?? "";
    anchor.download = "support-sketch.png";
    anchor.click();
  };
  return (
    <UtilityShell title="Paint" onBack={onBack}>
      <section className="paint-app">
        <header>
          <label>Colour <input type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></label>
          <div><button onClick={clear}>Clear</button><button className="primary-button" onClick={download}>Download PNG</button></div>
        </header>
        <canvas
          ref={canvasRef}
          width="900"
          height="520"
          onPointerDown={(event) => {
            drawingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            const context = event.currentTarget.getContext("2d");
            if (!context) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            context.beginPath();
            context.moveTo(
              (event.clientX - bounds.left) * (event.currentTarget.width / bounds.width),
              (event.clientY - bounds.top) * (event.currentTarget.height / bounds.height),
            );
          }}
          onPointerMove={draw}
          onPointerUp={() => { drawingRef.current = false; }}
          onPointerCancel={() => { drawingRef.current = false; }}
          aria-label="Drawing canvas"
        />
      </section>
    </UtilityShell>
  );
}

function NoughtsAndCrosses({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState(() => Array<string>(9).fill(""));
  const winner = gameWinner(board);
  const turn = board.filter(Boolean).length % 2 === 0 ? "X" : "O";
  return (
    <div className="mini-game">
      <nav className="folder-toolbar"><button onClick={onBack}>← Games</button><span>/ Noughts & Crosses</span></nav>
      <section>
        <header>
          <span className="app-eyebrow">Local two-player game</span>
          <h2>{winner ? winner === "Draw" ? "Draw game" : `${winner} wins` : `${turn}'s turn`}</h2>
        </header>
        <div className="noughts-board" aria-label="Noughts and Crosses board">
          {board.map((cell, index) => (
            <button
              key={index}
              aria-label={`Square ${index + 1}${cell ? `: ${cell}` : ""}`}
              disabled={Boolean(cell || winner)}
              onClick={() => setBoard((current) => current.map((value, cellIndex) => cellIndex === index ? turn : value))}
            >
              {cell}
            </button>
          ))}
        </div>
        <button className="quiet-button" onClick={() => setBoard(Array(9).fill(""))}>New game</button>
      </section>
    </div>
  );
}

const MEMORY_SIGNALS = ["429", "500", "TTFT", "TOKENS", "CACHE", "REQ_ID"];

function shuffledSignals() {
  return [...MEMORY_SIGNALS, ...MEMORY_SIGNALS]
    .map((value) => ({ value, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ value }, index) => ({ id: index, value }));
}

function IncidentMemory({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState(shuffledSignals);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  useEffect(() => {
    if (open.length !== 2) return;
    const [first, second] = open;
    if (cards[first].value === cards[second].value) {
      const timer = window.setTimeout(() => {
        setMatched((current) => [...current, first, second]);
        setOpen([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setOpen([]), 650);
    return () => window.clearTimeout(timer);
  }, [cards, open]);

  const reset = () => {
    setCards(shuffledSignals());
    setOpen([]);
    setMatched([]);
  };

  return (
    <div className="mini-game">
      <nav className="folder-toolbar"><button onClick={onBack}>← Games</button><span>/ Incident Memory</span></nav>
      <section>
        <header>
          <span className="app-eyebrow">Match the support signals</span>
          <h2>{matched.length === cards.length ? "Board cleared" : `${matched.length / 2} of ${cards.length / 2} pairs`}</h2>
        </header>
        <div className="memory-board" aria-label="Incident Memory board">
          {cards.map((card, index) => {
            const revealed = open.includes(index) || matched.includes(index);
            return (
              <button
                key={card.id}
                className={revealed ? "revealed" : ""}
                disabled={revealed || open.length === 2}
                aria-label={revealed ? card.value : `Hidden card ${index + 1}`}
                onClick={() => setOpen((current) => [...current, index])}
              >
                {revealed ? card.value : "?"}
              </button>
            );
          })}
        </div>
        <button className="quiet-button" onClick={reset}>Shuffle and restart</button>
      </section>
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
      <h2>Dustin Brett / daedalOS</h2>
      <p>
        <strong>daedalOS by Dustin Brett</strong> is a direct design and interaction reference. Its desktop metaphor,
        window management, Start experience, taskbar focus states, and system-tray detail established the quality bar
        for this original implementation.
      </p>
      <p>
        MIT License · Copyright © 2020 Dustin Brett ·{" "}
        <a href="https://github.com/DustinBrett/daedalOS" target="_blank" rel="noreferrer">Project and licence ↗</a>
      </p>
      <h2>jsagayap / CoffeeOS</h2>
      <p>
        <strong>CoffeeOS by jsagayap</strong> is a direct design reference for the approachable file-and-folder desktop
        conventions used here.
      </p>
      <p>
        MIT License · Copyright © 2022 jsagayap ·{" "}
        <a href="https://github.com/jsagayap/CoffeeOS" target="_blank" rel="noreferrer">Project and licence ↗</a>
      </p>
      <p>No daedalOS or CoffeeOS source code, marks, or bundled assets are copied here.</p>
      <h2>awesome-web-desktops</h2>
      <p>
        Used for comparative research ·{" "}
        <a href="https://github.com/syxanash/awesome-web-desktops" target="_blank" rel="noreferrer">Project ↗</a>
      </p>
      <h2>Hyggshi OS Web Edition</h2>
      <p>
        <strong>Hyggshi OS Web Edition by HyggshiOSDeveloper</strong> was researched as a direct functional-inventory
        reference for common browser-desktop applications. This workstation implements its own support-specific editors,
        local media tools, camera, settings, and widgets from scratch; no Hyggshi OS source code or assets are copied.
      </p>
      <p>
        HOSL-1.2 custom non-commercial licence · Copyright © 2025–2026 Hyggshi-os-website ·{" "}
        <a href="https://github.com/HyggshiOSDeveloper/hyggshi-os-website" target="_blank" rel="noreferrer">Project and licence ↗</a>
      </p>
      <h2>Badger Badger Badger</h2>
      <p>
        Animation and music by <strong>Jonti Picking (Weebl)</strong>. This site embeds the preservation page from
        <code> badgerbadgerbadger.com</code>; it does not copy or redistribute the animation or audio.
      </p>
      <p><a href="https://weebls-stuff.com/toons/badgers/" target="_blank" rel="noreferrer">Official creator page ↗</a></p>
      <h2>DOOM on js-dos</h2>
      <p>
        A small original local launcher loads the upstream JS-DOS script, cover image, and game archive from
        <code> thedoggybrad/doom_on_js-dos</code>, whose wrapper repository is MIT-licensed. Its visible manual link
        opens this site’s local copy. DOOM game content and marks remain the property of their respective rights holders;
        this project does not redistribute the game archive.
      </p>
      <p><a href="https://github.com/thedoggybrad/doom_on_js-dos" target="_blank" rel="noreferrer">Source and licence ↗</a></p>
      <h2>Pyodide</h2>
      <p>
        The browser terminal runs the shipped Python files with Pyodide: CPython compiled to WebAssembly.
        Pyodide is provided under the Mozilla Public License 2.0.
      </p>
      <p><a href="https://pyodide.org/" target="_blank" rel="noreferrer">Project ↗</a></p>
      <h2>OpenAI</h2>
      <p>
        The downloadable CLI uses the OpenAI Agents SDK. Specialist learning links are restricted to official OpenAI Developer Docs,
        Cookbook, and Learn pages. The supplied wallpaper and profile card are project assets provided by Ryan.
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
        The three Python files and one Public folder stay visible. Portfolio, tools, games, and documentation live inside Public. The three open windows show the interview story at a glance: a human break, the working CLI, and the rationale.
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
      <Image
        className="codex-profile-card"
        src="/ryan-profile-card.png"
        width="998"
        height="612"
        alt="Ryan's Codex profile card showing activity and usage statistics"
      />
      <header className="profile-hero">
        <div className="profile-mark">RW</div>
        <div>
          <span className="app-eyebrow">AI Support Engineer (hopefully) · Dublin</span>
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
          <button onClick={() => setView("folder")}>← About me</button>
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
        <span className="folder-path">Desktop / About me</span>
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
