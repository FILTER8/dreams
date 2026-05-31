import { NextResponse } from "next/server";

const CHAIN_DREAMS = "0x35221D6E9dC3E4a277F40b40f7492BE3b236D380";
const RPC_URL = process.env.MAINNET_RPC_URL;

// dreamState(uint256)
const DREAM_STATE_SELECTOR = "0x40594674";

const ZERO = BigInt(0);
const THREE = BigInt(3);
const FIVE = BigInt(5);
const SEVEN = BigInt(7);
const TEN = BigInt(10);
const SIXTEEN = BigInt(16);

function encodeUint256(value: string) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function sliceWord(hex: string, index: number) {
  return hex.slice(2 + index * 64, 2 + (index + 1) * 64);
}

function hexToBigInt(hex: string) {
  return BigInt("0x" + hex);
}

function shift(value: bigint, bits: number) {
  return value / BigInt(2) ** BigInt(bits);
}

function deriveRendererTraits(dreamSeed: string) {
  const g = BigInt(dreamSeed || "0");

  const bgColor = Number(g % SIXTEEN);
  const mood = Number(shift(g, 72) % FIVE);

  let blobCount = 1 + Number(shift(g, 16) % THREE);
  if (mood === 0 && blobCount > 2) blobCount = 2;
  if (mood === 1 && blobCount < 2) blobCount = 2;
  if (mood === 4) blobCount = 3;

  const ditherRaw = Number(shift(g, 136) % TEN);
  const ditherCount =
    ditherRaw < 2 ? 0 : ditherRaw < 6 ? 1 : ditherRaw < 9 ? 2 : 3;

  const contourRaw = Number(shift(g, 120) % TEN);
  const contourCount =
    contourRaw < 3 ? 0 : contourRaw < 7 ? 1 : contourRaw < 9 ? 2 : 3;

  const satelliteCount = Number(shift(g, 32) % SEVEN);

  const moodName =
    mood === 0
      ? "Quiet Monolith"
      : mood === 1
        ? "Layered Organism"
        : mood === 2
          ? "Fractured Relic"
          : mood === 3
            ? "Soft Satellite"
            : "Dense Artifact";

  return {
    mood,
    moodName,
    blobCount,
    ditherCount,
    contourCount,
    satelliteCount,
    bgColor,
  };
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

  if (json.error) {
    throw new Error(json.error.message || "RPC error");
  }

  if (!json.result || typeof json.result !== "string") {
    throw new Error("Invalid RPC response");
  }

  return json.result as string;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  try {
    const { tokenId } = await context.params;

    if (!/^\d+$/.test(tokenId)) {
      return NextResponse.json({ error: "invalid tokenId" }, { status: 400 });
    }

    const raw = await ethCall(
      CHAIN_DREAMS,
      DREAM_STATE_SELECTOR + encodeUint256(tokenId),
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
        traits: deriveRendererTraits(dreamSeed),
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
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "visual unavailable",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 },
    );
  }
}