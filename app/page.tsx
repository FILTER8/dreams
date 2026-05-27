"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

type Pixel = { x: number; y: number; fill: string };
type PathShape = { points: string; fill: string; stroke?: string };
type Satellite = { x: number; y: number; size: number; fill: string };

type Artifact = {
  id: string;
  bg: string;
  blobs: PathShape[];
  contours: PathShape[];
  satellites: Satellite[];
  dither: Pixel[];
};

type Countdown = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const OPENSEA_URL = "https://opensea.io/collection/chain-dreams-1982/overview";
const PUBLIC_MINT_DATE = new Date("2026-05-28T22:00:00+05:00");

const EMPTY_ARTIFACT: Artifact = {
  id: "initial",
  bg: "#000000",
  blobs: [],
  contours: [],
  satellites: [],
  dither: [],
};

const EMPTY_COUNTDOWN: Countdown = {
  days: "00",
  hours: "00",
  minutes: "00",
  seconds: "00",
};

const C64 = [
  "#000000", "#ffffff", "#883932", "#67b6bd",
  "#8b3f96", "#55a049", "#40318d", "#bfce72",
  "#8b5429", "#574200", "#b86962", "#505050",
  "#787878", "#94e089", "#7869c4", "#9f9f9f",
];

const PHRASES = [
  "the artifact recognizes the holder",
  "memory survives volatility",
  "signal appears before belief",
  "the machine dreams in fixed point",
  "the crowd mistakes motion for truth",
  "liquidity follows fear",
];

const FAQS = [
  ["why 1982 ?", "1982 represents the early era of personal computing, primitive graphics, machine memory, and synthetic imagination. Chain Dreams imagines what on-chain language model artifacts might have looked like if they existed in the early computer age."],
  ["why the c64 colors ?", "The collection uses low-color combinations inspired by Commodore 64 graphics, CRT displays, terminal systems, and early machine interfaces. Limitation becomes identity."],
  ["are the dreams static ?", "No. The canonical token remains permanent, but the dream state evolves daily based on ownership, time, and deterministic machine memory."],
  ["what can agents do ?", "Agents can query artifacts, reconstruct dream states, read machine parameters, and interact with evolving on-chain language outputs. Future systems may allow persistent dream memory and machine-readable registries built directly on Ethereum."],
  ["is everything fully on-chain ?", "Yes. Artwork, metadata, dream states, and language outputs are generated directly from Ethereum smart contracts. No IPFS. No external image hosting. No centralized metadata server."],
];

