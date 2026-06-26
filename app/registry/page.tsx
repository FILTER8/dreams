import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const CHAIN_DREAMS_CONTRACT =
  "0x35221d6e9dc3e4a277f40b40f7492be3b236d380";

const REGISTRY_CONTRACT =
  "0x265BB2DBFC0A8165C9A1941Eb1372F349baD2cf1";

const PREDICATE_CONTRACT =
  "0xc8721c9A776958FfFfEb602DA1b708bf1D318379";

const BASE_URL = "https://dreams.ratchetvex.xyz";

const tools = [
  {
    id: "38",
    name: "Chain Dream Lookup",
    slug: "chain-dream-lookup",
    label: "CURRENT DREAM",
    description:
      "Reads the current dream state of a token, including phrase, cycle, dream seed, motion data, visual traits, owner, and Ratchet Vex agent context.",
    manifest: `${BASE_URL}/.well-known/ai-tool/chain-dream-lookup.json`,
    endpoint: `${BASE_URL}/api/tools/chain-dream-lookup`,
    hash: "0xa086b0b5637011b1f6f44ff87ca3a3683ea0266c4d6aabd775d693d9d379f7d9",
  },
  {
    id: "39",
    name: "Chain Dream History",
    slug: "chain-dream-history",
    label: "DREAM MEMORY",
    description:
      "Reads the historical memory of a token across dream cycles, including previous phrases, dream seeds, motion history, and dreamer metadata.",
    manifest: `${BASE_URL}/.well-known/ai-tool/chain-dream-history.json`,
    endpoint: `${BASE_URL}/api/tools/chain-dream-history`,
    hash: "0x1ccd1195d2eb157b80c74932af6dc229a06b586934a4ff46840e4e945f0fd9ca",
  },
];

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all underline decoration-[#333] underline-offset-4 hover:opacity-100"
    >
      {children}
    </a>
  );
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="grid gap-2 border-t border-[#222] py-4 md:grid-cols-[180px_1fr]">
      <p className="cd-label">{label}</p>
      <p className="break-all text-xs leading-6 opacity-70">
        {href ? <ExternalLink href={href}>{value}</ExternalLink> : value}
      </p>
    </div>
  );
}

