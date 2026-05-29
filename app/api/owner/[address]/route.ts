import { NextResponse } from "next/server";
import { CHAIN_DREAMS_CONTRACT } from "@/lib/constants";
import { fromAlchemyNft } from "@/lib/metadata";

function alchemyBase() {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("Missing ALCHEMY_API_KEY");
  return `https://eth-mainnet.g.alchemy.com/nft/v3/${key}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;
    const url = new URL(`${alchemyBase()}/getNFTsForOwner`);
    url.searchParams.set("owner", address);
    url.searchParams.set("contractAddresses[]", CHAIN_DREAMS_CONTRACT);
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", "100");

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message ?? "Alchemy owner fetch failed");

    return NextResponse.json({
      owner: address,
      tokens: (json?.ownedNfts ?? []).map(fromAlchemyNft),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "collector tokens unavailable" },
      { status: 500 }
    );
  }
}
