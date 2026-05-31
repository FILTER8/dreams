"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { DreamAmbientPlayer } from "@/components/DreamAmbientPlayer";

const C64 = [
  "#000000",
  "#ffffff",
  "#883932",
  "#67b6bd",
  "#8b3f96",
  "#55a049",
  "#40318d",
  "#bfce72",
  "#8b5429",
  "#574200",
  "#b86962",
  "#505050",
  "#787878",
  "#94e089",
  "#7869c4",
  "#9f9f9f",
];

type Mode = "dream" | "visual";

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
  dreamSeed?: string;
};

type TokenResponse = {
  image?: string;
};

type VisualTraits = {
  mood: number;
  moodName: string;
  blobCount: number;
  ditherCount: number;
  contourCount: number;
  satelliteCount: number;
  bgColor: number;
};

type VisualResponse = {
  tokenId: string;
  cycle: string;
  dreamSeed: string;
  traits?: VisualTraits;
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

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function sampleTokenBackgroundColor(image?: string) {
  if (!image) return "";

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve("");
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);

        const samplePoints = [
          [2, 2],
          [size - 3, 2],
          [2, size - 3],
          [size - 3, size - 3],
        ];

        const colors = samplePoints.map(([x, y]) => {
          const data = ctx.getImageData(x, y, 1, 1).data;
          return rgbToHex(data[0], data[1], data[2]);
        });

        const counts = colors.reduce<Record<string, number>>((acc, color) => {
          acc[color] = (acc[color] ?? 0) + 1;
          return acc;
        }, {});

        const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

        resolve(winner?.[0] ?? colors[0] ?? "");
      } catch {
        resolve("");
      }
    };

    img.onerror = () => resolve("");
    img.src = image;
  });
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
    (color) => color.toLowerCase() !== bg.toLowerCase(),
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

function clampVisualScale(value: number) {
  return Math.max(0.15, Math.min(6, value));
}

