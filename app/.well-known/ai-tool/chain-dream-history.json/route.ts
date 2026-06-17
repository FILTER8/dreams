import { NextResponse } from "next/server";
import { chainDreamHistoryManifest } from "@/lib/tool-manifests";

export async function GET() {
  return NextResponse.json(chainDreamHistoryManifest, {
    headers: {
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
      "access-control-allow-origin": "*"
    }
  });
}