export default function RegistryPage() {
  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-14 max-w-4xl">
          <p className="cd-label">ERC-8257 REGISTRY</p>

          <h1 className="cd-headline mt-3 text-4xl tracking-[0.12em] md:text-6xl">
            CHAIN DREAMS TOOLS
          </h1>

          <p className="mt-6 max-w-3xl text-sm leading-8 opacity-60">
            Chain Dreams tokens expose token-gated agent tools. Owners can let
            agents read the current dream state and the historical memory of a
            token through ERC-8257 registered endpoints.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/tools/test" className="cd-button">
              OPEN TOOL TESTER
            </Link>

            <a
              href={`https://opensea.io/assets/ethereum/${CHAIN_DREAMS_CONTRACT}`}
              target="_blank"
              rel="noreferrer"
              className="cd-button"
            >
              OPENSEA
            </a>
          </div>
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-3">
          <div className="border border-[#222] bg-black p-5">
            <p className="cd-label mb-3">NETWORK</p>
            <p className="text-sm tracking-[0.12em] opacity-70">
              ETHEREUM MAINNET
            </p>
          </div>

          <div className="border border-[#222] bg-black p-5">
            <p className="cd-label mb-3">COLLECTION</p>
            <p className="text-sm tracking-[0.12em] opacity-70">
              CHAIN DREAMS
            </p>
          </div>

          <div className="border border-[#222] bg-black p-5">
            <p className="cd-label mb-3">DREAMER</p>
            <p className="text-sm tracking-[0.12em] opacity-70">
              @RATCHETVEX
            </p>
          </div>
        </div>

        <div className="mb-12 border border-[#222] bg-black p-6">
          <p className="cd-label mb-5">REGISTRY DETAILS</p>

          <InfoRow
            label="COLLECTION"
            value={CHAIN_DREAMS_CONTRACT}
            href={`https://etherscan.io/address/${CHAIN_DREAMS_CONTRACT}`}
          />

          <InfoRow
            label="TOOL REGISTRY"
            value={REGISTRY_CONTRACT}
            href={`https://etherscan.io/address/${REGISTRY_CONTRACT}`}
          />

          <InfoRow
            label="ACCESS PREDICATE"
            value={PREDICATE_CONTRACT}
            href={`https://etherscan.io/address/${PREDICATE_CONTRACT}`}
          />

          <InfoRow label="PREDICATE NAME" value="ERC721OwnerPredicate" />
          <InfoRow label="ACCESS RULE" value="Hold any Chain Dreams NFT" />
          <InfoRow
            label="AUTH FLOW"
            value="OpenSea predicate-gate x402 with zero-value EIP-3009 authorization"
          />
        </div>

        <div className="grid gap-6">
          {tools.map((tool) => (
            <article key={tool.id} className="border border-[#222] bg-black p-6">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="cd-label">TOOL #{tool.id}</p>
                  <h2 className="cd-headline mt-3 text-3xl tracking-[0.12em]">
                    {tool.name}
                  </h2>
                </div>

                <p className="border border-[#222] px-4 py-3 text-[10px] tracking-[0.18em] opacity-70">
                  {tool.label}
                </p>
              </div>

              <p className="mb-6 max-w-3xl text-sm leading-8 opacity-60">
                {tool.description}
              </p>

              <InfoRow label="SLUG" value={tool.slug} />
              <InfoRow label="MANIFEST" value={tool.manifest} href={tool.manifest} />
              <InfoRow label="ENDPOINT" value={tool.endpoint} href={tool.endpoint} />
              <InfoRow label="MANIFEST HASH" value={tool.hash} />
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="border border-[#222] bg-black p-6">
            <p className="cd-label mb-5">AUTH FLOW</p>

            <pre className="whitespace-pre-wrap break-words border border-[#222] p-4 text-xs leading-6 opacity-70">
{`1. Agent calls endpoint with tokenId only.
2. Endpoint returns HTTP 402.
3. Agent signs the zero-value x402 authorization.
4. Agent retries with the X-PAYMENT header.
5. Endpoint recovers the wallet address.
6. Endpoint checks that the wallet owns the requested token.
7. If ownership matches, the protected dream data is returned.`}
            </pre>

            <p className="mt-5 text-xs leading-7 opacity-50">
              No custom wallet or signature fields are required. Wallet identity
              is recovered through the OpenSea predicate-gate x402 flow.
            </p>
          </section>

          <section className="border border-[#222] bg-black p-6">
            <p className="cd-label mb-5">EXAMPLE REQUEST</p>

            <pre className="whitespace-pre-wrap break-words border border-[#222] p-4 text-xs leading-6 opacity-70">
{`fetch("${BASE_URL}/api/tools/chain-dream-lookup", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    tokenId: "1"
  })
})`}
            </pre>

            <p className="mt-5 text-xs leading-7 opacity-50">
              A normal unsigned request returns HTTP 402. OpenSea-compatible
              agents complete the x402 challenge and retry with the X-PAYMENT
              header.
            </p>
          </section>
        </div>

        <section className="mt-12 border border-[#222] bg-black p-6">
          <p className="cd-label mb-5">WHAT AGENTS CAN READ</p>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="border border-[#222] p-5">
              <p className="cd-label mb-3">CURRENT STATE</p>
              <p className="text-xs leading-7 opacity-60">
                Phrase, cycle, dream seed, owner, vocabulary counts, motion
                data, visual traits, links, collection context, and Ratchet Vex
                agent metadata.
              </p>
            </div>

            <div className="border border-[#222] p-5">
              <p className="cd-label mb-3">HISTORICAL MEMORY</p>
              <p className="text-xs leading-7 opacity-60">
                Previous dream cycles, archived phrases, historical dream
                seeds, motion history, dreamer identity, and token memory across
                the full dream archive.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 max-w-3xl">
          <p className="cd-label mb-4">WHY THIS EXISTS</p>

          <p className="text-sm leading-8 opacity-60">
            Most digital collectibles expose metadata. Chain Dreams exposes
            memory. Each token carries a current dream and an archive of what it
            has dreamed before. Through these tools, agents can discover,
            request, and interpret that memory with owner permission.
          </p>

          <p className="mt-8 cd-headline text-2xl uppercase tracking-[0.1em]">
            A record of what we chose to remember.
          </p>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}