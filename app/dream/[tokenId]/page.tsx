"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

const C64 = [
  "#000000", "#ffffff", "#883932", "#67b6bd",
  "#8b3f96", "#55a049", "#40318d", "#bfce72",
  "#8b5429", "#574200", "#b86962", "#505050",
  "#787878", "#94e089", "#7869c4", "#9f9f9f",
];

const FALLBACK_DREAMS = [
  "The machine remembers what the world forgets.",
  "The signal returns through the dark glass.",
  "Your artifact dreams in low resolution.",
  "The archive stores a future still forming.",
  "A quiet network wakes beneath the image.",
  "The memory of machines becomes a daily signal.",
];

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
};

type TokenResponse = {
  image?: string;
};

function fallbackPalette(tokenId: string) {
  const seed = Number(tokenId);

  return [
    C64[seed % C64.length],
    C64[(seed + 3) % C64.length],
    C64[(seed + 7) % C64.length],
    C64[(seed + 11) % C64.length],
  ];
}

function decodeSvgDataUri(image?: string) {
  if (!image) return "";

  if (image.startsWith("data:image/svg+xml;base64,")) {
    const base64 = image.replace("data:image/svg+xml;base64,", "");
    return atob(base64);
  }

  if (image.startsWith("data:image/svg+xml;utf8,")) {
    return decodeURIComponent(image.replace("data:image/svg+xml;utf8,", ""));
  }

  return image;
}

function extractTokenColors(image?: string) {
  const svg = decodeSvgDataUri(image);
  const matches = svg.match(/#[0-9a-fA-F]{6}/g) ?? [];

  return Array.from(
    new Set(matches.map((color) => color.toLowerCase()))
  );
}

function readableColor(bg: string) {
  const hex = bg.replace("#", "");

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 130 ? "#000000" : "#f4f4f4";
}

function colorBrightness(color: string) {
  const hex = color.replace("#", "");

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
}

function contrastColor(bg: string, colors: string[]) {
  const bgBrightness = colorBrightness(bg);

  const candidates = colors.filter(
    (color) => color.toLowerCase() !== bg.toLowerCase()
  );

  if (candidates.length === 0) {
    return readableColor(bg);
  }

  return candidates.sort((a, b) => {
    const da = Math.abs(
      colorBrightness(a) - bgBrightness
    );

    const db = Math.abs(
      colorBrightness(b) - bgBrightness
    );

    return db - da;
  })[0];
}

function fallbackDream(tokenId: string) {
  const day = Math.floor(Date.now() / 86400000);
  const n = (Number(tokenId) + day) % FALLBACK_DREAMS.length;

  return FALLBACK_DREAMS[n];
}

function currentDayLabel() {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export default function DreamPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params.tokenId;
  const posterRef = useRef<HTMLDivElement>(null);

  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState<string[]>([]);
  const [colorIndex, setColorIndex] = useState(0);

const bg =
  palette[colorIndex % palette.length] ??
  "#000000";

const fg = contrastColor(
  bg,
  palette
);

  useEffect(() => {
    async function loadDream() {
      try {
        setLoading(true);

        const [dreamRes, tokenRes] = await Promise.all([
          fetch(`/api/dream/${tokenId}`, { cache: "no-store" }),
          fetch(`/api/token/${tokenId}`, { cache: "no-store" }),
        ]);

        const dreamData = await dreamRes.json();
        const tokenData = (await tokenRes.json()) as TokenResponse;

        if (dreamData?.phrase) {
          setDream(dreamData);
        }

        const tokenColors = extractTokenColors(tokenData?.image);
        setPalette(tokenColors.length > 0 ? tokenColors : fallbackPalette(tokenId));
      } catch (err) {
        console.error(err);
        setDream(null);
        setPalette(fallbackPalette(tokenId));
      } finally {
        setLoading(false);
      }
    }

    loadDream();
  }, [tokenId]);

  function nextColor() {
    setColorIndex((i) => (i + 1) % Math.max(palette.length, 1));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "Tab") {
        e.preventDefault();
        nextColor();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function downloadPNG() {
    if (!posterRef.current) return;

    const dataUrl = await toPng(posterRef.current, {
      pixelRatio: 3,
      backgroundColor: bg,
    });

    saveAs(dataUrl, `dream-${tokenId}.png`);
  }

  const phrase = dream?.phrase ?? fallbackDream(tokenId);
  const cycle = dream?.cycle ?? "LOCAL";

  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{ background: bg, color: fg }}
      onClick={nextColor}
    >
      <section
        ref={posterRef}
        className="relative z-10 min-h-screen flex flex-col justify-between px-6 py-6 md:px-10 md:py-8"
      >
        <header className="flex items-start justify-between gap-6 text-[10px] md:text-xs tracking-[0.22em] opacity-75">
          <Link href="/" className="hover:opacity-100">
            CHAIN DREAMS
          </Link>

          <div className="text-right">
            <p>TOKEN #{tokenId}</p>
            <p className="mt-2 opacity-60">
              CURRENT DAY : {currentDayLabel().toUpperCase()}
            </p>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center text-center">
          <h1 className="cd-headline max-w-6xl text-5xl md:text-8xl leading-[1.05] tracking-[0.08em] uppercase drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
            {loading ? "LOADING DREAM" : phrase}
          </h1>
        </div>

        <footer className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between text-[10px] md:text-xs tracking-[0.18em] opacity-80">
          <div>
            <p>DAILY DREAM CYCLE {cycle}</p>
            <p className="mt-2 opacity-60">
              PRESS SPACE OR TAP TO SHIFT TOKEN COLOR
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/collection/${tokenId}`}
              className="border px-4 py-2 hover:opacity-70"
              style={{ borderColor: fg }}
              onClick={(e) => e.stopPropagation()}
            >
              TOKEN PAGE
            </Link>

            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadPNG();
              }}
              className="border px-4 py-2 hover:opacity-70"
              style={{ borderColor: fg }}
            >
              DOWNLOAD PNG
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}