import { createToolHandler, predicateGate } from "@opensea/tool-sdk";
import { getAddress } from "viem";
import { base } from "viem/chains";
import { z } from "zod/v4";
import {
  BASE_URL,
  CHAIN_DREAMS_CONTRACT,
  CREATOR_ADDRESS,
  chainDreamLookupManifest,
} from "@/lib/tool-manifests";

const TOOL_NAME = "CHAIN_DREAM_LOOKUP";
const TOOL_VERSION = "1.0.0";

const LOOKUP_TOOL_ID = process.env.OPENSEA_LOOKUP_TOOL_ID;
const RPC_URL = process.env.OPENSEA_TOOL_REGISTRY_RPC_URL ?? "https://mainnet.base.org";
const OPERATOR_ADDRESS = process.env.OPENSEA_OPERATOR_ADDRESS ?? CREATOR_ADDRESS;

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

if (!LOOKUP_TOOL_ID) {
  throw new Error("Missing OPENSEA_LOOKUP_TOOL_ID env var");
}

const handler = createToolHandler({
  manifest: chainDreamLookupManifest,
  inputSchema: z.object({
    tokenId: z.string().regex(/^\d+$/, "tokenId must be numeric"),
  }),
  outputSchema: z.any(),
  gates: [
    predicateGate({
      toolId: BigInt(LOOKUP_TOOL_ID),
      operatorAddress: OPERATOR_ADDRESS as `0x${string}`,
      chain: base,
      rpcUrl: RPC_URL,
    }),
  ],

  handler: async ({ tokenId }, ctx) => {
    const walletRaw = ctx.callerAddress;

    if (!walletRaw) {
      return {
        success: false,
        error: "missing predicate-gate caller address",
      };
    }

    const wallet = getAddress(walletRaw);
    const requestUrl = new URL(ctx.request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    const dreamRes = await fetch(`${baseUrl}/api/dream/${tokenId}`, {
      cache: "no-store",
    });

    const dream = (await dreamRes.json()) as DreamApiResponse;

    if (!dreamRes.ok || dream.error) {
      return {
        success: false,
        error: "dream unavailable",
        message: dream.message ?? dream.error,
      };
    }

    if (!dream.owner || getAddress(dream.owner) !== wallet) {
      return {
        success: false,
        error: "wallet does not own this dream token",
        tokenId,
        wallet,
        owner: dream.owner,
      };
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

    return {
      success: true,
      tool: TOOL_NAME,
      version: TOOL_VERSION,

      access: {
        tokenGated: true,
        wallet,
        verifiedOwner: true,
        auth: "predicate-gate-eip3009-zero-value",
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
    };
  },
});

export const POST = handler;
