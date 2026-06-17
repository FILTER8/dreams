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

type ArchiveDream = {
  tokenId?: string | number;
  tokenID?: string | number;
  id?: string | number;
  token?: string | number;
  number?: string | number;

  phrase?: string;
  basePhrase?: string;
  dream?: string;
  text?: string;

  dreamSeed?: string;
  seed?: string;

  motion?: unknown;
  ok?: boolean;
};

function readDreamArchives(tokenId: string) {
  const archiveDir = path.join(process.cwd(), "dream-archive");

  if (!fs.existsSync(archiveDir)) {
    return [];
  }

  const files = fs
    .readdirSync(archiveDir)
    .filter((file) => /^dreams-cycle-\d+\.json$/.test(file))
    .sort();

  const history = [];

  for (const file of files) {
    const filePath = path.join(archiveDir, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const archive = JSON.parse(raw);

    const cycle =
      archive.cycle ??
      file.replace("dreams-cycle-", "").replace(".json", "");

const dreams: ArchiveDream[] = Array.isArray(archive.dreams)
  ? archive.dreams
  : [];

    const dream = dreams.find((item) => {
      const id =
        item.tokenId ??
        item.tokenID ??
        item.id ??
        item.token ??
        item.number;

      return String(id) === tokenId;
    });

    if (!dream) continue;

    history.push({
      cycle: String(cycle),
      phrase:
        dream.phrase ??
        dream.basePhrase ??
        dream.dream ??
        dream.text ??
        null,
      dreamSeed: dream.dreamSeed ?? dream.seed ?? null,
      motion: dream.motion ?? null,
      ok: dream.ok ?? true,
    });
  }

  return history.filter((item) => item.phrase);
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

    const dream = await dreamRes.json();

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

    const history = readDreamArchives(tokenId);

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
          dream: dream.links?.dream ?? `https://dreams.ratchetvex.xyz/dream/${tokenId}`,
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