"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

const C64 = [
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
  cycle: number;
  phrase: string;
};

function tokenPalette(
  tokenId: string
) {
  const seed = Number(tokenId);

  return [
    C64[seed % C64.length],
    C64[(seed + 3) % C64.length],
    C64[(seed + 7) % C64.length],
    C64[(seed + 11) % C64.length],
  ];
}

function textColor(bg: string) {
  return bg === "#000000" ||
    bg === "#40318d" ||
    bg === "#574200"
    ? "#f4f4f4"
    : "#000000";
}

export default function DreamPage() {
  const params =
    useParams<{ tokenId: string }>();

  const tokenId =
    params.tokenId;

  const posterRef =
    useRef<HTMLDivElement>(null);

  const [dream, setDream] =
    useState<DreamResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [palette, setPalette] =
    useState<string[]>([]);

  const [colorIndex, setColorIndex] =
    useState(0);

  const bg =
    palette[
      colorIndex % palette.length
    ] ?? "#000000";

  const fg = textColor(bg);

  useEffect(() => {
    async function loadDream() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/dream/${tokenId}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (!data?.phrase) {
          throw new Error(
            "dream unavailable"
          );
        }

        setDream(data);

        setPalette(
          tokenPalette(tokenId)
        );
      } catch (err) {
        console.error(err);
        setDream(null);
      } finally {
        setLoading(false);
      }
    }

    loadDream();
  }, [tokenId]);

  function nextColor() {
    setColorIndex(
      (i) =>
        (i + 1) %
        palette.length
    );
  }

  useEffect(() => {
    function onKeyDown(
      e: KeyboardEvent
    ) {
      if (
        e.code === "Space" ||
        e.code === "Tab"
      ) {
        e.preventDefault();
        nextColor();
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  });

  async function downloadPNG() {
    if (!posterRef.current)
      return;

    const dataUrl =
      await toPng(
        posterRef.current,
        {
          pixelRatio: 3,
          backgroundColor: bg,
        }
      );

    saveAs(
      dataUrl,
      `dream-${tokenId}.png`
    );
  }

  const phrase =
    dream?.phrase ??
    "dream unavailable";

  const cycle =
    dream?.cycle ?? "-----";

  return (
    <main
      className="min-h-screen"
      style={{
        background: bg,
        color: fg,
      }}
      onClick={nextColor}
    >
      <section
        ref={posterRef}
        className="min-h-screen flex flex-col justify-between px-6 py-6 md:px-10 md:py-8"
      >
        <header className="flex items-center justify-between text-[10px] md:text-xs tracking-[0.22em] opacity-70">
         <Link
  href="/"
  className="hover:opacity-100"
>
  CHAIN DREAMS
</Link>

          <p>
            TOKEN #{tokenId}
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center text-center">
          <h1 className="cd-headline max-w-6xl text-5xl md:text-8xl leading-[1.05] tracking-[0.08em] uppercase">
            {loading
              ? "LOADING DREAM"
              : phrase}
          </h1>
        </div>

        <footer className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between text-[10px] md:text-xs tracking-[0.18em] opacity-75">
          <div>
            <p>
              DAILY DREAM CYCLE{" "}
              {cycle}
            </p>

            <p className="mt-2 opacity-60">
              PRESS SPACE OR TAP
              TO SHIFT SIGNAL
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadPNG();
              }}
              className="border px-4 py-2 hover:opacity-70"
              style={{
                borderColor: fg,
              }}
            >
              DOWNLOAD PNG
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}