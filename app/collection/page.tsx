"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TokenImage } from "@/components/TokenImage";
import type { ChainDreamToken } from "@/lib/metadata";

type CollectionResponse = {
  tokens?: ChainDreamToken[];
  pageKey?: string | null;
  totalSupply?: number | null;
  maxSupply?: number;
  error?: string;
};

type ExportGridSize = 2 | 3 | 4;

async function fetchCollection(next?: string | null): Promise<CollectionResponse> {
  const url = next
    ? `/api/collection?offset=${encodeURIComponent(next)}`
    : "/api/collection";

  const res = await fetch(url);
  const data = (await res.json()) as CollectionResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "collection unavailable");
  }

  return data;
}

export default function CollectionPage() {
  const exportRef = useRef<HTMLDivElement>(null);

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [maxSupply, setMaxSupply] = useState(1982);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportGrid, setExportGrid] = useState<ExportGridSize>(3);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let ignore = false;

    fetchCollection()
      .then((data) => {
        if (ignore) return;

        const incoming = (data.tokens ?? []).filter((token) =>
          Boolean(token.image)
        );

        setTokens(incoming);
        setPageKey(data.pageKey ?? null);
        setTotalSupply(data.totalSupply ?? null);

        if (typeof data.maxSupply === "number") {
          setMaxSupply(data.maxSupply);
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "collection unavailable");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function loadMore() {
    if (!pageKey) return;

    try {
      setLoadingMore(true);
      setError(null);

      const data = await fetchCollection(pageKey);

      const incoming = (data.tokens ?? []).filter((token) =>
        Boolean(token.image)
      );

      setTokens((prev) => [...prev, ...incoming]);
      setPageKey(data.pageKey ?? null);

      if (typeof data.totalSupply === "number") {
        setTotalSupply(data.totalSupply);
      }

      if (typeof data.maxSupply === "number") {
        setMaxSupply(data.maxSupply);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "collection unavailable");
    } finally {
      setLoadingMore(false);
    }
  }

  async function exportLatestGrid(size: ExportGridSize) {
    if (!exportRef.current) return;

    try {
      setExporting(true);
      setExportGrid(size);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 250));

      const dataUrl = await toPng(exportRef.current, {
  pixelRatio: 2,
  backgroundColor: "#000000",
  cacheBust: true,
  skipAutoScale: true,
});

      saveAs(dataUrl, `chain-dreams-latest-${size}x${size}.png`);
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  }

  const exportTokens = tokens.slice(0, exportGrid * exportGrid);

  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="cd-label">COLLECTION</p>

            <div className="flex flex-wrap items-center gap-4">
              <h1 className="cd-headline text-4xl tracking-[0.12em] md:text-6xl">
                ALL TOKENS
              </h1>

              <button
                onClick={() => setExportOpen(true)}
                disabled={loading || tokens.length === 0}
                className="cd-button disabled:opacity-40"
              >
                EXPORT GRID
              </button>
            </div>
          </div>

          <div className="border border-[#222] px-5 py-4 text-right text-xs tracking-[0.18em]">
            <p className="cd-label mb-2">SUPPLY</p>
            <p>
              {totalSupply ?? "---"} / {maxSupply}
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-8 border border-[#553] p-4 text-xs tracking-[0.12em] text-[#bfce72]">
            {error}
          </p>
        )}

        {loading && tokens.length === 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cd-grid-card p-3">
                <div className="aspect-square border border-[#111] bg-[#030303]" />
                <div className="mt-4 flex items-center justify-between text-[10px] tracking-[0.16em] opacity-30">
                  <span>LOADING SIGNAL</span>
                  <span>---</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tokens.map((token) => (
              <Link
                key={token.tokenId}
                href={`/collection/${token.tokenId}`}
                className="cd-grid-card p-3"
              >
                <TokenImage tokenId={token.tokenId} image={token.image} />

                <div className="mt-4 flex items-center justify-between gap-4 text-[10px] tracking-[0.16em] opacity-70">
                  <span>{token.name}</span>
                  <span>OPEN</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pageKey && !loading && (
          <div className="mt-12 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="cd-button disabled:opacity-40"
            >
              {loadingMore ? "LOADING" : "LOAD MORE"}
            </button>
          </div>
        )}
      </section>

      {exportOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm border border-[#222] bg-black p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="cd-label">EXPORT LATEST GRID</p>

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
                  onClick={() => exportLatestGrid(size as ExportGridSize)}
                  disabled={exporting || tokens.length < size * size}
                  className="cd-button disabled:opacity-40"
                >
                  {exporting && exportGrid === size
                    ? "EXPORTING"
                    : `${size}x${size}`}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[10px] leading-relaxed tracking-[0.14em] opacity-40">
              EXPORTS THE LATEST TOKENS CURRENTLY LOADED.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed -left-[9999px] top-0">
       <div
  ref={exportRef}
  style={{
    display: "grid",
    gridTemplateColumns: `repeat(${exportGrid}, 1024px)`,
    width: `${exportGrid * 1024}px`,
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
              <TokenImage tokenId={token.tokenId} image={token.image} />
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}