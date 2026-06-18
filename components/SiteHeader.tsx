"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { OPENSEA_COLLECTION_URL } from "@/lib/constants";

const nav = [
  { label: "HOME", href: "/" },
  { label: "COLLECTION", href: "/collection" },
  { label: "DREAM", href: "/dream" },
  { label: "REGISTRY", href: "/registry" },
  { label: "WALLET", href: "/collectors" },
];

const ratchetHomeUrl = "https://ratchetvex.xyz/";
const ratchetXUrl = "https://x.com/RatchetVex";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-[#111] bg-black/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-[min(1180px,calc(100vw-32px))] items-center justify-between gap-4 text-[10px] tracking-[0.22em]">
        <Link
          href="/"
          className="cd-link whitespace-nowrap"
          onClick={() => setOpen(false)}
        >
          DREAMS by RATCHET VEX
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="cd-link">
              {item.label}
            </Link>
          ))}

          <a
            href={ratchetHomeUrl}
            target="_blank"
            rel="noreferrer"
            className="cd-link"
          >
            RATCHET
          </a>

          <a
            href={ratchetXUrl}
            target="_blank"
            rel="noreferrer"
            className="cd-link"
          >
            X
          </a>

          <a
            href={OPENSEA_COLLECTION_URL}
            target="_blank"
            rel="noreferrer"
            className="cd-link"
          >
            MINT
          </a>
        </nav>

        <div className="hidden md:block cd-connect">
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
          />
        </div>

        <button
          type="button"
          className="cd-nav-button md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? "CLOSE" : "MENU"}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#111] bg-black md:hidden">
          <div className="mx-auto flex w-[min(1180px,calc(100vw-32px))] flex-col gap-5 py-6 text-[10px] tracking-[0.22em]">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="cd-link"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <a
              href={ratchetHomeUrl}
              target="_blank"
              rel="noreferrer"
              className="cd-link"
              onClick={() => setOpen(false)}
            >
              RATCHET
            </a>

            <a
              href={ratchetXUrl}
              target="_blank"
              rel="noreferrer"
              className="cd-link"
              onClick={() => setOpen(false)}
            >
              X
            </a>

            <a
              href={OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noreferrer"
              className="cd-link"
              onClick={() => setOpen(false)}
            >
              MINT
            </a>

            <div className="cd-connect pt-2">
              <ConnectButton
                showBalance={false}
                chainStatus="none"
                accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}