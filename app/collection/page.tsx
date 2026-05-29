"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

async function fetchCollection(next?: string | null): Promise<CollectionResponse> {
  const url = next
    ? `/api/collection?pageKey=${encodeURIComponent(next)}`
    : "/api/collection";

  const res = await fetch(url);
  const data = (await res.json()) as CollectionResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "collection unavailable");
  }

  return data;
}

export default function CollectionPage() {
  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [maxSupply, setMaxSupply] = useState(1982);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    fetchCollection()
      .then((data) => {
        if (ignore) return;

        const incoming = (data.tokens ?? []).filter(
          (token) => Boolean(token.image)
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

  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="cd-label">COLLECTION</p>
            <h1 className="cd-headline text-4xl tracking-[0.12em] md:text-6xl">
              ALL TOKENS
            </h1>
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

      <SiteFooter />
    </main>
  );
}