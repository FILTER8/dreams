import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OPENSEA_COLLECTION_URL, openseaTokenUrl } from "@/lib/constants";

const TOKENS = [1, 2, 3];

const FAQS = [
  ["why 1982 ?", "1982 represents the early era of personal computing, primitive graphics, machine memory, and synthetic imagination. Chain Dreams imagines what on-chain language model artifacts might have looked like if they existed in the early computer age."],
  ["why the c64 colors ?", "The collection uses low-color combinations inspired by Commodore 64 graphics, CRT displays, terminal systems, and early machine interfaces. Limitation becomes identity."],
  ["are the dreams static ?", "The canonical token is permanent, but the daily dream changes through deterministic on-chain dream state."],
  ["what is the dream ?", "Each token emits a daily dream seed. Ratchet interprets that seed through a deterministic semantic system, creating a daily message for holders."],
  ["what can agents do ?", "Agents can query dream state, read artifact data, and build memory systems around persistent synthetic artifacts."],
  ["is everything fully on-chain ?", "The NFT, metadata, SVG artifact, and dream state are generated directly from Ethereum smart contracts. No IPFS. No external image hosting. No centralized metadata server."],
];

export default function Page() {
  return (
    <main className="cd-page">
      <SiteHeader />

      <section id="home" className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 text-center">
        <p className="mb-8 text-xl tracking-[0.5em]">1982</p>
        <h1 className="cd-headline text-7xl md:text-8xl tracking-[0.18em] leading-tight">
          CHAIN<br />DREAMS
        </h1>
        <p className="mt-8 text-xl tracking-[0.28em]">PERSISTENT SYNTHETIC ARTIFACTS</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="cd-button inline-block">
            MINT ON OPENSEA · 0.002 ETH
          </a>
          <Link href="/collection" className="cd-button inline-block">
            VIEW COLLECTION
          </Link>
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="mb-12 text-xl tracking-[0.5em] opacity-80">LIVE ARTIFACTS</p>
        <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {TOKENS.map((id) => (
            <Link key={id} href={`/collection/${id}`} className="group border border-[#222] p-4 transition-colors hover:border-[#777]">
              <div className="aspect-square overflow-hidden border border-[#111] bg-black">
                <img src={`/tokens/${id}.svg`} alt={`Chain Dreams C64 #${id}`} className="cd-pixel h-full w-full object-contain" />
              </div>
              <div className="mt-5 flex items-center justify-between text-xs tracking-[0.18em] opacity-70 group-hover:opacity-100">
                <span>CHAIN DREAMS #{id}</span>
                <span>OPEN</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="mb-8 text-xl tracking-[0.5em] opacity-80">DAILY DREAM</p>
        <h2 className="cd-headline max-w-5xl text-4xl leading-tight tracking-[0.12em] md:text-6xl">
          THE TOKEN IS FIXED.<br />THE DREAM EVOLVES.
        </h2>
        <p className="mt-8 max-w-2xl text-sm leading-8 opacity-60 md:text-base">
          Each artifact exposes a daily on-chain dream seed. Ratchet interprets that seed through a deterministic semantic system, creating a new holder-facing dream signal every cycle.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 text-left md:grid-cols-3">
          {TOKENS.map((id) => (
            <Link key={id} href={`/dream/${id}`} className="cd-card hover:opacity-80">
              <p className="cd-label">DAILY DREAM</p>
              <p>OPEN TOKEN #{id}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="mb-8 text-xl tracking-[0.5em] opacity-80">COLLECTORS</p>
        <h2 className="cd-headline text-4xl leading-tight tracking-[0.12em] md:text-6xl">
          CONNECT<br />THE WALLET
        </h2>
        <p className="mt-8 max-w-xl text-sm leading-8 opacity-60">
          View the Chain Dreams held by a connected wallet, then open each token, image, animation, and dream.
        </p>
        <Link href="/collectors" className="cd-button mt-10 inline-block">
          OPEN COLLECTORS TAB
        </Link>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="mb-8 text-xl tracking-[0.5em] opacity-80">MINT</p>
        <h2 className="cd-headline text-4xl leading-tight tracking-[0.12em] md:text-6xl">PUBLIC<br />SIGNAL</h2>
        <p className="mt-8 max-w-xl text-sm leading-8 opacity-60">Public mint is live on OpenSea.</p>
        <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="cd-button mt-10 inline-block">MINT · 0.002 ETH</a>
        <div className="mt-12 grid grid-cols-1 gap-4 text-left md:grid-cols-3">
          <div className="cd-card"><p className="cd-label">SUPPLY</p><p>1982</p></div>
          <div className="cd-card"><p className="cd-label">PUBLIC PRICE</p><p>0.002 ETH</p></div>
          <div className="cd-card"><p className="cd-label">MINT</p><p>OPENSEA</p></div>
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32">
        <p className="mb-12 text-xl tracking-[0.5em] opacity-80">FAQ</p>
        <div className="flex w-full max-w-4xl flex-col border-t border-[#222]">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group border-b border-[#222] py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <span className="cd-headline text-xl tracking-[0.12em] md:text-2xl">{q}</span>
                <span className="text-xl opacity-50 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-6 max-w-3xl text-sm leading-8 opacity-60">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
