"use client";

const CONTRACT = "0x35221D6E9dC3E4a277F40b40f7492BE3b236D380";

const OPENSEA_URL = "https://opensea.io/collection/chain-dreams-1982/overview";

const TOKENS = [1, 2, 3];

const FAQS = [
  ["why 1982 ?", "1982 represents the early era of personal computing, primitive graphics, machine memory, and synthetic imagination. Chain Dreams imagines what on-chain language model artifacts might have looked like if they existed in the early computer age."],
  ["why the c64 colors ?", "The collection uses low-color combinations inspired by Commodore 64 graphics, CRT displays, terminal systems, and early machine interfaces. Limitation becomes identity."],
  ["are the dreams static ?", "The canonical token is permanent, but the daily dream changes through deterministic on-chain dream state."],
  ["what is the dream ?", "Each token emits a daily dream seed. Ratchet interprets that seed through a deterministic semantic system, creating a daily message for holders."],
  ["what can agents do ?", "Agents can query dream state, read artifact data, and build memory systems around persistent synthetic artifacts."],
  ["is everything fully on-chain ?", "The NFT, metadata, SVG artifact, and dream state are generated directly from Ethereum smart contracts. No IPFS. No external image hosting. No centralized metadata server."],
];

function tokenUrl(id: number) {
  return `https://opensea.io/assets/ethereum/${CONTRACT}/${id}`;
}

export default function Page() {
  return (
    <main className="bg-black text-[#d8d8d8]">
      <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between px-6 py-5 text-xs tracking-[0.22em]">
        <a href="#home" className="opacity-80 hover:opacity-100">
          DREAMS by RATCHET VEX
        </a>

        <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100">
          MINT
        </a>
      </header>

      <section id="home" className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] mb-8">1982</p>

        <h1 className="cd-headline text-7xl md:text-8xl tracking-[0.18em] leading-tight">
          CHAIN
          <br />
          DREAMS
        </h1>

        <p className="mt-8 text-xl tracking-[0.28em]">
          PERSISTENT SYNTHETIC ARTIFACTS
        </p>

        <a
          href={OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          className="cd-button mt-10 inline-block"
        >
          MINT ON OPENSEA · 0.002 ETH
        </a>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-12">
          LIVE ARTIFACTS
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {TOKENS.map((id) => (
            <a
              key={id}
              href={tokenUrl(id)}
              target="_blank"
              rel="noreferrer"
              className="group border border-[#222] p-4 hover:border-[#777] transition-colors"
            >
              <div className="aspect-square bg-black border border-[#111] overflow-hidden">
                <img
                  src={`/tokens/${id}.svg`}
                  alt={`Chain Dreams C64 #${id}`}
                  className="w-full h-full object-contain cd-pixel"
                />
              </div>

              <div className="mt-5 flex items-center justify-between text-xs tracking-[0.18em] opacity-70 group-hover:opacity-100">
                <span>CHAIN DREAMS #{id}</span>
                <span>OPENSEA</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">DAILY DREAM</p>

        <h2 className="cd-headline text-4xl md:text-6xl tracking-[0.12em] leading-tight max-w-5xl">
          THE TOKEN IS FIXED.
          <br />
          THE DREAM EVOLVES.
        </h2>

        <p className="mt-8 max-w-2xl text-sm md:text-base leading-8 opacity-60">
          Each artifact exposes a daily on-chain dream seed. Ratchet interprets
          that seed through a deterministic semantic system, creating a new
          holder-facing dream signal every cycle.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {TOKENS.map((id) => (
            <a
              key={id}
              href={`/dream/${id}`}
              className="cd-card hover:opacity-80"
            >
              <p className="cd-label">DAILY DREAM</p>
              <p>OPEN TOKEN #{id}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">MINT</p>

        <h2 className="cd-headline text-4xl md:text-6xl tracking-[0.12em] leading-tight">
          PUBLIC
          <br />
          SIGNAL
        </h2>

        <p className="mt-8 max-w-xl text-sm leading-8 opacity-60">
          Public mint is live on OpenSea.
        </p>

        <a
          href={OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          className="cd-button mt-10 inline-block"
        >
          MINT · 0.002 ETH
        </a>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="cd-card"><p className="cd-label">SUPPLY</p><p>1982</p></div>
          <div className="cd-card"><p className="cd-label">PUBLIC PRICE</p><p>0.002 ETH</p></div>
          <div className="cd-card"><p className="cd-label">MINT</p><p>OPENSEA</p></div>
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-8">AGENTS</p>

        <h2 className="cd-headline text-4xl md:text-6xl tracking-[0.12em] leading-tight">
          MACHINE
          <br />
          READABLE
        </h2>

        <p className="mt-8 max-w-2xl text-sm md:text-base leading-8 opacity-60">
          Chain Dreams is moving toward a deterministic learned semantic system:
          on-chain entropy, persistent memory, and synthetic interpretation for
          agents, holders, and physical devices.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="cd-card">
            <p className="cd-label">DREAM</p>
            <p>/api/dream/:tokenId</p>
          </div>

          <div className="cd-card">
            <p className="cd-label">DEVICE</p>
            <p>/api/device/:tokenId</p>
          </div>

          <div className="cd-card">
            <p className="cd-label">MEMORY</p>
            <p>future registry</p>
          </div>
        </div>

        <p className="mt-10 max-w-xl text-xs leading-6 opacity-40">
          A network of persistent synthetic artifacts.
        </p>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32">
        <p className="text-xl tracking-[0.5em] opacity-80 mb-12">FAQ</p>

        <div className="w-full max-w-4xl flex flex-col border-t border-[#222]">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group border-b border-[#222] py-6">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-6">
                <span className="cd-headline text-xl md:text-2xl tracking-[0.12em]">
                  {q}
                </span>
                <span className="text-xl opacity-50 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>

              <p className="mt-6 max-w-3xl text-sm leading-8 opacity-60">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#222] px-6 py-6 text-[10px] tracking-[0.18em] opacity-75 flex flex-col gap-3 md:flex-row md:justify-between">
        <p>2026 ON-CHAIN AGENT RATCHET VEX by filter8</p>

        <p>
          <a href="https://x.com/0xfilter8" target="_blank" rel="noreferrer" className="hover:opacity-100">
            X : FILTER8 /{" "}
          </a>
          <a href="https://x.com/0xdiid" target="_blank" rel="noreferrer" className="hover:opacity-100">
            LLM inference by @0xdiid
          </a>
        </p>
      </footer>
    </main>
  );
}