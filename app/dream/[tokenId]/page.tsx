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

type Mode = "dream" | "visual";

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
};

type TokenResponse = {
  image?: string;
};

type VisualResponse = {
  tokenId: string;
  cycle: string;
  dreamSeed: string;
  motion: {
    orbitSpeed: string;
    driftSpeed: string;
    ditherTempo: string;
  };
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
    return atob(image.replace("data:image/svg+xml;base64,", ""));
  }

  if (image.startsWith("data:image/svg+xml;utf8,")) {
    return decodeURIComponent(image.replace("data:image/svg+xml;utf8,", ""));
  }

  return image;
}

function extractTokenColors(image?: string) {
  const svg = decodeSvgDataUri(image);
  const matches = svg.match(/#[0-9a-fA-F]{6}/g) ?? [];

  return Array.from(new Set(matches.map((color) => color.toLowerCase())));
}

function colorBrightness(color: string) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
}

function readableColor(bg: string) {
  return colorBrightness(bg) > 130 ? "#000000" : "#f4f4f4";
}

function contrastColor(bg: string, colors: string[]) {
  const bgBrightness = colorBrightness(bg);
  const candidates = colors.filter(
    (color) => color.toLowerCase() !== bg.toLowerCase()
  );

  if (candidates.length === 0) return readableColor(bg);

  return candidates.sort((a, b) => {
    const da = Math.abs(colorBrightness(a) - bgBrightness);
    const db = Math.abs(colorBrightness(b) - bgBrightness);
    return db - da;
  })[0];
}

function currentDayLabel() {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function motionDuration(value?: string, fallback = 120) {
  const n = Number(value ?? fallback);
  return Math.max(6, 220 - n);
}

function VisualToken({
  image,
  visual,
}: {
  image?: string;
  visual: VisualResponse | null;
}) {
  const orbit = motionDuration(visual?.motion.orbitSpeed, 120);
  const drift = motionDuration(visual?.motion.driftSpeed, 100);
  const pulse = Math.max(4, 24 - Number(visual?.motion.ditherTempo ?? 10));

  if (!image) {
    return (
      <div className="text-xs tracking-[0.18em] opacity-60">
        LOADING VISUAL
      </div>
    );
  }

  return (
    <div className="relative flex h-[68vh] w-[min(84vw,720px)] items-center justify-center">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0px, transparent 5px, currentColor 6px)",
          animation: `cdPulse ${pulse}s ease-in-out infinite`,
        }}
      />

      <div
        className="relative h-full w-full"
        style={{
          animation: `cdDrift ${drift}s ease-in-out infinite alternate`,
        }}
      >
        <img
          src={image}
          alt="Chain Dreams visual"
          className="h-full w-full object-contain cd-pixel"
          style={{
            animation: `cdOrbit ${orbit}s linear infinite`,
            transformOrigin: "50% 50%",
          }}
        />
      </div>
    </div>
  );
}

export default function DreamPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params.tokenId;

  const posterRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("dream");
  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [visual, setVisual] = useState<VisualResponse | null>(null);
  const [tokenImage, setTokenImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState<string[]>([]);
  const [colorIndex, setColorIndex] = useState(0);

  const bg = palette[colorIndex % palette.length] ?? "#000000";
  const fg = contrastColor(bg, palette);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [dreamRes, tokenRes, visualRes] = await Promise.all([
          fetch(`/api/dream/${tokenId}`, { cache: "no-store" }),
          fetch(`/api/token/${tokenId}`, { cache: "no-store" }),
          fetch(`/api/visual/${tokenId}`, { cache: "no-store" }),
        ]);

        const dreamData = await dreamRes.json();
        const tokenData = (await tokenRes.json()) as TokenResponse;
        const visualData = await visualRes.json();

        if (dreamData?.phrase) setDream(dreamData);
        if (visualData?.motion) setVisual(visualData);
        if (tokenData?.image) setTokenImage(tokenData.image);

        const tokenColors = extractTokenColors(tokenData?.image);
        setPalette(tokenColors.length > 0 ? tokenColors : fallbackPalette(tokenId));
      } catch (err) {
        console.error(err);
        setPalette(fallbackPalette(tokenId));
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

      if (e.key.toLowerCase() === "v") setMode("visual");
      if (e.key.toLowerCase() === "d") setMode("dream");
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

    saveAs(dataUrl, `dream-${tokenId}-${mode}.png`);
  }

  const phrase = dream?.phrase ?? "WAITING FOR DREAM";
  const cycle = dream?.cycle ?? visual?.cycle ?? "LOCAL";

  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{ background: bg, color: fg }}
      onClick={nextColor}
    >
      <style jsx global>{`
        @keyframes cdOrbit {
          from { transform: rotate(-1.2deg) scale(0.985); }
          50% { transform: rotate(1.2deg) scale(1.015); }
          to { transform: rotate(-1.2deg) scale(0.985); }
        }

        @keyframes cdDrift {
          from { transform: translate3d(-1.2%, -0.8%, 0); }
          to { transform: translate3d(1.2%, 0.8%, 0); }
        }

        @keyframes cdPulse {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.2; }
        }
      `}</style>

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
          {mode === "dream" ? (
            <h1 className="cd-headline max-w-6xl text-5xl md:text-8xl leading-[1.05] tracking-[0.08em] uppercase drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
              {loading ? "LOADING DREAM" : phrase}
            </h1>
          ) : (
            <VisualToken image={tokenImage} visual={visual} />
          )}
        </div>

        <footer className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between text-[10px] md:text-xs tracking-[0.18em] opacity-80">
          <div>
            <p>DAILY DREAM CYCLE {cycle}</p>
            <p className="mt-2 opacity-60">
              SPACE/TAP COLOR · D DREAM · V VISUAL
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode("dream");
              }}
              className="border px-4 py-2 hover:opacity-70"
              style={{
                borderColor: fg,
                opacity: mode === "dream" ? 1 : 0.45,
              }}
            >
              DREAM
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode("visual");
              }}
              className="border px-4 py-2 hover:opacity-70"
              style={{
                borderColor: fg,
                opacity: mode === "visual" ? 1 : 0.45,
              }}
            >
              VISUAL
            </button>

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