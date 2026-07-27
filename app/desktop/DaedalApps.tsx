"use client";

import {
  PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { APP_REGISTRY, type AppId } from "./appRegistry";

type SupportedAppId = Exclude<
  AppId,
  | "doom"
  | "games"
  | "utilities"
  | "flash"
  | "router"
  | "tools"
  | "files"
  | "terminal"
  | "about"
  | "work"
  | "notes"
  | "help"
>;

const EXTERNAL_APPS: Partial<
  Record<SupportedAppId, { url: string; note: string }>
> = {
  irc: {
    url: "https://dustinbrett.com/?app=IRC",
    note: "KiwiIRC through the attributed daedalOS implementation.",
  },
  classicube: {
    url: "https://dustinbrett.com/?app=ClassiCube",
    note: "ClassiCube through the attributed daedalOS implementation.",
  },
  dxball: {
    url: "https://dustinbrett.com/?app=DXBall",
    note: "DX-Ball opens in the attributed daedalOS implementation.",
  },
  spacecadet: {
    url: "https://dustinbrett.com/?app=SpaceCadet",
    note: "Space Cadet opens in the attributed daedalOS implementation.",
  },
  quake3: {
    url: "https://dustinbrett.com/?app=Quake3",
    note: "Quake III opens in the attributed daedalOS implementation.",
  },
  tic80: {
    url: "https://dustinbrett.com/?app=Tic80",
    note: "TIC-80 through the attributed daedalOS implementation.",
  },
  stable: {
    url: "https://dustinbrett.com/?app=StableDiffusion",
    note: "The browser Stable Diffusion workspace opens in daedalOS.",
  },
  emulator: {
    url: "https://dustinbrett.com/?app=Emulator",
    note: "EmulatorJS through the attributed daedalOS implementation.",
  },
  v86: {
    url: "https://dustinbrett.com/?app=V86",
    note: "Virtual x86 through the attributed daedalOS implementation.",
  },
  boxedwine: {
    url: "https://dustinbrett.com/?app=BoxedWine",
    note: "BoxedWine through the attributed daedalOS implementation.",
  },
};

function download(filename: string, data: BlobPart, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function useObjectUrl() {
  const [value, setValue] = useState<{ name: string; url: string } | null>(null);
  useEffect(() => () => {
    if (value) URL.revokeObjectURL(value.url);
  }, [value]);
  return [
    value,
    (file: File) => {
      if (value) URL.revokeObjectURL(value.url);
      setValue({ name: file.name, url: URL.createObjectURL(file) });
    },
  ] as const;
}

function FileButton({
  accept,
  children,
  onFile,
}: {
  accept?: string;
  children: ReactNode;
  onFile: (file: File) => void;
}) {
  return (
    <label className="desktop-app-button">
      {children}
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function BrowserApp() {
  const [address, setAddress] = useState("/downloads/README.md");
  const [page, setPage] = useState("/downloads/README.md");
  const navigate = () => {
    try {
      const url = new URL(address, window.location.href);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      if (url.origin === window.location.origin) setPage(url.href);
      else window.open(url.href, "_blank", "noopener,noreferrer");
    } catch {
      setAddress("/downloads/README.md");
    }
  };
  return (
    <div className="desktop-app browser-workspace">
      <form
        className="desktop-app-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          navigate();
        }}
      >
        <button type="button" onClick={() => history.back()} aria-label="Back">←</button>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          aria-label="Address"
        />
        <button>Go</button>
      </form>
      <iframe title="Browser content" src={page} sandbox="allow-same-origin" />
      <footer>External addresses open in a new tab without access to this workstation.</footer>
    </div>
  );
}

function DevToolsApp() {
  const [refresh, setRefresh] = useState(0);
  const [loadedIn, setLoadedIn] = useState("select Refresh to measure");
  const [command, setCommand] = useState("performance.now()");
  const [result, setResult] = useState("Run a safe diagnostic expression.");
  const diagnostics =
    typeof window === "undefined"
      ? []
      : [
          ["Page", window.location.pathname],
          ["Viewport", `${window.innerWidth} × ${window.innerHeight}`],
          ["Online", navigator.onLine ? "yes" : "no"],
          ["Storage items", String(localStorage.length)],
          ["Heap", "memory" in performance ? "available" : "not exposed"],
          ["Loaded in", loadedIn],
        ];
  const run = () => {
    const allowed: Record<string, () => string> = {
      "performance.now()": () => `${performance.now().toFixed(2)} ms`,
      "location.href": () => location.href,
      "navigator.userAgent": () => navigator.userAgent,
      "localStorage.length": () => String(localStorage.length),
      "document.title": () => document.title,
    };
    setResult(allowed[command]?.() ?? "Blocked: choose one of the safe expressions.");
  };
  return (
    <div className="desktop-app devtools-workspace">
      <nav className="desktop-app-tabs"><strong>Console</strong><span>Network</span><span>Storage</span><button onClick={() => { setRefresh((value) => value + 1); setLoadedIn(`${Math.round(performance.now())} ms`); }}>Refresh</button></nav>
      <dl key={refresh}>{diagnostics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <form onSubmit={(event) => { event.preventDefault(); run(); }}>
        <span>&gt;</span>
        <input list="safe-devtools-commands" value={command} onChange={(event) => setCommand(event.target.value)} />
        <datalist id="safe-devtools-commands">
          {["performance.now()", "location.href", "navigator.userAgent", "localStorage.length", "document.title"].map((item) => <option key={item} value={item} />)}
        </datalist>
        <button>Run</button>
      </form>
      <pre>{result}</pre>
    </div>
  );
}

declare global {
  interface Window {
    require?: {
      config: (value: { paths: Record<string, string> }) => void;
      (modules: string[], ready: () => void): void;
    };
    monaco?: {
      editor: {
        create: (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => { getValue: () => string; dispose: () => void };
      };
    };
    tinymce?: {
      init: (options: Record<string, unknown>) => Promise<unknown[]>;
      get: (id: string) => { getContent: () => string } | null;
      remove: (selector: string) => void;
    };
    RufflePlayer?: {
      newest: () => {
        createPlayer: () => HTMLElement & {
          load: (value: { url: string }) => Promise<void>;
        };
      };
    };
  }
}

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)));
    document.head.append(script);
  });
}

