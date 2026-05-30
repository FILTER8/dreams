import { NextResponse } from "next/server";

const CHAIN_DREAMS =
  "0x35221D6E9dC3E4a277F40b40f7492BE3b236D380";

const RPC_URL = process.env.MAINNET_RPC_URL;

// dreamState(uint256)
const DREAM_STATE_SELECTOR = "0x40594674";

function encodeUint256(value: string) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function sliceWord(hex: string, index: number) {
  return hex.slice(2 + index * 64, 2 + (index + 1) * 64);
}

function hexToBigInt(hex: string) {
  return BigInt("0x" + hex);
}

async function ethCall(to: string, data: string) {
  if (!RPC_URL) throw new Error("Missing MAINNET_RPC_URL");

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
    cache: "no-store",
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);

  return json.result as string;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await context.params;

    if (!/^\d+$/.test(tokenId)) {
      return NextResponse.json({ error: "invalid tokenId" }, { status: 400 });
    }

    const raw = await ethCall(
      CHAIN_DREAMS,
      DREAM_STATE_SELECTOR + encodeUint256(tokenId)
    );

    const cycle = hexToBigInt(sliceWord(raw, 0)).toString();
    const owner = "0x" + sliceWord(raw, 1).slice(24);
    const orbitSpeed = hexToBigInt(sliceWord(raw, 2)).toString();
    const driftSpeed = hexToBigInt(sliceWord(raw, 3)).toString();
    const ditherTempo = hexToBigInt(sliceWord(raw, 4)).toString();
    const dreamSeed = "0x" + sliceWord(raw, 5);

    return NextResponse.json(
      {
        tokenId,
        cycle,
        owner,
        dreamSeed,
        motion: {
          orbitSpeed,
          driftSpeed,
          ditherTempo,
        },
      },
      {
        headers: {
          "cache-control": "public, s-maxage=60",
          "access-control-allow-origin": "*",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "visual unavailable",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 }
    );
  }
}