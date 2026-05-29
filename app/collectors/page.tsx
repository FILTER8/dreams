"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TokenImage } from "@/components/TokenImage";
import { OPENSEA_COLLECTION_URL } from "@/lib/constants";
import type { ChainDreamToken } from "@/lib/metadata";

export default function CollectorsPage() {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!address || !isConnected) {
        setTokens([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/owner/${address}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "wallet tokens unavailable");
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

  return (
    <main className="cd-page">
      <SiteHeader />
      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-12">
          <p className="cd-label">WALLET</p>
          <h1 className="cd-headline text-4xl tracking-[0.12em] md:text-6xl">WALLET SIGNAL</h1>
        </div>

        {!isConnected && (
          <div className="flex min-h-[50vh] items-center justify-center border border-[#222] p-8 text-center">
            <p className="max-w-xl text-sm leading-8 opacity-60">
              Connect wallet at the top to reveal held Chain Dreams.
            </p>
          </div>
        )}

        {error && <p className="mb-8 border border-[#553] p-4 text-xs tracking-[0.12em] text-[#bfce72]">{error}</p>}
        {loading && <p className="text-xs tracking-[0.2em] opacity-50">FETCHING WALLET TOKENS</p>}

        {isConnected && !loading && tokens.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 border border-[#222] p-8 text-center">
            <p className="text-xs tracking-[0.16em] opacity-60">NO CHAIN DREAMS FOUND IN THIS WALLET</p>
            <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="cd-button">
              OPEN COLLECTION ON OPENSEA
            </a>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tokens.map((token) => (
              <Link key={token.tokenId} href={`/collection/${token.tokenId}`} className="cd-grid-card p-3">
                <TokenImage tokenId={token.tokenId} image={token.image} />
                <div className="mt-4 flex items-center justify-between gap-4 text-[10px] tracking-[0.16em] opacity-70">
                  <span>{token.name}</span>
                  <span>DREAM</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
