"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TokenImage } from "@/components/TokenImage";
import type { ChainDreamToken } from "@/lib/metadata";

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

function AppPageContent() {
  const searchParams = useSearchParams();
  const wallet = searchParams.get("wallet");

  const touchStartX = useRef<number | null>(null);
  const lastTap = useRef(0);

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [dreams, setDreams] = useState<Record<string, DreamResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [colorIndex, setColorIndex] = useState(0);

  const selectedToken =
    selectedIndex === null ? null : tokens[selectedIndex] ?? null;

  const selectedDream = selectedToken ? dreams[selectedToken.tokenId] : null;
  const bg = DREAM_COLORS[colorIndex % DREAM_COLORS.length];
  const fg = readableColor(bg);

  const canGoNext = selectedIndex !== null && selectedIndex < tokens.length - 1;
  const canGoPrev = selectedIndex !== null && selectedIndex > 0;

  const hasWallet = useMemo(() => Boolean(wallet), [wallet]);

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
  }

  function closeDream() {
    setSelectedIndex(null);
  }

  function nextDream() {
    setSelectedIndex((current) => {
      if (current === null) return current;
      return Math.min(current + 1, tokens.length - 1);
    });

    setColorIndex((current) => current + 1);
  }

  function prevDream() {
    setSelectedIndex((current) => {
      if (current === null) return current;
      return Math.max(current - 1, 0);
    });

    setColorIndex((current) => current + 1);
  }

  function changeColor() {
    setColorIndex((current) => current + 1);
  }

  function handleDreamTap() {
    const now = Date.now();

    if (now - lastTap.current < 300) {
      closeDream();
      lastTap.current = 0;
      return;
    }

    lastTap.current = now;
    changeColor();
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
            {!hasWallet && (
              <p className="max-w-sm text-xs leading-6 opacity-50">
                OPEN THIS PAGE FROM THE APP QR CODE ON YOUR COLLECTOR PAGE.
              </p>
            )}
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

      {selectedToken && (
        <div
          className="fixed inset-0 z-[9999] flex touch-none select-none items-center justify-center p-6 text-center"
          style={{ background: bg, color: fg }}
          onClick={handleDreamTap}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX ?? null;

            touchStartX.current = null;

            if (startX === null || endX === null) return;

            const diff = startX - endX;

            if (Math.abs(diff) < 50) return;

            if (diff > 0 && canGoNext) {
              nextDream();
            }

            if (diff < 0 && canGoPrev) {
              prevDream();
            }
          }}
        >
          <div className="max-w-5xl">
            <p className="mb-8 text-[10px] tracking-[0.22em] opacity-50">
              TOKEN #{selectedToken.tokenId}
            </p>

            <h1 className="cd-headline text-5xl uppercase leading-[1.05] tracking-[0.08em] md:text-8xl">
              {selectedDream?.phrase ?? "LOADING DREAM"}
            </h1>

            <p className="mt-8 text-[10px] tracking-[0.18em] opacity-50">
              TAP COLOR · DOUBLE TAP CLOSE · SWIPE DREAMS
            </p>
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