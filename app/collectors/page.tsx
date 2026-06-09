"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { useAccount } from "wagmi";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TokenImage } from "@/components/TokenImage";
import { OPENSEA_COLLECTION_URL } from "@/lib/constants";
import type { ChainDreamToken } from "@/lib/metadata";

type ExportMode = 2 | 3 | 4 | "all";
type DisplayMode = "image" | "dream";

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
  dreamSeed?: string;
};

export default function CollectorsPage() {
  const { address, isConnected } = useAccount();
  const exportRef = useRef<HTMLDivElement>(null);

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayMode, setDisplayMode] = useState<DisplayMode>("image");
  const [dreams, setDreams] = useState<Record<string, DreamResponse>>({});
  const [dreamsLoading, setDreamsLoading] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>(3);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!address || !isConnected) {
        setTokens([]);
        setDreams({});
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/owner/${address}`, {
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

    load();
  }, [address, isConnected]);

  useEffect(() => {
    async function loadDreams() {
      if (displayMode !== "dream" || tokens.length === 0) return;

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
            if (result) {
              next[result[0]] = result[1];
            }
          }

          return next;
        });
      } finally {
        setDreamsLoading(false);
      }
    }

    loadDreams();
  }, [displayMode, tokens, dreams]);

  const exportCount =
    exportMode === "all"
      ? tokens.length
      : Math.min(tokens.length, exportMode * exportMode);

  const exportColumns =
    exportMode === "all"
      ? Math.ceil(Math.sqrt(Math.max(tokens.length, 1)))
      : exportMode;

  const exportTokens = tokens.slice(0, exportCount);

  async function exportGrid(mode: ExportMode) {
    if (!exportRef.current) return;

    try {
      setExporting(true);
      setExportMode(mode);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 350));

      const label = mode === "all" ? "all" : `${mode}x${mode}`;
      const displayLabel = displayMode === "dream" ? "dreams" : "images";

      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        backgroundColor: "#000000",
        cacheBust: true,
        skipAutoScale: true,
      });

      saveAs(dataUrl, `chain-dreams-wallet-${displayLabel}-${label}.png`);
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  }

  function DreamTile({
    token,
    large = false,
  }: {
    token: ChainDreamToken;
    large?: boolean;
  }) {
    const dream = dreams[token.tokenId];

    return (
      <div className="flex aspect-square h-full w-full items-center justify-center bg-black p-6 text-center">
        <p
          className={`cd-headline uppercase leading-tight tracking-[0.08em] ${
            large ? "text-6xl" : "text-xl md:text-2xl"
          }`}
        >
          {dream?.phrase ?? (dreamsLoading ? "LOADING DREAM" : "DREAM")}
        </p>
      </div>
    );
  }

  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="cd-label">WALLET</p>

            <div className="flex flex-wrap items-center gap-4">
              <h1 className="cd-headline text-4xl tracking-[0.12em] md:text-6xl">
                WALLET SIGNAL
              </h1>

              {tokens.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      setDisplayMode((mode) =>
                        mode === "image" ? "dream" : "image",
                      )
                    }
                    className="cd-button"
                  >
                    {displayMode === "image" ? "SHOW DREAMS" : "SHOW IMAGES"}
                  </button>

                  <button
                    onClick={() => setExportOpen(true)}
                    className="cd-button"
                  >
                    EXPORT GRID
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border border-[#222] px-5 py-4 text-right text-xs tracking-[0.18em]">
            <p className="cd-label mb-2">HELD</p>
            <p>{tokens.length} TOKENS</p>
          </div>
        </div>

        {!isConnected && (
          <div className="flex min-h-[50vh] items-center justify-center border border-[#222] p-8 text-center">
            <p className="max-w-xl text-sm leading-8 opacity-60">
              Connect wallet at the top to reveal held Chain Dreams.
            </p>
          </div>
        )}

        {error && (
          <p className="mb-8 border border-[#553] p-4 text-xs tracking-[0.12em] text-[#bfce72]">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-xs tracking-[0.2em] opacity-50">
            FETCHING WALLET TOKENS
          </p>
        )}

        {isConnected && displayMode === "dream" && dreamsLoading && (
          <p className="mb-8 text-xs tracking-[0.2em] opacity-50">
            FETCHING TODAY DREAMS
          </p>
        )}

        {isConnected && !loading && tokens.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 border border-[#222] p-8 text-center">
            <p className="text-xs tracking-[0.16em] opacity-60">
              NO CHAIN DREAMS FOUND IN THIS WALLET
            </p>

            <a
              href={OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noreferrer"
              className="cd-button"
            >
              OPEN COLLECTION ON OPENSEA
            </a>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tokens.map((token) => (
              <Link
                key={token.tokenId}
                href={`/collection/${token.tokenId}`}
                className="cd-grid-card p-3"
              >
                {displayMode === "image" ? (
                  <TokenImage tokenId={token.tokenId} image={token.image} />
                ) : (
                  <DreamTile token={token} />
                )}

                <div className="mt-4 flex items-center justify-between gap-4 text-[10px] tracking-[0.16em] opacity-70">
                  <span>{token.name}</span>
                  <span>{displayMode === "image" ? "DREAM" : "TODAY"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {exportOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm border border-[#222] bg-black p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="cd-label">
                EXPORT WALLET {displayMode === "dream" ? "DREAMS" : "GRID"}
              </p>

              <button
                onClick={() => setExportOpen(false)}
                disabled={exporting}
                className="text-[10px] tracking-[0.18em] opacity-50 hover:opacity-100 disabled:opacity-20"
              >
                CLOSE
              </button>
            </div>

            <div className="grid gap-3">
              {[2, 3, 4].map((size) => (
                <button
                  key={size}
                  onClick={() => exportGrid(size as 2 | 3 | 4)}
                  disabled={exporting || tokens.length < size * size}
                  className="cd-button disabled:opacity-40"
                >
                  {exporting && exportMode === size
                    ? "EXPORTING"
                    : `${size}x${size}`}
                </button>
              ))}

              <button
                onClick={() => exportGrid("all")}
                disabled={exporting || tokens.length === 0}
                className="cd-button disabled:opacity-40"
              >
                {exporting && exportMode === "all"
                  ? "EXPORTING"
                  : `ALL ${tokens.length} TOKENS`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed -left-[9999px] top-0">
        <div
          ref={exportRef}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${exportColumns}, 1024px)`,
            width: `${exportColumns * 1024}px`,
            background: "#000000",
            gap: 0,
            overflow: "hidden",
            lineHeight: 0,
          }}
        >
          {exportTokens.map((token) => (
            <div
              key={`export-${token.tokenId}`}
              style={{
                width: "1024px",
                height: "1024px",
                overflow: "hidden",
                background: "#000000",
                margin: 0,
                padding: 0,
                display: "block",
              }}
            >
              {displayMode === "image" ? (
                <TokenImage tokenId={token.tokenId} image={token.image} />
              ) : (
                <DreamTile token={token} large />
              )}
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}