const DEFAULT_PYTHON = `from agents import Agent, Runner

agent = Agent(
    name="RateLimitAgent",
    instructions="Give a concise answer and recommended next action.",
)

# Runner.run_sync(agent, "429 during a burst")
`;

function MonacoApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{ getValue: () => string; dispose: () => void } | null>(null);
  const [status, setStatus] = useState("Loading Monaco…");
  useEffect(() => {
    let cancelled = false;
    void loadScript(
      "monaco-loader",
      "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js",
    )
      .then(() => {
        if (cancelled || !window.require || !hostRef.current) return;
        window.require.config({
          paths: {
            vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
          },
        });
        window.require(["vs/editor/editor.main"], () => {
          if (cancelled || !window.monaco || !hostRef.current) return;
          editorRef.current = window.monaco.editor.create(hostRef.current, {
            value: DEFAULT_PYTHON,
            language: "python",
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
          });
          setStatus("support_agent_router.py · Python");
        });
      })
      .catch(() => setStatus("Monaco could not load. Check the network connection."));
    return () => {
      cancelled = true;
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);
  return (
    <div className="desktop-app editor-workspace">
      <nav className="desktop-app-toolbar">
        <strong>support_agent_router.py</strong>
        <button onClick={() => download("support_agent_router.py", editorRef.current?.getValue() ?? DEFAULT_PYTHON)}>Save copy</button>
      </nav>
      <div ref={hostRef} className="monaco-host" />
      <footer>{status}</footer>
    </div>
  );
}

function TinyMCEApp() {
  const id = "desktop-tinymce-editor";
  const [status, setStatus] = useState("Loading TinyMCE…");
  useEffect(() => {
    void loadScript(
      "tinymce-runtime",
      "https://cdn.jsdelivr.net/npm/tinymce@7.9.1/tinymce.min.js",
    )
      .then(async () => {
        if (!window.tinymce) return;
        await window.tinymce.init({
          selector: `#${id}`,
          license_key: "gpl",
          height: "100%",
          menubar: true,
          skin: "oxide-dark",
          content_css: "dark",
          plugins: "lists link code table wordcount",
          toolbar: "undo redo | blocks | bold italic | bullist numlist | link table | code",
        });
        setStatus("Ready · TinyMCE GPL build");
      })
      .catch(() => setStatus("TinyMCE could not load. Check the network connection."));
    return () => window.tinymce?.remove(`#${id}`);
  }, []);
  return (
    <div className="desktop-app editor-workspace tinymce-workspace">
      <nav className="desktop-app-toolbar">
        <strong>Customer reply</strong>
        <button onClick={() => download("customer-reply.html", window.tinymce?.get(id)?.getContent() ?? "")}>Export HTML</button>
      </nav>
      <textarea id={id} defaultValue="<h2>Prepared reply</h2><p>Thanks for getting in touch.</p>" />
      <footer>{status}</footer>
    </div>
  );
}

function PdfApp() {
  const [file, setFile] = useObjectUrl();
  return (
    <div className="desktop-app file-viewer-workspace">
      <nav className="desktop-app-toolbar">
        <strong>{file?.name ?? "PDF Viewer"}</strong>
        <FileButton accept="application/pdf" onFile={setFile}>Open PDF</FileButton>
        {file && <a href={file.url} download={file.name}>Download</a>}
      </nav>
      {file ? <iframe title={file.name} src={file.url} /> : <div className="desktop-app-empty"><strong>Open a local PDF</strong><p>The file stays in browser memory.</p></div>}
    </div>
  );
}

function markdownToHtml(source: string) {
  return source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      return line ? `<p>${line}</p>` : "";
    })
    .join("");
}

