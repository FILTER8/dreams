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
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await context.params;
    const url = new URL(`${alchemyBase()}/getNFTMetadata`);
    url.searchParams.set("contractAddress", CHAIN_DREAMS_CONTRACT);
    url.searchParams.set("tokenId", tokenId);
    url.searchParams.set("refreshCache", "false");

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message ?? "Alchemy token fetch failed");

    return NextResponse.json(fromAlchemyNft(json));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "token unavailable" },
      { status: 500 }
    );
  }
}
