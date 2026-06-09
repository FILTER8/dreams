"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { SiteHeader } from "@/components/SiteHeader";
import { TokenImage } from "@/components/TokenImage";
import type { ChainDreamToken } from "@/lib/metadata";

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
};

export default function AppPage() {
  const { address, isConnected } = useAccount();

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [dreams, setDreams] = useState<Record<string, DreamResponse>>({});
  const [loading, setLoading] = useState(false);
  const [dreamsLoading, setDreamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWalletTokens() {
      if (!address || !isConnected) {
        setTokens([]);
        setDreams({});
        setError(null);
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
        setDreams({});
        setError(err instanceof Error ? err.message : "wallet tokens unavailable");
      } finally {
        setLoading(false);
      }
    }

    loadWalletTokens();
  }, [address, isConnected]);

  useEffect(() => {
    async function loadDreams() {
      if (!isConnected || tokens.length === 0) return;

      try {
        setDreamsLoading(true);

        const results = await Promise.all(
          tokens.map(async (token) => {
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

        const nextDreams: Record<string, DreamResponse> = {};

        for (const result of results) {
          if (result) {
            nextDreams[result[0]] = result[1];
          }
        }

        setDreams(nextDreams);
      } finally {
        setDreamsLoading(false);
      }
    }

    loadDreams();
  }, [isConnected, tokens]);

  return (
    <main className="cd-page min-h-screen">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-10">
          <p className="cd-label">CHAIN DREAMS APP</p>

          <h1 className="cd-headline mt-3 text-4xl tracking-[0.12em] md:text-6xl">
            WALLET DREAMS
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 opacity-60">
            Save this page to your iPhone Home Screen and open your collector
            dreams like an app.
          </p>
        </div>

        {!isConnected && (
          <div className="flex min-h-[45vh] items-center justify-center border border-[#222] p-8 text-center">
            <div className="flex flex-col items-center">
              <p className="cd-label mb-4">CONNECT WALLET</p>

              <p className="max-w-xl text-sm leading-8 opacity-60">
                Connect your wallet to reveal your held Chain Dreams.
              </p>

              <div className="mt-8">
                <ConnectButton />
              </div>
            </div>
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

        {isConnected && !loading && tokens.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-[#222] px-5 py-4 text-xs tracking-[0.18em]">
            <p>{tokens.length} DREAMS HELD</p>
            <p className="opacity-50">
              {dreamsLoading ? "LOADING TODAY DREAMS" : "TODAY DREAMS ONLINE"}
            </p>
          </div>
        )}

        {isConnected && !loading && tokens.length === 0 && (
          <div className="flex min-h-[40vh] items-center justify-center border border-[#222] p-8 text-center">
            <p className="text-xs tracking-[0.16em] opacity-60">
              NO CHAIN DREAMS FOUND IN THIS WALLET
            </p>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {tokens.map((token) => (
              <Link
                key={token.tokenId}
                href={`/dream/${token.tokenId}`}
                className="cd-grid-card p-3"
              >
                <TokenImage tokenId={token.tokenId} image={token.image} />

                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between gap-4 text-[10px] tracking-[0.16em] opacity-70">
                    <span>{token.name}</span>
                    <span>OPEN</span>
                  </div>

                  <p className="cd-headline text-xl uppercase leading-tight tracking-[0.08em]">
                    {dreams[token.tokenId]?.phrase ??
                      (dreamsLoading ? "LOADING DREAM" : "DREAM SIGNAL")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}