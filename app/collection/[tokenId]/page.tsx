"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TokenImage } from "@/components/TokenImage";
import { openseaTokenUrl } from "@/lib/constants";
import type { ChainDreamToken } from "@/lib/metadata";

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
  dreamSeed?: string;
  motion?: {
    orbitSpeed?: string;
    driftSpeed?: string;
    ditherTempo?: string;
  };
};

const C64_BACKGROUND_COLORS: Record<string, string> = {
  Black: "#000000",
  White: "#ffffff",
  Red: "#883932",
  Cyan: "#67b6bd",
  Purple: "#8b3f96",
  Green: "#55a049",
  Blue: "#40318d",
  Yellow: "#bfce72",
  Orange: "#8b5429",
  Brown: "#574200",
  "Light Red": "#b86962",
  "Dark Gray": "#505050",
  Gray: "#787878",
  "Light Green": "#94e089",
  "Light Blue": "#7869c4",
  "Light Gray": "#9f9f9f",
};

export default function TokenPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params.tokenId;
  const artRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const [token, setToken] = useState<ChainDreamToken | null>(null);
  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [tokenRes, dreamRes] = await Promise.all([
          fetch(`/api/token/${tokenId}`, { cache: "no-store" }),
          fetch(`/api/dream/${tokenId}`, { cache: "no-store" }),
        ]);

        const tokenData = await tokenRes.json();
        const dreamData = await dreamRes.json();

        if (tokenRes.ok) setToken(tokenData);
        if (dreamRes.ok) setDream(dreamData);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tokenId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeFullscreen();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function openFullscreen() {
    setFullscreen(true);

    requestAnimationFrame(async () => {
      try {
        await fullscreenRef.current?.requestFullscreen?.();
      } catch {
        // Browser may block fullscreen unless triggered by direct user gesture.
      }
    });
  }

  async function closeFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen exit errors.
    }

    setFullscreen(false);
  }

  async function exportPNG() {
    if (!artRef.current) return;

    const dataUrl = await toPng(artRef.current, {
      pixelRatio: 3,
      backgroundColor: "#000000",
    });

    saveAs(dataUrl, `chain-dreams-${tokenId}.png`);
  }

  const traits = token?.attributes ?? [];

  const backgroundTrait = traits.find(
    (attr) => attr.trait_type.toLowerCase() === "background"
  )?.value;

  const fullscreenBg =
    C64_BACKGROUND_COLORS[String(backgroundTrait)] ?? "#000000";

  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="cd-label">TOKEN</p>
            <h1 className="cd-headline text-4xl tracking-[0.12em] md:text-6xl">
              CHAIN DREAMS #{tokenId}
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] tracking-[0.16em]">
            <Link href={`/dream/${tokenId}`} className="cd-button">
              DREAM PAGE
            </Link>

            <a
              href={openseaTokenUrl(tokenId)}
              target="_blank"
              rel="noreferrer"
              className="cd-button"
            >
              OPENSEA
            </a>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-black">
            <div
              ref={artRef}
              className="mx-auto aspect-square w-full overflow-hidden bg-black"
            >
              <TokenImage
                tokenId={tokenId}
                image={token?.image}
                animated={false}
                framed={false}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={openFullscreen} className="cd-button">
                FULLSCREEN
              </button>

              <button onClick={exportPNG} className="cd-button">
                EXPORT PNG
              </button>
            </div>

            <p className="mt-4 text-[10px] tracking-[0.16em] opacity-40">
              DOUBLE TAP OR ESC TO CLOSE FULLSCREEN
            </p>
          </div>

          <aside className="flex flex-col border border-[#222] p-6">
            <div>
              <p className="cd-label">CURRENT DREAM</p>

              <p className="cd-headline text-2xl leading-relaxed tracking-[0.08em] md:text-4xl">
                {dream?.phrase ??
                  (loading ? "LOADING DREAM" : "DREAM UNAVAILABLE")}
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 text-xs tracking-[0.12em] opacity-70 sm:grid-cols-2">
                <div className="cd-card">
                  <p className="cd-label">CYCLE</p>
                  <p>{dream?.cycle ?? "-----"}</p>
                </div>

                <div className="cd-card">
                  <p className="cd-label">ORBIT</p>
                  <p>{dream?.motion?.orbitSpeed ?? "--"}</p>
                </div>

                <div className="cd-card">
                  <p className="cd-label">DRIFT</p>
                  <p>{dream?.motion?.driftSpeed ?? "--"}</p>
                </div>

                <div className="cd-card">
                  <p className="cd-label">DITHER</p>
                  <p>{dream?.motion?.ditherTempo ?? "--"}</p>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <p className="cd-label">TRAITS</p>
                  <p className="text-xs tracking-[0.18em] opacity-50">
                    {traits.length}
                  </p>
                </div>

                <div className="border border-[#222]">
                  <div className="grid grid-cols-[0.9fr_1.1fr] border-b border-[#222] px-4 py-3 text-[10px] tracking-[0.18em] opacity-50">
                    <p>ATTRIBUTE</p>
                    <p>TRAIT</p>
                  </div>

                  {traits.length > 0 ? (
                    traits.map((attr, i) => (
                      <div
                        key={`${attr.trait_type}-${attr.value}`}
                        className={`grid grid-cols-[0.9fr_1.1fr] px-4 py-3 text-sm tracking-[0.08em] ${
                          i % 2 === 1 ? "bg-white/5" : ""
                        }`}
                      >
                        <p>{attr.trait_type}</p>
                        <p>{String(attr.value)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm tracking-[0.12em] opacity-50">
                      TRAITS UNAVAILABLE
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />

      {fullscreen && (
        <div
          ref={fullscreenRef}
          onDoubleClick={closeFullscreen}
          onTouchEnd={(e) => {
            if (e.detail === 2) closeFullscreen();
          }}
          className="fixed inset-0 z-[9999]"
          style={{ background: fullscreenBg }}
        >
          <button
            onClick={closeFullscreen}
            className="absolute right-4 top-4 z-20 border border-[#333] bg-black/70 px-4 py-2 text-[10px] tracking-[0.18em] opacity-60 hover:opacity-100"
          >
            CLOSE
          </button>

          <div className="absolute left-4 top-4 z-20 text-[10px] tracking-[0.18em] opacity-40">
            CHAIN DREAMS #{tokenId}
          </div>

          <div className="h-screen w-screen overflow-hidden">
            <div className="flex h-full w-full items-center justify-center">
              <div className="aspect-square h-[min(100vh,100vw)] w-[min(100vh,100vw)]">
                <TokenImage
                  tokenId={tokenId}
                  image={token?.image}
                  animated={false}
                  framed={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}