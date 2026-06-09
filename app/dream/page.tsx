"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DreamResponse = {
  tokenId: string;
  cycle: string | number;
  phrase: string;
  dreamSeed?: string;
};

type CollectionResponse = {
  totalSupply?: number | null;
};

export default function DreamDiscoveryPage() {
  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [totalSupply, setTotalSupply] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function randomTokenId(supply: number) {
    return String(Math.floor(Math.random() * Math.max(supply, 1)) + 1);
  }

  async function loadRandomDream(nextSupply = totalSupply) {
    try {
      setLoading(true);
      setError(null);

      const tokenId = randomTokenId(nextSupply);

      const res = await fetch(`/api/dream/${tokenId}`, {
        cache: "no-store",
      });

      const data = (await res.json()) as DreamResponse;

      if (!res.ok) {
        throw new Error("dream unavailable");
      }

      setDream(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "dream unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const res = await fetch("/api/collection?pageSize=1", {
          cache: "no-store",
        });

        const data = (await res.json()) as CollectionResponse;
        const supply = Math.max(Number(data.totalSupply ?? 1), 1);

        setTotalSupply(supply);
        await loadRandomDream(supply);
      } catch {
        setTotalSupply(1);
        await loadRandomDream(1);
      }
    }

    init();
  }, []);

  return (
    <main className="cd-page">
      <section className="cd-shell flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
        <p className="cd-label mb-6">DREAM DISCOVERY</p>

        <h1 className="cd-headline max-w-6xl text-5xl uppercase leading-[1.05] tracking-[0.08em] md:text-8xl">
          {loading
            ? "TUNING DREAM SIGNAL"
            : dream?.phrase ?? "DREAM UNAVAILABLE"}
        </h1>

        <div className="mt-10 text-[10px] tracking-[0.18em] opacity-50">
          {dream ? (
            <p>
              TOKEN #{dream.tokenId} · CYCLE {dream.cycle} · {totalSupply} DREAMS
              ONLINE
            </p>
          ) : (
            <p>{totalSupply} DREAMS ONLINE</p>
          )}
        </div>

        {error && (
          <p className="mt-6 border border-[#553] p-4 text-xs tracking-[0.12em] text-[#bfce72]">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => loadRandomDream()}
            disabled={loading}
            className="cd-button disabled:opacity-40"
          >
            {loading ? "LOADING" : "ANOTHER DREAM"}
          </button>

          {dream && (
            <>
              <Link href={`/dream/${dream.tokenId}`} className="cd-button">
                VIEW DREAM
              </Link>

              <Link
                href={`/collection/${dream.tokenId}`}
                className="cd-button"
              >
                TOKEN PAGE
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}