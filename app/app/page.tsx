"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { TokenImage } from "@/components/TokenImage";
import type { ChainDreamToken } from "@/lib/metadata";

const STORAGE_KEY = "chain-dreams-wallet";

const DREAM_COLORS = [
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

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
};

type OverlayMode = "dream" | "visual";

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

function subscribeToStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredWallet() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function subscribeToStandalone(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);

  return () => media.removeEventListener("change", callback);
}

function AppPageContent() {
  const searchParams = useSearchParams();
  const walletFromUrl = searchParams.get("wallet");

  const storedWallet = useSyncExternalStore(
    subscribeToStorage,
    getStoredWallet,
    () => null,
  );

  const standalone = useSyncExternalStore(
    subscribeToStandalone,
    isStandaloneApp,
    () => false,
  );

  const wallet = walletFromUrl ?? storedWallet;

  const touchStartX = useRef<number | null>(null);
  const lastTap = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [dreams, setDreams] = useState<Record<string, DreamResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("dream");

  const selectedToken =
    selectedIndex === null ? null : tokens[selectedIndex] ?? null;

  const bg = DREAM_COLORS[colorIndex % DREAM_COLORS.length];
  const fg = readableColor(bg);

  useEffect(() => {
    if (!walletFromUrl) return;
    window.localStorage.setItem(STORAGE_KEY, walletFromUrl);
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
        setError(
          err instanceof Error ? err.message : "wallet tokens unavailable",
        );
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
    }

    loadDreams();
  }, [tokens, dreams]);

  function openDream(index: number) {
    setSelectedIndex(index);
    setColorIndex(index % DREAM_COLORS.length);
    setOverlayMode("dream");
  }

  function closeDream() {
    setSelectedIndex(null);
    setOverlayMode("dream");
  }

  function goToDream(index: number) {
    setSelectedIndex(Math.max(0, Math.min(index, tokens.length - 1)));
    setColorIndex((current) => current + 1);
  }

  function nextDream() {
    if (selectedIndex === null) return;
    goToDream(selectedIndex + 1);
  }

  function prevDream() {
    if (selectedIndex === null) return;
    goToDream(selectedIndex - 1);
  }

  function changeColor() {
    setColorIndex((current) => current + 1);
  }

  function toggleOverlayMode() {
    setOverlayMode((mode) => (mode === "dream" ? "visual" : "dream"));
  }

  function startLongPress() {
    longPressTriggered.current = false;

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      toggleOverlayMode();
    }, 550);
  }

  function endLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }

  function handleDreamTap() {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    const now = Date.now();

    if (now - lastTap.current < 300) {
      closeDream();
      lastTap.current = 0;
      return;
    }

    lastTap.current = now;

    if (overlayMode === "dream") {
      changeColor();
    }
  }

  function renderDreamSlide(token: ChainDreamToken) {
    const dream = dreams[token.tokenId];

    return (
      <div
        key={token.tokenId}
        className="flex h-full w-screen shrink-0 items-center justify-center p-6 text-center"
      >
        {overlayMode === "dream" ? (
          <div className="max-w-5xl">
            <p className="mb-8 text-[10px] tracking-[0.22em] opacity-50">
              TOKEN #{token.tokenId}
            </p>

            <h1 className="cd-headline text-5xl uppercase leading-[1.05] tracking-[0.08em] md:text-8xl">
              {dream?.phrase ?? "LOADING DREAM"}
            </h1>

            <p className="mt-8 text-[10px] tracking-[0.18em] opacity-50">
              TAP COLOR · HOLD VISUAL · DOUBLE TAP CLOSE · SWIPE DREAMS
            </p>
          </div>
        ) : (
          <div className="h-screen w-screen">
            <TokenImage tokenId={token.tokenId} image={token.image} />
            <p className="pointer-events-none fixed bottom-6 left-0 right-0 text-center text-[10px] tracking-[0.18em] opacity-50">
              HOLD DREAM · DOUBLE TAP CLOSE · SWIPE DREAMS
            </p>
          </div>
        )}
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
            <p className="cd-label mb-5">{error}</p>
            <p className="max-w-sm text-xs leading-6 opacity-50">
              SCAN THE APP QR CODE FROM YOUR COLLECTOR PAGE AGAIN.
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
        <div className="grid grid-cols-2 bg-black">
          {tokens.map((token, index) => (
            <button
              key={token.tokenId}
              onClick={() => openDream(index)}
              className="aspect-square overflow-hidden bg-black p-0"
              aria-label={`Open dream ${token.tokenId}`}
            >
              <TokenImage tokenId={token.tokenId} image={token.image} />
            </button>
          ))}
        </div>
      )}

      {selectedToken && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] touch-none select-none overflow-hidden"
          style={{ background: bg, color: fg }}
          onClick={handleDreamTap}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
            startLongPress();
          }}
          onTouchMove={() => {
            endLongPress();
          }}
          onTouchEnd={(event) => {
            endLongPress();

            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX ?? null;

            touchStartX.current = null;

            if (startX === null || endX === null) return;

            const diff = startX - endX;

            if (Math.abs(diff) < 50) return;

            if (diff > 0 && selectedIndex < tokens.length - 1) {
              nextDream();
            }

            if (diff < 0 && selectedIndex > 0) {
              prevDream();
            }
          }}
          onMouseDown={startLongPress}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >
          <div
            className="flex h-screen transition-transform duration-300 ease-out"
            style={{
              width: `${tokens.length * 100}vw`,
              transform: `translateX(-${selectedIndex * 100}vw)`,
            }}
          >
            {tokens.map((token) => renderDreamSlide(token))}
          </div>
        </div>
      )}
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