function MarkedApp() {
  const [source, setSource] = useState("# Support router\n\n- Triage first\n- Exactly one specialist\n- Human review before send");
  return (
    <div className="desktop-app marked-workspace">
      <textarea value={source} onChange={(event) => setSource(event.target.value)} aria-label="Markdown source" />
      <article dangerouslySetInnerHTML={{ __html: markdownToHtml(source) }} />
    </div>
  );
}

function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [colour, setColour] = useState("#79aaff");
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 6;
    context.lineCap = "round";
    context.strokeStyle = colour;
    context.lineTo(
      (event.clientX - bounds.left) * (canvas.width / bounds.width),
      (event.clientY - bounds.top) * (canvas.height / bounds.height),
    );
    context.stroke();
  };
  return (
    <div className="desktop-app paint-workspace">
      <nav className="desktop-app-toolbar">
        <label>Colour <input type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></label>
        <button onClick={() => canvasRef.current?.getContext("2d")?.clearRect(0, 0, 960, 600)}>Clear</button>
        <button onClick={() => {
          const data = canvasRef.current?.toDataURL("image/png");
          if (!data) return;
          const anchor = document.createElement("a");
          anchor.href = data;
          anchor.download = "drawing.png";
          anchor.click();
        }}>Save PNG</button>
      </nav>
      <canvas
        ref={canvasRef}
        width={960}
        height={600}
        onPointerDown={(event) => {
          drawing.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          const context = event.currentTarget.getContext("2d");
          context?.beginPath();
          context?.moveTo(
            (event.clientX - bounds.left) * (event.currentTarget.width / bounds.width),
            (event.clientY - bounds.top) * (event.currentTarget.height / bounds.height),
          );
        }}
        onPointerMove={draw}
        onPointerUp={() => { drawing.current = false; }}
        onPointerCancel={() => { drawing.current = false; }}
      />
    </div>
  );
}

function PhotosApp() {
  const [file, setFile] = useObjectUrl();
  const [zoom, setZoom] = useState(100);
  return (
    <div className="desktop-app photo-workspace">
      <nav className="desktop-app-toolbar">
        <strong>{file?.name ?? "Photos"}</strong>
        <FileButton accept="image/*" onFile={setFile}>Open image</FileButton>
        <label>Zoom <input type="range" min="25" max="250" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      </nav>
      {/* A browser-generated blob URL cannot be handled by the framework image optimiser. */}
      {file ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.name} style={{ width: `${zoom}%` }} />
        </div>
      ) : <div className="desktop-app-empty"><strong>Open a local image</strong><p>Pan and zoom without uploading it.</p></div>}
    </div>
  );
}