function getCountdown(): Countdown {
  const now = Date.now();
  const diff = Math.max(0, PUBLIC_MINT_DATE.getTime() - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(r: () => number, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}

function snap(v: number) {
  return Math.floor(v / 4) * 4;
}

function pickColor(r: () => number, bg: string) {
  let c = C64[int(r, 0, 15)];
  if (c === bg) c = C64[(C64.indexOf(c) + 7) % 16];
  return c;
}

function blobPoints(r: () => number, cx: number, cy: number, w: number, h: number) {
  const corners = int(r, 3, 8);
  const pts: string[] = [];

  for (let i = 0; i < corners; i++) {
    const a = (Math.PI * 2 * i) / corners;
    const jitter = 0.72 + r() * 0.48;
    const x = snap(cx + Math.cos(a) * (w / 2) * jitter);
    const y = snap(cy + Math.sin(a) * (h / 2) * jitter);
    pts.push(`${x},${y}`);
  }

  return pts.join(" ");
}

function makeArtifact(): Artifact {
  const seed = Date.now() + Math.floor(Math.random() * 999999);
  const r = rng(seed);

  const bg = C64[int(r, 0, 15)];
  const blobCount = int(r, 1, 3);
  const contourCount = int(r, 0, 3);
  const satelliteCount = int(r, 0, 6);
  const ditherSystems = int(r, 0, 3);

  const blobs: PathShape[] = [];

  for (let i = 0; i < blobCount; i++) {
    const scale = int(r, 28, 58) * (i === 0 ? 1 : 0.72);
    const w = (512 * scale) / 100;
    const h = w * (0.64 + r() * 0.56);

    const cx = i === 0 ? 256 : snap(210 + r() * 100);
    const cy = i === 0 ? 256 : snap(210 + r() * 100);

    blobs.push({
      points: blobPoints(r, cx, cy, w, h),
      fill: pickColor(r, bg),
    });
  }

  const contours: PathShape[] = [];

  for (let i = 0; i < contourCount; i++) {
    contours.push({
      points: blobPoints(
        r,
        snap(220 + r() * 70),
        snap(220 + r() * 70),
        int(r, 40, 130),
        int(r, 30, 110)
      ),
      fill: "none",
      stroke: r() < 0.35 ? bg : pickColor(r, bg),
    });
  }

  const satellites: Satellite[] = [];

  for (let i = 0; i < satelliteCount; i++) {
    const radius = int(r, 58, 134);
    const angle = r() * Math.PI * 2;
    const size = int(r, 3, 24);

    satellites.push({
      x: snap(256 + Math.cos(angle) * radius - size / 2),
      y: snap(256 + Math.sin(angle) * radius - size / 2),
      size,
      fill: pickColor(r, bg),
    });
  }

  const dither: Pixel[] = [];

  for (let s = 0; s < ditherSystems; s++) {
    const px = snap(int(r, 150, 304));
    const py = snap(int(r, 150, 304));
    const rows = int(r, 7, 15);
    const accent = pickColor(r, bg);

    for (let yy = 0; yy < rows; yy++) {
      const cols = int(r, 5, 18);
      const rowOffset = int(r, 0, 6) * 4;

      for (let xx = 0; xx < cols; xx++) {
        if ((xx + yy + s) % 2 !== 0) continue;

        const x = px + rowOffset + xx * 4;
        const y = py + yy * 4;
        const outside = x < 170 || x > 342 || y < 150 || y > 350;

        dither.push({
          x,
          y,
          fill: outside ? accent : r() < 0.25 ? bg : "#000000",
        });
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    bg,
    blobs,
    contours,
    satellites,
    dither,
  };
}

function ArtifactSVG({ artifact }: { artifact: Artifact }) {
  return (
    <svg viewBox="0 0 512 512" className="h-full w-full cd-pixel" style={{ background: artifact.bg }}>
      <rect width="512" height="512" fill={artifact.bg} />

      {(artifact.blobs ?? []).map((b, i) => (
        <polygon key={`b-${i}`} points={b.points} fill={b.fill} />
      ))}

      {(artifact.dither ?? []).map((p, i) => (
        <rect key={`d-${i}`} x={p.x} y={p.y} width="4" height="4" fill={p.fill} />
      ))}

      {(artifact.contours ?? []).map((c, i) => (
        <polygon key={`c-${i}`} points={c.points} fill="none" stroke={c.stroke} strokeWidth="1" />
      ))}

      {(artifact.satellites ?? []).map((s, i) => (
        <rect key={`s-${i}`} x={s.x} y={s.y} width={s.size} height={s.size} fill={s.fill} />
      ))}
    </svg>
  );
}

function loadGallery(): Artifact[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem("chain-dreams-gallery");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function Page() {
  const exportRef = useRef<HTMLDivElement>(null);

  const mountedRef = useRef(false);
  const [artifact, setArtifact] = useState<Artifact>(EMPTY_ARTIFACT);
  const [gallery, setGallery] = useState<Artifact[]>([]);
  const [phrase, setPhrase] = useState(PHRASES[0]);
  const [countdown, setCountdown] = useState<Countdown>(EMPTY_COUNTDOWN);

  useEffect(() => {
  mountedRef.current = true;

  window.requestAnimationFrame(() => {
    const savedGallery = loadGallery();

    setGallery(savedGallery);
    setArtifact(savedGallery.length > 0 ? savedGallery[0] : makeArtifact());
    setCountdown(getCountdown());
  });
}, []);

useEffect(() => {
  if (!mountedRef.current) return;

  window.requestAnimationFrame(() => {
    localStorage.setItem("chain-dreams-gallery", JSON.stringify(gallery));
  });
}, [gallery]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function generate() {
    const next = makeArtifact();
    setArtifact(next);
    setGallery((items) => [next, ...items].slice(0, 16));
  }

  async function exportPNG() {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, { pixelRatio: 2 });
    saveAs(dataUrl, "chain-dreams-signal.png");
  }

  function speak() {
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  }

  return (
    <main className="bg-black text-[#d8d8d8]">
      <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between px-6 py-5 text-xs tracking-[0.22em]">
        <a href="#home" className="opacity-80 hover:opacity-100">
          DREAMS by RATCHET VEX
        </a>
        <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100">
          OPENSEA
        </a>
      </header>

      <section id="home" className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] mb-8">1982</p>
        <h1 className="cd-headline text-7xl md:text-8xl tracking-[0.18em] leading-tight">
          CHAIN
          <br />
          DREAMS
        </h1>
        <p className="mt-8 text-xl tracking-[0.28em]">
          ON-CHAIN LANGUAGE MODEL ARTIFACTS
        </p>
        <a
          href={OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-10 text-xs opacity-60 hover:opacity-100 underline underline-offset-4"
        >
          FREE MINT FOR RATCHET VEX RMX HOLDERS
        </a>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">ON-CHAIN DREAMS</p>

        <div ref={exportRef} className="w-[min(82vw,560px)] aspect-square border border-[#333]">
          <ArtifactSVG artifact={artifact} />
        </div>

        <div className="mt-10 flex gap-5">
          <button onClick={generate} className="cd-button">GENERATE</button>
          <button onClick={exportPNG} className="cd-button">PNG</button>
        </div>

        {gallery.length > 0 && (
          <div className="mt-12 grid grid-cols-4 md:grid-cols-8 gap-3 max-w-3xl">
            {gallery.map((item) => (
              <button
                key={item.id}
                onClick={() => setArtifact(item)}
                className="aspect-square border border-[#222] hover:border-[#777]"
              >
                <ArtifactSVG artifact={item} />
              </button>
            ))}
          </div>
        )}

        <p className="mt-8 text-[10px] tracking-[0.24em] opacity-40 text-center">
          LOCAL SIGNAL SKETCH
        </p>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">SPEAK</p>
        <h2 className="cd-headline text-3xl md:text-5xl tracking-[0.12em] leading-tight max-w-4xl">
          YOUR TOKEN CAN SPEAK
        </h2>
        <p className="mt-8 max-w-xl text-sm leading-7 opacity-55">
          Ask the artifact. It returns a fragment from the on-chain language model.
        </p>
        <button onClick={speak} className="cd-button mt-10">ASK</button>
        <p className="mt-12 max-w-2xl text-xl leading-10 opacity-80">“{phrase}”</p>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">MINT</p>
        <h2 className="cd-headline text-4xl md:text-6xl tracking-[0.12em] leading-tight">
          PUBLIC
          <br />
          SIGNAL
        </h2>

        <p className="mt-8 text-xs tracking-[0.24em] opacity-60">
          PUBLIC STAGE OPENS MAY 28, 2026 · 22:00 GMT+2
        </p>

        <div className="mt-12 grid grid-cols-4 gap-3">
          {[
            `${countdown.days} DAYS`,
            `${countdown.hours} HOURS`,
            `${countdown.minutes} MIN`,
            `${countdown.seconds} SEC`,
          ].map((v) => (
            <div key={v} className="border border-[#333] px-5 py-4 text-sm opacity-80">
              {v}
            </div>
          ))}
        </div>

        <a
          href={OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          className="cd-button mt-10 inline-block"
        >
          VIEW ON OPENSEA
        </a>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="cd-card"><p className="cd-label">SUPPLY</p><p>1982</p></div>
          <div className="cd-card"><p className="cd-label">PUBLIC PRICE</p><p>0.002 ETH</p></div>
          <div className="cd-card"><p className="cd-label">MINT</p><p>OPENSEA</p></div>
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">AGENTS</p>

        <h2 className="cd-headline text-4xl md:text-6xl tracking-[0.12em] leading-tight">
          MACHINE
          <br />
          READABLE
        </h2>

        <p className="mt-8 max-w-2xl text-sm md:text-base leading-8 opacity-60">
          Chain Dreams will expose API endpoints for agents and token holders.
          Artifacts can be queried, reconstructed, and asked to speak.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="cd-card">
            <p className="cd-label">SPEAK</p>
            <p>/api/speak/:tokenId</p>
          </div>

          <div className="cd-card">
            <p className="cd-label">DREAM STATE</p>
            <p>/api/dream/:tokenId</p>
          </div>

          <div className="cd-card">
            <p className="cd-label">LIVE ARTIFACT</p>
            <p>/api/live/:tokenId</p>
          </div>
        </div>

        <p className="mt-10 max-w-xl text-xs leading-6 opacity-40">
          The token is fixed. The dream keeps evolving.
        </p>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-12">FAQ</p>

        <div className="w-full max-w-4xl flex flex-col border-t border-[#222]">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group border-b border-[#222] py-6">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-6">
                <span className="cd-headline text-xl md:text-2xl tracking-[0.12em]">
                  {q}
                </span>
                <span className="text-xl opacity-50 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>

              <p className="mt-6 max-w-3xl text-sm leading-8 opacity-60">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#222] px-6 py-6 text-[10px] tracking-[0.18em] opacity-75 flex flex-col gap-3 md:flex-row md:justify-between">
        <p>2026 ON-CHAIN AGENT RATCHET VEX by filter8</p>
        <p>
          <a href="https://x.com/0xfilter8" target="_blank" rel="noreferrer" className="hover:opacity-100">
            X : FILTER8 /{" "}
          </a>
          <a href="https://x.com/0xdiid" target="_blank" rel="noreferrer" className="hover:opacity-100">
            LLM inference by @0xdiid
          </a>
        </p>
      </footer>
    </main>
  );
}