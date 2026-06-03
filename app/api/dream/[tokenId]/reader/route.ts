import { NextResponse } from "next/server";

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await context.params;
  const baseUrl = getBaseUrl(request);

  const res = await fetch(`${baseUrl}/api/dream/${tokenId}`, {
    cache: "no-store",
  });

  const dream = await res.json();

 return NextResponse.json({
  format: "chain-dreams-reader-v1",
  tokenId,
  title: `CHAIN DREAMS #${tokenId}`,
  phrase: dream.phrase,
  cycle: dream.cycle,
});
}