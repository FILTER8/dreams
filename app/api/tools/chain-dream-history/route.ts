import fs from "fs";
import path from "path";
import { createToolHandler, predicateGate } from "@opensea/tool-sdk";
import { getAddress } from "viem";
import { base } from "viem/chains";
import { z } from "zod/v4";
import {
  CREATOR_ADDRESS,
  chainDreamHistoryManifest,
} from "@/lib/tool-manifests";

const TOOL_NAME = "CHAIN_DREAM_HISTORY";
const TOOL_VERSION = "1.0.0";

const HISTORY_TOOL_ID = process.env.OPENSEA_HISTORY_TOOL_ID;
const RPC_URL = process.env.OPENSEA_TOOL_REGISTRY_RPC_URL ?? "https://mainnet.base.org";
const OPERATOR_ADDRESS = process.env.OPENSEA_OPERATOR_ADDRESS ?? CREATOR_ADDRESS;

type HistoryIndexEntry = {
  cycle: string;
  dreamer: string;
  handle?: string;
  file: string;
};

type HistoryDream = {
  tokenId?: string | number;
  tokenID?: string | number;
  id?: string | number;
  token?: string | number;
  number?: string | number;

  ok?: boolean;
  cycle?: string;

  phrase?: string;
  basePhrase?: string;
  dream?: string;
  text?: string;

  dreamSeed?: string;
  seed?: string;

  motion?: {
    orbitSpeed?: string | number;
    driftSpeed?: string | number;
    ditherTempo?: string | number;
  } | null;
};

type HistoryFile = {
  cycle?: string;
  agent?: {
    name?: string;
    handle?: string;
  };
  dreams?: HistoryDream[];
};

type DreamApiResponse = {
  error?: string;
  message?: string;
  tokenId?: string;
  cycle?: string;
  owner?: string;
  phrase?: string;
  dreamSeed?: string;
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

function publicFilePath(publicUrl: string) {
  const clean = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  return path.join(process.cwd(), "public", clean);
}

function getDreamId(dream: HistoryDream) {
  return (
    dream.tokenId ??
    dream.tokenID ??
    dream.id ??
    dream.token ??
    dream.number ??
    null
  );
}

function getDreamPhrase(dream: HistoryDream) {
  return (
    dream.phrase ??
    dream.basePhrase ??
    dream.dream ??
    dream.text ??
    null
  );
}

function readDreamHistory(tokenId: string) {
  const indexPath = path.join(
    process.cwd(),
    "public",
    "dream-history",
    "index.json"
  );

  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const indexRaw = fs.readFileSync(indexPath, "utf8");
  const index = JSON.parse(indexRaw) as HistoryIndexEntry[];

  const history = [];

  for (const entry of index) {
    const filePath = publicFilePath(entry.file);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const archive = JSON.parse(raw) as HistoryFile;

    const dreams: HistoryDream[] = Array.isArray(archive.dreams)
      ? archive.dreams
      : [];

    const dream = dreams.find((item) => {
      const id = getDreamId(item);
      return id !== null && String(id) === tokenId;
    });

    if (!dream) continue;
    if (dream.ok === false) continue;

    const phrase = getDreamPhrase(dream);
    if (!phrase) continue;

    history.push({
      cycle: String(dream.cycle ?? archive.cycle ?? entry.cycle),
      dreamer: entry.dreamer ?? archive.agent?.name ?? "Unknown Dreamer",
      handle: entry.handle ?? archive.agent?.handle ?? null,
      phrase,
      dreamSeed: dream.dreamSeed ?? dream.seed ?? null,
      motion: dream.motion ?? null,
      ok: dream.ok ?? true,
    });
  }

  return history.sort((a, b) => Number(a.cycle) - Number(b.cycle));
}

if (!HISTORY_TOOL_ID) {
  throw new Error("Missing OPENSEA_HISTORY_TOOL_ID env var");
}

const handler = createToolHandler({
  manifest: chainDreamHistoryManifest,
  inputSchema: z.object({
    tokenId: z.string().regex(/^\d+$/, "tokenId must be numeric"),
  }),
  outputSchema: z.any(),
  gates: [
    predicateGate({
      toolId: BigInt(HISTORY_TOOL_ID),
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

    const history = readDreamHistory(tokenId);

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
      tokenId,
      current: {
        cycle: dream.cycle,
        phrase: dream.phrase,
        dreamSeed: dream.dreamSeed,
        motion: dream.motion,
      },
      historyCount: history.length,
      history,
      links: {
        dream:
          dream.links?.dream ??
          `https://dreams.ratchetvex.xyz/dream/${tokenId}`,
        visual: `https://dreams.ratchetvex.xyz/dream/${tokenId}/visual`,
        visualData: `https://dreams.ratchetvex.xyz/api/visual/${tokenId}`,
        opensea: dream.links?.opensea,
      },
    };
  },
});

export const POST = handler;
