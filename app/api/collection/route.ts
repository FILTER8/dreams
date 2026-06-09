import { NextResponse } from "next/server";
import { CHAIN_DREAMS_CONTRACT } from "@/lib/constants";
import { fromAlchemyNft, type ChainDreamToken } from "@/lib/metadata";

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";
const MAX_SUPPLY = 1982;
const DEFAULT_PAGE_SIZE = 32;
const MAX_PAGE_SIZE = 32;

type AlchemyBatchResponse = {
  nfts?: Parameters<typeof fromAlchemyNft>[0][];
  message?: string;
};

function alchemyBase() {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("Missing ALCHEMY_API_KEY");
  return `https://eth-mainnet.g.alchemy.com/nft/v3/${key}`;
}

function clampPageSize(value: string | null) {
  const requested = Number(value ?? DEFAULT_PAGE_SIZE);
  return Math.min(Math.max(requested || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
}

async function getTotalSupply() {
  if (!MAINNET_RPC_URL) return null;

  try {
    const res = await fetch(MAINNET_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          { to: CHAIN_DREAMS_CONTRACT, data: TOTAL_SUPPLY_SELECTOR },
          "latest",
        ],
      }),
      next: { revalidate: 300 },
    });

    const json = await res.json();

    if (json?.error || !json?.result || json.result === "0x") {
      return null;
    }

    return Number(BigInt(json.result));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const offset = Math.max(Number(searchParams.get("offset") ?? "0") || 0, 0);
    const pageSize = clampPageSize(searchParams.get("pageSize"));

    const totalSupply = await getTotalSupply();
    const latestTokenId = Math.min(totalSupply ?? MAX_SUPPLY, MAX_SUPPLY);

    const tokenIds = Array.from({ length: pageSize })
      .map((_, i) => latestTokenId - offset - i)
      .filter((id) => id > 0);

    if (tokenIds.length === 0) {
      return NextResponse.json(
        {
          tokens: [],
          pageKey: null,
          totalSupply,
          maxSupply: MAX_SUPPLY,
        },
        {
          headers: {
            "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
          },
        }
      );
    }

    const res = await fetch(`${alchemyBase()}/getNFTMetadataBatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tokens: tokenIds.map((tokenId) => ({
          contractAddress: CHAIN_DREAMS_CONTRACT,
          tokenId: String(tokenId),
        })),
        withMetadata: true,
      }),
      next: { revalidate: 300 },
    });

    const json = (await res.json()) as AlchemyBatchResponse;

    if (!res.ok) {
      throw new Error(json.message ?? "Alchemy metadata batch fetch failed");
    }

    const tokens: ChainDreamToken[] = (json.nfts ?? [])
      .map(fromAlchemyNft)
      .filter((token: ChainDreamToken) => Boolean(token.image));

    const nextOffset = offset + pageSize;
    const pageKey = nextOffset < latestTokenId ? String(nextOffset) : null;

    return NextResponse.json(
      {
        tokens,
        pageKey,
        totalSupply,
        maxSupply: MAX_SUPPLY,
      },
      {
        headers: {
          "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "collection unavailable",
      },
      { status: 500 }
    );
  }
}