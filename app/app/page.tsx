"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import jsQR from "jsqr";
import { useSearchParams } from "next/navigation";
import { DreamAmbientPlayer } from "@/components/DreamAmbientPlayer";
import type { ChainDreamToken } from "@/lib/metadata";

const STORAGE_KEY = "chain-dreams-wallet";
const STORAGE_EVENT = "chain-dreams-wallet-change";

const DREAM_COLORS = [
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

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
  dreamSeed?: string;
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

type TouchPoint = { clientX: number; clientY: number };

function isStandaloneApp() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      ))
  );
}

function subscribeToStandalone(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getStoredWallet() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function subscribeToWallet(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function saveStoredWallet(wallet: string) {
  window.localStorage.setItem(STORAGE_KEY, wallet);
  window.dispatchEvent(new Event(STORAGE_EVENT));
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

function clampScale(value: number) {
  return Math.max(0.5, Math.min(6, value));
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

function extractWalletFromQr(value: string) {
  try {
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value;

    const url = new URL(value);
    const wallet = url.searchParams.get("wallet");

    if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) return wallet;

    return null;
  } catch {
    return null;
  }
}

function distance(a: TouchPoint, b: TouchPoint) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function angle(a: TouchPoint, b: TouchPoint) {
  return (
    Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) *
    (180 / Math.PI)
  );
}

function randomColor() {
  return DREAM_COLORS[Math.floor(Math.random() * DREAM_COLORS.length)];
}

function AppPageContent() {
  const searchParams = useSearchParams();
  const walletFromUrl = searchParams.get("wallet");

  const storedWallet = useSyncExternalStore(
    subscribeToWallet,
    getStoredWallet,
    () => null,
  );

  const standalone = useSyncExternalStore(
    subscribeToStandalone,
    isStandaloneApp,
    () => false,
  );

  const wallet = walletFromUrl ?? storedWallet;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1);
  const rotateStartAngle = useRef(0);
  const rotateStartRotation = useRef(0);
  const visualLastTap = useRef(0);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [dreams, setDreams] = useState<Record<string, DreamResponse>>({});
  const [visuals, setVisuals] = useState<Record<string, VisualResponse>>({});

  const [loading, setLoading] = useState(true);
  const [dreamsLoading, setDreamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visualScale, setVisualScale] = useState(1);
  const [visualRotation, setVisualRotation] = useState(0);

  const selectedToken =
    selectedIndex === null ? null : tokens[selectedIndex] ?? null;

  const backgrounds = useMemo(() => {
    const next: Record<string, string> = {};

    for (const token of tokens) {
      const colors = extractTokenColors(token.image);
      next[token.tokenId] = colors[0] ?? "#000000";
    }

    return next;
  }, [tokens]);

  const tileColors = useMemo(() => {
    const next: Record<string, string> = {};

    for (const token of tokens) {
      next[token.tokenId] = randomColor();
    }

    return next;
  }, [tokens]);

  useEffect(() => {
    if (!walletFromUrl) return;
    saveStoredWallet(walletFromUrl);
  }, [walletFromUrl]);

  useEffect(() => {
    async function loadTokens() {
      if (!wallet) {
        setTokens([]);
        setLoading(false);
        setError("NO WALLET PAIRED");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/owner/${wallet}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? "wallet tokens unavailable");
        }

        setTokens(data.tokens ?? []);
      } catch (err) {
        setTokens([]);
        setError(err instanceof Error ? err.message : "wallet tokens unavailable");
      } finally {
        setLoading(false);
      }
    }

    loadTokens();
  }, [wallet]);

  useEffect(() => {
    async function loadDreams() {
      if (tokens.length === 0) return;

      const missing = tokens.filter((token) => !dreams[token.tokenId]);
      if (missing.length === 0) return;

      try {
        setDreamsLoading(true);

        const results = await Promise.all(
          missing.map(async (token) => {
            try {
              const res = await fetch(`/api/dream/${token.tokenId}`, {
                cache: "no-store",
              });

              if (!res.ok) return null;

              const dream = (await res.json()) as DreamResponse;
              return [token.tokenId, dream] as const;
            } catch {
              return null;
            }
          }),
        );

        setDreams((prev) => {
          const next = { ...prev };

          for (const result of results) {
            if (result) next[result[0]] = result[1];
          }

          return next;
        });
      } finally {
        setDreamsLoading(false);
      }
    }

    loadDreams();
  }, [tokens, dreams]);

  useEffect(() => {
    async function loadSelectedVisual() {
      if (!selectedToken || visuals[selectedToken.tokenId]) return;

      try {
        const res = await fetch(`/api/visual/${selectedToken.tokenId}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const visual = (await res.json()) as VisualResponse;

        setVisuals((prev) => ({
          ...prev,
          [selectedToken.tokenId]: visual,
        }));
      } catch {
        // ignore visual failures
      }
    }

    loadSelectedVisual();
  }, [selectedToken, visuals]);

  function saveWallet(nextWallet: string) {
    saveStoredWallet(nextWallet);
    setScannerOpen(false);
    setScannerError(null);
  }

  function stopScanner() {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startScanner() {
    try {
      setScannerError(null);
      setScannerOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scanQrFrame();
    } catch {
      setScannerError("CAMERA UNAVAILABLE");
    }
  }

  function closeScanner() {
    stopScanner();
    setScannerOpen(false);
  }

  function scanQrFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      scanFrameRef.current = requestAnimationFrame(scanQrFrame);
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code?.data) {
          const scannedWallet = extractWalletFromQr(code.data);

          if (scannedWallet) {
            stopScanner();
            saveWallet(scannedWallet);
            return;
          }

          setScannerError("QR FOUND, BUT NO WALLET LINK");
        }
      }
    }

    scanFrameRef.current = requestAnimationFrame(scanQrFrame);
  }

  useEffect(() => {
    return () => stopScanner();
  }, []);

  function openVisual(index: number) {
    setSelectedIndex(index);
    setVisualScale(1);
    setVisualRotation(0);
  }

  function closeVisual() {
    setSelectedIndex(null);
    setVisualScale(1);
    setVisualRotation(0);
  }

  function handleVisualTap() {
    const now = Date.now();

    if (now - visualLastTap.current < 300) {
      closeVisual();
      visualLastTap.current = 0;
      return;
    }

    visualLastTap.current = now;
  }

  function renderDreamTile(token: ChainDreamToken) {
    const dream = dreams[token.tokenId];
    const tileBg = tileColors[token.tokenId] ?? "#000000";
    const tileFg = readableColor(tileBg);

    return (
      <div
        className="flex aspect-square w-full flex-col items-center justify-center p-6 text-center"
        style={{ background: tileBg, color: tileFg }}
      >
        <p
          className="cd-headline max-w-full whitespace-normal break-words text-4xl uppercase leading-[1.05] tracking-[0.06em]"
          style={{
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {dream?.phrase ?? (dreamsLoading ? "LOADING DREAM" : "DREAM SIGNAL")}
        </p>

        <p className="mt-6 text-[10px] tracking-[0.18em] opacity-50">
          CYCLE {dream?.cycle ?? "----"}
        </p>
      </div>
    );
  }

  function renderVisualOverlay(token: ChainDreamToken) {
    const dream = dreams[token.tokenId];
    const visual = visuals[token.tokenId];
    const palette = extractTokenColors(token.image);
    const bg = backgrounds[token.tokenId] ?? palette[0] ?? "#000000";
    const fg = readableColor(bg);

    return (
      <div
        className="fixed inset-0 z-[9999] flex touch-none select-none items-center justify-center overflow-hidden"
        style={{ background: bg, color: fg }}
        onClick={handleVisualTap}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            const first = event.touches[0];
            const second = event.touches[1];

            pinchStartDistance.current = distance(first, second);
            pinchStartScale.current = visualScale;

            rotateStartAngle.current = angle(first, second);
            rotateStartRotation.current = visualRotation;
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 2) return;

          const first = event.touches[0];
          const second = event.touches[1];

          const nextDistance = distance(first, second);
          const ratio = nextDistance / Math.max(pinchStartDistance.current, 1);

          const nextAngle = angle(first, second);
          const angleDelta = nextAngle - rotateStartAngle.current;

          setVisualScale(clampScale(pinchStartScale.current * ratio));
          setVisualRotation(rotateStartRotation.current + angleDelta);
        }}
      >
        <div
          className="fixed right-4 z-30"
          style={{ top: "max(1rem, env(safe-area-inset-top))" }}
          onClick={(event) => event.stopPropagation()}
        >
          <DreamAmbientPlayer
            tokenId={token.tokenId}
            dreamSeed={visual?.dreamSeed ?? dream?.dreamSeed}
            palette={palette.length > 0 ? palette : DREAM_COLORS}
            motion={visual?.motion}
            foregroundColor={fg}
            visualScale={visualScale}
            visualTraits={visual?.traits}
          />
        </div>

        {token.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.image}
            alt={`Chain Dreams #${token.tokenId}`}
            className="block h-screen w-screen object-contain"
            style={{
              transform: `scale(${visualScale}) rotate(${visualRotation}deg)`,
              transformOrigin: "50% 50%",
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
            }}
            draggable={false}
          />
        )}

        <p className="pointer-events-none fixed bottom-6 left-0 right-0 text-center text-[10px] tracking-[0.18em] opacity-50">
          PINCH SCALE · ROTATE · DOUBLE TAP CLOSE
        </p>
      </div>
    );
  }

  if (!standalone) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-8 text-center text-white">
        <div className="max-w-sm">
          <p className="cd-label mb-8">CHAIN DREAMS APP</p>

          <h1 className="cd-headline text-4xl uppercase leading-tight tracking-[0.08em]">
            SAVE TO HOME SCREEN
          </h1>

          <p className="mt-8 text-sm leading-8 opacity-60">
            Tap the Share icon in Safari, then choose Add to Home Screen.
          </p>

          <p className="mt-8 text-[10px] leading-6 tracking-[0.14em] opacity-40">
            After saving, open Chain Dreams from the new icon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <style jsx global>{`
        html,
        body {
          background: #000000;
          overscroll-behavior: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
      `}</style>

      {loading && (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <p className="cd-label">LOADING DREAMS</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <div>
            <p className="cd-label mb-6">{error}</p>

            <button onClick={startScanner} className="cd-button">
              SCAN QR
            </button>

            <p className="mt-6 max-w-sm text-xs leading-6 opacity-50">
              OPEN THE APP QR MODAL ON YOUR COLLECTOR PAGE, THEN SCAN IT HERE.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && tokens.length === 0 && (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <p className="cd-label">NO DREAMS FOUND</p>
        </div>
      )}

      {!loading && !error && tokens.length > 0 && (
        <div className="grid grid-cols-1 bg-black">
          {tokens.map((token, index) => (
            <button
              key={token.tokenId}
              onClick={() => openVisual(index)}
              className="aspect-square overflow-hidden bg-black p-0"
              aria-label={`Open visual ${token.tokenId}`}
            >
              {renderDreamTile(token)}
            </button>
          ))}
        </div>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black p-6 text-center">
          <p className="cd-label mb-6">SCAN APP QR</p>

          <div className="relative aspect-square w-full max-w-sm overflow-hidden border border-[#222] bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
            />

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {scannerError && (
            <p className="mt-5 text-xs tracking-[0.14em] text-[#bfce72]">
              {scannerError}
            </p>
          )}

          <button onClick={closeScanner} className="cd-button mt-6">
            CLOSE
          </button>
        </div>
      )}

      {selectedToken && renderVisualOverlay(selectedToken)}
    </main>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="cd-label">LOADING APP</p>
        </main>
      }
    >
      <AppPageContent />
    </Suspense>
  );
}