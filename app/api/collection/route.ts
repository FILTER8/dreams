import { NextResponse } from "next/server";
import { CHAIN_DREAMS_CONTRACT } from "@/lib/constants";
import { fromAlchemyNft, type ChainDreamToken } from "@/lib/metadata";

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";
const MAX_SUPPLY = 1982;
const DEFAULT_PAGE_SIZE = "32";

type AlchemyCollectionResponse = {
  nfts?: Parameters<typeof fromAlchemyNft>[0][];
  pageKey?: string;
  message?: string;
};

function alchemyBase() {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("Missing ALCHEMY_API_KEY");
  return `https://eth-mainnet.g.alchemy.com/nft/v3/${key}`;
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
    const pageKey = searchParams.get("pageKey");
    const pageSize = searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE;

    const url = new URL(`${alchemyBase()}/getNFTsForContract`);
    url.searchParams.set("contractAddress", CHAIN_DREAMS_CONTRACT);
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", pageSize);

    if (pageKey) {
      url.searchParams.set("pageKey", pageKey);
    }

    const [res, totalSupply] = await Promise.all([
      fetch(url, {
        next: { revalidate: 300 },
      }),
      getTotalSupply(),
    ]);

    const json = (await res.json()) as AlchemyCollectionResponse;

    if (!res.ok) {
      throw new Error(json.message ?? "Alchemy collection fetch failed");
    }

    const tokens: ChainDreamToken[] = (json.nfts ?? [])
      .map(fromAlchemyNft)
      .filter((token: ChainDreamToken) => Boolean(token.image));

    return NextResponse.json(
      {
        tokens,
        pageKey: json.pageKey ?? null,
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