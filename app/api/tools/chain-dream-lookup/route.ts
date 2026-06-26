import { z } from "zod/v4";
import { getAddress } from "viem";
import {
  BASE_URL,
  CHAIN_DREAMS_CONTRACT,
  CREATOR_ADDRESS,
  chainDreamLookupManifest,
} from "@/lib/tool-manifests";
import { mainnet } from "viem/chains";

const TOOL_NAME = "CHAIN_DREAM_LOOKUP";
const TOOL_VERSION = "1.0.0";

type ToolSdkRuntime = {
  createToolHandler: (config: Record<string, unknown>) => (
    request: Request,
  ) => Promise<Response>;
  predicateGate: (config: Record<string, unknown>) => unknown;
};

type ToolContext = {
  callerAddress?: string;
  request?: Request;
};

type ToolInput = {
  tokenId: string;
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

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getCallerWallet(ctx: ToolContext) {
  if (!ctx.callerAddress) {
    throw new Error("caller address missing after predicate gate");
  }

  return getAddress(ctx.callerAddress);
}

async function createHandler() {
  const sdk = (await import("@opensea/tool-sdk")) as unknown as ToolSdkRuntime;

  const toolId = BigInt(getRequiredEnv("OPENSEA_CHAIN_DREAM_LOOKUP_TOOL_ID"));
  const operatorAddress = getRequiredEnv(
    "OPENSEA_OPERATOR_ADDRESS",
  ) as `0x${string}`;

const gate = sdk.predicateGate({
  toolId,
  operatorAddress,
  chain: mainnet,
  rpcUrl:
    process.env.OPENSEA_TOOL_REGISTRY_RPC_URL ??
    "https://ethereum.publicnode.com",
});
  return sdk.createToolHandler({
    manifest: chainDreamLookupManifest,

    inputSchema: z.object({
      tokenId: z.coerce.string().trim().regex(/^\d+$/, "invalid tokenId"),
    }),

    outputSchema: z.object({
      success: z.boolean(),
    }).passthrough(),

    gates: [gate],

    handler: async (input: ToolInput, ctx: ToolContext) => {
      const tokenId = input.tokenId;
      const wallet = getCallerWallet(ctx);
      const request = ctx.request;

      if (!request) {
        throw new Error("request missing from tool context");
      }

      const baseUrl = getBaseUrl(request);

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
}


export async function POST(request: Request) {
  const handler = await createHandler();
  return handler(request);
}