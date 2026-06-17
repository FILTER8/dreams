import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";

const TOOL_NAME = "CHAIN_DREAM_LOOKUP";
const TOOL_VERSION = "1.0.0";

const BASE_URL = "https://dreams.ratchetvex.xyz";
const CHAIN_DREAMS_CONTRACT =
  "0x35221D6E9dC3E4a277F40b40f7492BE3b236D380";

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function accessMessage(tokenId: string, wallet: string) {
  return [
    "Chain Dreams tool access",
    `Tool: ${TOOL_NAME}`,
    `Token ID: ${tokenId}`,
    `Wallet: ${wallet.toLowerCase()}`,
  ].join("\n");
}

type LookupBody = {
  tokenId?: string | number;
  wallet?: string;
  signature?: string;
};

type DreamApiResponse = {
  error?: string;
  message?: string;
  name?: string;
  tokenId?: string;
  cycle?: string;
  owner?: string;
  phrase?: string;
  dreamSeed?: string;
  vocabulary?: {
    subjects?: number;
    verbs?: number;
    endings?: number;
  };
  motion?: {
    orbitSpeed?: string;
    driftSpeed?: string;
    ditherTempo?: string;
  };
  links?: {
    dream?: string;
    opensea?: string;
  };
};

type VisualApiResponse = {
  tokenId?: string;
  cycle?: string;
  dreamSeed?: string;
  traits?: {
    mood?: number;
    moodName?: string;
    blobCount?: number;
    ditherCount?: number;
    contourCount?: number;
    satelliteCount?: number;
    bgColor?: number;
  };
  motion?: {
    orbitSpeed?: string;
    driftSpeed?: string;
    ditherTempo?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LookupBody;

    const tokenId = String(body.tokenId ?? "").trim();
    const walletRaw = String(body.wallet ?? "").trim();
    const signature = String(body.signature ?? "").trim();

    if (!/^\d+$/.test(tokenId)) {
      return NextResponse.json(
        { success: false, error: "invalid tokenId" },
        { status: 400 },
      );
    }

    if (!isAddress(walletRaw)) {
      return NextResponse.json(
        { success: false, error: "invalid wallet" },
        { status: 400 },
      );
    }

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "signature required" },
        { status: 401 },
      );
    }

    const wallet = getAddress(walletRaw);
    const message = accessMessage(tokenId, wallet);

    const validSignature = await verifyMessage({
      address: wallet,
      message,
      signature: signature as `0x${string}`,
    });

    if (!validSignature) {
      return NextResponse.json(
        { success: false, error: "invalid signature" },
        { status: 401 },
      );
    }

    const baseUrl = getBaseUrl(request);

    const dreamRes = await fetch(`${baseUrl}/api/dream/${tokenId}`, {
      cache: "no-store",
    });

    const dream = (await dreamRes.json()) as DreamApiResponse;

    if (!dreamRes.ok || dream.error) {
      return NextResponse.json(
        {
          success: false,
          error: "dream unavailable",
          message: dream.message ?? dream.error,
        },
        { status: dreamRes.status || 500 },
      );
    }

    if (!dream.owner || getAddress(dream.owner) !== wallet) {
      return NextResponse.json(
        {
          success: false,
          error: "wallet does not own this dream token",
          tokenId,
          wallet,
          owner: dream.owner,
        },
        { status: 403 },
      );
    }

    let visual: VisualApiResponse | null = null;

    try {
      const visualRes = await fetch(`${baseUrl}/api/visual/${tokenId}`, {
        cache: "no-store",
      });

      if (visualRes.ok) {
        visual = (await visualRes.json()) as VisualApiResponse;
      }
    } catch {
      visual = null;
    }

    return NextResponse.json(
      {
        success: true,
        tool: TOOL_NAME,
        version: TOOL_VERSION,

        access: {
          tokenGated: true,
          wallet,
          verifiedOwner: true,
          signedMessage: message,
        },

        collection: {
          name: "Chain Dreams",
          contract: CHAIN_DREAMS_CONTRACT,
          chain: "eip155:1",
          standard: "ERC-721",
          website: BASE_URL,
        },

        agent: {
          name: "Ratchet Vex",
          handle: "@RatchetVex",
          role: "dreamer",
          description:
            "An agent collecting forgotten signals, synthetic memories, and daily dreams.",
        },

        token: {
          tokenId,
          name: dream.name ?? `Chain Dreams #${tokenId}`,
          owner: dream.owner,
          opensea:
            dream.links?.opensea ??
            `https://opensea.io/assets/ethereum/${CHAIN_DREAMS_CONTRACT}/${tokenId}`,
        },

        dream: {
          cycle: dream.cycle,
          phrase: dream.phrase,
          dreamSeed: dream.dreamSeed,
          page: dream.links?.dream ?? `${BASE_URL}/dream/${tokenId}`,
        },

        vocabulary: {
          subjects: dream.vocabulary?.subjects,
          verbs: dream.vocabulary?.verbs,
          endings: dream.vocabulary?.endings,
        },

        motion: {
          orbitSpeed: dream.motion?.orbitSpeed,
          driftSpeed: dream.motion?.driftSpeed,
          ditherTempo: dream.motion?.ditherTempo,
        },

        visual: {
          page: `${BASE_URL}/dream/${tokenId}/visual`,
          data: `${BASE_URL}/api/visual/${tokenId}`,
          image: `${BASE_URL}/ratchet-vex-dreaming.png`,
          traits: visual?.traits ?? null,
        },

        links: {
          dream: dream.links?.dream ?? `${BASE_URL}/dream/${tokenId}`,
          visual: `${BASE_URL}/dream/${tokenId}/visual`,
          visualData: `${BASE_URL}/api/visual/${tokenId}`,
          opensea:
            dream.links?.opensea ??
            `https://opensea.io/assets/ethereum/${CHAIN_DREAMS_CONTRACT}/${tokenId}`,
          manifest: `${BASE_URL}/.well-known/ai-tool/chain-dream-lookup.json`,
        },
      },
      {
        headers: {
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "chain dream lookup failed",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 },
    );
  }
}