function OpenTypeApp() {
  const [font, setFont] = useState("system-ui");
  const [name, setName] = useState("System font");
  const [sample, setSample] = useState("The quick brown fox jumps over the lazy dog. 429 → retry with jitter.");
  const load = async (file: File) => {
    const family = `LocalFont-${Date.now()}`;
    const face = new FontFace(family, await file.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    setFont(family);
    setName(file.name);
  };
  return (
    <div className="desktop-app font-workspace">
      <nav className="desktop-app-toolbar"><strong>{name}</strong><FileButton accept=".ttf,.otf,.woff,.woff2" onFile={(file) => void load(file)}>Open font</FileButton></nav>
      <textarea value={sample} onChange={(event) => setSample(event.target.value)} style={{ fontFamily: font }} />
      <p style={{ fontFamily: font }}>{sample}</p>
    </div>
  );
}

function MediaApp({ webamp = false }: { webamp?: boolean }) {
  const [file, setFile] = useObjectUrl();
  const video = file?.name.match(/\.(mp4|webm|ogv|mov)$/i);
  return (
    <div className={`desktop-app media-workspace ${webamp ? "webamp-workspace" : ""}`}>
      <nav className="desktop-app-toolbar"><strong>{file?.name ?? (webamp ? "Webamp" : "Video Player")}</strong><FileButton accept="audio/*,video/*" onFile={setFile}>Open media</FileButton></nav>
      {file && video && <video src={file.url} controls autoPlay />}
      {file && !video && <audio src={file.url} controls autoPlay />}
      {!file && <div className="desktop-app-empty"><strong>{webamp ? "Drop the beat, not the ticket" : "Open local audio or video"}</strong><p>Playback stays on this device.</p></div>}
      {webamp && <div className="webamp-equalizer">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 37) % 72)}%` }} />)}</div>}
    </div>
  );
}

function RuffleApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Choose a SWF file.");
  const play = async (file: File) => {
    setStatus("Loading Ruffle…");
    try {
      await loadScript("ruffle-runtime", "https://unpkg.com/@ruffle-rs/ruffle/ruffle.js");
      const url = URL.createObjectURL(file);
      const player = window.RufflePlayer?.newest().createPlayer();
      if (!player || !hostRef.current) throw new Error();
      hostRef.current.replaceChildren(player);
      await player.load({ url });
      setStatus(file.name);
    } catch {
      setStatus("Ruffle could not start. Check the network or SWF file.");
    }
  };
  return (
    <div className="desktop-app ruffle-workspace">
      <nav className="desktop-app-toolbar"><strong>{status}</strong><FileButton accept=".swf" onFile={(file) => void play(file)}>Open SWF</FileButton></nav>
      <div ref={hostRef} className="ruffle-host" />
    </div>
  );
}

function MessengerApp() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  return (
    <div className="desktop-app messenger-workspace">
      <header><strong>Local support channel</strong><span>Nothing is transmitted</span></header>
      <ol>{messages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ol>
      <form onSubmit={(event) => {
        event.preventDefault();
        const value = draft.trim();
        if (!value) return;
        setMessages((current) => [...current, value]);
        setDraft("");
      }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a local note" />
        <button>Capture</button>
      </form>
    </div>
  );
}

const CHESS_START = [
  "♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜",
  "♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟",
  ...Array<string>(32).fill(""),
  "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙",
  "♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖",
];

function ChessApp() {
  const [board, setBoard] = useState(CHESS_START);
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="desktop-app chess-workspace">
      <header><strong>Local two-player board</strong><button onClick={() => { setBoard(CHESS_START); setSelected(null); }}>Reset</button></header>
      <div className="chess-board" role="grid" aria-label="Chess board">
        {board.map((piece, index) => (
          <button
            key={index}
            className={selected === index ? "selected" : ""}
            aria-label={`${String.fromCharCode(97 + (index % 8))}${8 - Math.floor(index / 8)}${piece ? ` ${piece}` : ""}`}
            onClick={() => {
              if (selected === null) {
                if (piece) setSelected(index);
                return;
              }
              setBoard((current) => current.map((value, cell) => cell === index ? current[selected] : cell === selected ? "" : value));
              setSelected(null);
            }}
          >
            {piece}
          </button>
        ))}
      </div>
      <footer>Free-move analysis board; move validation is intentionally not enforced.</footer>
    </div>
  );
}

function VimApp() {
  const [mode, setMode] = useState<"NORMAL" | "INSERT">("NORMAL");
  const [text, setText] = useState("# support-notes.md\n\n");
  return (
    <div className="desktop-app vim-workspace" onKeyDown={(event) => {
      if (event.key === "Escape") setMode("NORMAL");
      if (mode === "NORMAL" && event.key === "i") {
        event.preventDefault();
        setMode("INSERT");
      }
    }}>
      <textarea readOnly={mode === "NORMAL"} value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} autoFocus />
      <footer><strong>-- {mode} --</strong><span>i: insert · Esc: normal</span><button onClick={() => download("support-notes.md", text)}>Write copy</button></footer>
    </div>
  );
}

function ExternalApp({ app }: { app: SupportedAppId }) {
  const config = EXTERNAL_APPS[app];
  if (!config) return null;
  return (
    <div className="desktop-app external-workspace">
      <header>
        <span>{config.note}</span>
        <a href={config.url} target="_blank" rel="noopener noreferrer">Open separately ↗</a>
      </header>
      <iframe
        title={`${APP_REGISTRY[app].title} web application`}
        src={config.url}
        sandbox="allow-downloads allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts"
        allow="autoplay; fullscreen; gamepad"
        referrerPolicy="no-referrer"
      />
      <footer>Isolated from the support router, API key, and customer input.</footer>
    </div>
  );
}

export function DaedalApp({ id }: { id: AppId }) {
  if (id === "browser") return <BrowserApp />;
  if (id === "devtools") return <DevToolsApp />;
  if (id === "monaco") return <MonacoApp />;
  if (id === "tinymce") return <TinyMCEApp />;
  if (id === "pdf") return <PdfApp />;
  if (id === "marked") return <MarkedApp />;
  if (id === "paint") return <PaintApp />;
  if (id === "photos") return <PhotosApp />;
  if (id === "opentype") return <OpenTypeApp />;
  if (id === "video") return <MediaApp />;
  if (id === "webamp") return <MediaApp webamp />;
  if (id === "ruffle") return <RuffleApp />;
  if (id === "messenger") return <MessengerApp />;
  if (id === "chess") return <ChessApp />;
  if (id === "vim") return <VimApp />;
  return <ExternalApp app={id as SupportedAppId} />;
}
