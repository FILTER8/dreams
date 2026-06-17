import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";

const TOOL_NAME = "CHAIN_DREAM_HISTORY";
const TOOL_VERSION = "1.0.0";

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

type HistoryBody = {
  tokenId?: string | number;
  wallet?: string;
  signature?: string;
};

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HistoryBody;

    const tokenId = String(body.tokenId ?? "").trim();
    const walletRaw = String(body.wallet ?? "").trim();
    const signature = String(body.signature ?? "").trim();

    if (!/^\d+$/.test(tokenId)) {
      return NextResponse.json(
        { success: false, error: "invalid tokenId" },
        { status: 400 }
      );
    }

    if (!isAddress(walletRaw)) {
      return NextResponse.json(
        { success: false, error: "invalid wallet" },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "signature required" },
        { status: 401 }
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
        { status: 401 }
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
        { status: dreamRes.status || 500 }
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
        { status: 403 }
      );
    }

    const history = readDreamHistory(tokenId);

    return NextResponse.json(
      {
        success: true,
        tool: TOOL_NAME,
        version: TOOL_VERSION,
        access: {
          tokenGated: true,
          wallet,
          verifiedOwner: true,
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
      },
      {
        headers: {
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "chain dream history failed",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 }
    );
  }
}