function VisualToken({
  image,
  visual,
  visualScale,
  setVisualScale,
}: {
  image?: string;
  visual: VisualResponse | null;
  visualScale: number;
  setVisualScale: React.Dispatch<React.SetStateAction<number>>;
}) {
  const orbit = motionDuration(visual?.motion.orbitSpeed, 120);
  const drift = motionDuration(visual?.motion.driftSpeed, 100);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startDistance = useRef(0);
  const startScale = useRef(1);

  function distance() {
    const points = Array.from(pointers.current.values());
    if (points.length < 2) return 0;

    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  if (!image) {
    return (
      <div className="text-xs tracking-[0.18em] opacity-60">
        LOADING VISUAL
      </div>
    );
  }

  return (
    <div
     className="fixed inset-0 z-10 flex touch-none items-center justify-center overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);

        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });

        if (pointers.current.size === 2) {
          startDistance.current = distance();
          startScale.current = visualScale;
        }
      }}
      onPointerMove={(event) => {
        event.stopPropagation();

        if (!pointers.current.has(event.pointerId)) return;

        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });

        if (pointers.current.size === 2 && startDistance.current > 0) {
          const nextDistance = distance();
          const ratio = nextDistance / startDistance.current;

          setVisualScale(clampVisualScale(startScale.current * ratio));
        }
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          animation: `cdDrift ${drift}s ease-in-out infinite alternate`,
        }}
      >
        <img
          src={image}
          alt="Chain Dreams visual"
          className="block h-[100vh] w-[100vw] object-contain cd-pixel"
          style={
            {
              "--visual-scale": visualScale,
              animation: `cdOrbit ${orbit}s linear infinite`,
              transformOrigin: "50% 50%",
            } as React.CSSProperties
          }
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
  const [visualScale, setVisualScale] = useState(1);
  const [tokenImage, setTokenImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState<string[]>([]);
  const [tokenBackground, setTokenBackground] = useState("#000000");
  const [colorIndex, setColorIndex] = useState(0);

  const dreamBg = palette[colorIndex % palette.length] ?? tokenBackground;
  const bg = mode === "visual" ? tokenBackground : dreamBg;
  const fg = contrastColor(bg, palette.length > 0 ? palette : [bg, "#ffffff"]);

  const nextColor = useCallback(() => {
    if (mode === "visual") return;
    setColorIndex((i) => (i + 1) % Math.max(palette.length, 1));
  }, [mode, palette.length]);

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (mode !== "visual") return;

      event.preventDefault();

      setVisualScale((current) =>
        clampVisualScale(current + (event.deltaY < 0 ? 0.15 : -0.15)),
      );
    }

    function preventGesture(event: Event) {
      if (mode !== "visual") return;
      event.preventDefault();
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("gesturestart", preventGesture, { passive: false });
    window.addEventListener("gesturechange", preventGesture, { passive: false });
    window.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("gesturestart", preventGesture);
      window.removeEventListener("gesturechange", preventGesture);
      window.removeEventListener("gestureend", preventGesture);
    };
  }, [mode]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [dreamRes, tokenRes, visualRes] = await Promise.all([
          fetch(`/api/dream/${tokenId}`, { cache: "no-store" }),
          fetch(`/api/token/${tokenId}`, { cache: "no-store" }),
          fetch(`/api/visual/${tokenId}`, { cache: "no-store" }),
        ]);

        const dreamData = (await dreamRes.json()) as DreamResponse;
        const tokenData = (await tokenRes.json()) as TokenResponse;
        const visualData = (await visualRes.json()) as VisualResponse;

        if (dreamData?.phrase) setDream(dreamData);
        if (visualData?.motion) setVisual(visualData);
        if (tokenData?.image) setTokenImage(tokenData.image);

        const fallbackColors = fallbackPalette(tokenId);
        const tokenColors = extractTokenColors(tokenData?.image);
        const nextPalette =
          tokenColors.length > 0 ? tokenColors : fallbackColors;

        const sampledBackground =
          (await sampleTokenBackgroundColor(tokenData?.image)) || nextPalette[0];

        setPalette(nextPalette);
        setTokenBackground(sampledBackground);
        setColorIndex(0);
      } catch (err) {
        console.error(err);

        const fallbackColors = fallbackPalette(tokenId);
        setPalette(fallbackColors);
        setTokenBackground(fallbackColors[0]);
        setColorIndex(0);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tokenId]);

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
  }, [nextColor]);

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
  const dreamSeed = visual?.dreamSeed ?? dream?.dreamSeed;

  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{ background: bg, color: fg }}
      onClick={nextColor}
    >
      <style jsx global>{`
        html,
        body {
          overscroll-behavior: none;
        }

        @keyframes cdOrbit {
          from {
            transform: rotate(-1.2deg)
              scale(calc(var(--visual-scale) * 0.985));
          }
          50% {
            transform: rotate(1.2deg)
              scale(calc(var(--visual-scale) * 1.015));
          }
          to {
            transform: rotate(-1.2deg)
              scale(calc(var(--visual-scale) * 0.985));
          }
        }

        @keyframes cdDrift {
          from {
            transform: translate3d(-1.2%, -0.8%, 0);
          }
          to {
            transform: translate3d(1.2%, 0.8%, 0);
          }
        }

        @keyframes cdPulse {
          0%,
          100% {
            opacity: 0.08;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>

      <section
        ref={posterRef}
        className="relative z-10 flex min-h-screen flex-col justify-between px-6 py-6 md:px-10 md:py-8"
      >
       <header className="relative z-30 flex items-start justify-between gap-6 text-[10px] tracking-[0.22em] opacity-75 md:text-xs">
          <div className="flex flex-col items-start">
            <Link href="/" className="hover:opacity-100">
              CHAIN DREAMS
            </Link>

            <div className="mt-3">
              <DreamAmbientPlayer
                tokenId={tokenId}
                dreamSeed={dreamSeed}
                palette={palette}
                motion={visual?.motion}
                foregroundColor={fg}
                visualScale={visualScale}
                visualTraits={visual?.traits}
              />
            </div>
          </div>

          <div className="text-right">
            <p>TOKEN #{tokenId}</p>
            <p className="mt-2 opacity-60">
              CURRENT DAY : {currentDayLabel().toUpperCase()}
            </p>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center text-center">
          {mode === "dream" ? (
            <h1 className="cd-headline max-w-6xl text-5xl uppercase leading-[1.05] tracking-[0.08em] drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] md:text-8xl">
              {loading ? "LOADING DREAM" : phrase}
            </h1>
          ) : (
            <VisualToken
              image={tokenImage}
              visual={visual}
              visualScale={visualScale}
              setVisualScale={setVisualScale}
            />
          )}
        </div>

        <footer className="relative z-30 flex flex-col gap-4 text-[10px] tracking-[0.18em] opacity-80 md:flex-row md:items-end md:justify-between md:text-xs">
          <div>
            <p>DAILY DREAM CYCLE {cycle}</p>
            <p className="mt-2 opacity-60">
              DREAM MODE : SPACE/TAP COLOR · D DREAM · V VISUAL
            </p>
            <p className="mt-1 opacity-60">
              VISUAL MODE : TOKEN BACKGROUND LOCKED
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
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
          </div>
        </footer>
      </section>
    </main>
  );
}