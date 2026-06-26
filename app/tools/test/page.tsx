"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

type ToolMode = "lookup" | "history";

type ToolResult = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
};

function endpoint(mode: ToolMode) {
  return mode === "lookup"
    ? "/api/tools/chain-dream-lookup"
    : "/api/tools/chain-dream-history";
}

function absoluteEndpoint(mode: ToolMode) {
  return mode === "lookup"
    ? "https://dreams.ratchetvex.xyz/api/tools/chain-dream-lookup"
    : "https://dreams.ratchetvex.xyz/api/tools/chain-dream-history";
}

export default function ToolTestPage() {
  const [tokenId, setTokenId] = useState("1");
  const [mode, setMode] = useState<ToolMode>("lookup");
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function callTool() {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(endpoint(mode), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tokenId: tokenId.trim(),
        }),
      });

      const headers: Record<string, string> = {};

      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const text = await res.text();

      let body: unknown = text;

      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      setResult({
        status: res.status,
        statusText: res.statusText,
        headers,
        body,
      });

      if (res.status !== 402 && !res.ok) {
        setError(`Tool returned HTTP ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool call failed");
    } finally {
      setBusy(false);
    }
  }

  function resetForMode(nextMode: ToolMode) {
    setMode(nextMode);
    setResult(null);
    setError(null);
  }

  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-10">
          <p className="cd-label">ERC-8257 TOOL TEST</p>
          <h1 className="cd-headline mt-3 text-4xl tracking-[0.12em] md:text-6xl">
            CHAIN DREAM TOOLS
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 opacity-60">
            Test the OpenSea predicate-gated endpoint flow. A normal request
            sends only a token ID and should return HTTP 402 with a zero-value
            x402 challenge.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="border border-[#222] bg-black p-5">
            <div className="mb-5">
              <p className="cd-label mb-2">TOKEN ID</p>
              <input
                value={tokenId}
                onChange={(event) => {
                  setTokenId(event.target.value);
                  setResult(null);
                  setError(null);
                }}
                className="w-full border border-[#222] bg-black px-4 py-3 text-sm tracking-[0.12em] outline-none"
                placeholder="1"
              />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => resetForMode("lookup")}
                className={`cd-button ${
                  mode === "lookup" ? "opacity-100" : "opacity-50"
                }`}
              >
                LOOKUP
              </button>

              <button
                onClick={() => resetForMode("history")}
                className={`cd-button ${
                  mode === "history" ? "opacity-100" : "opacity-50"
                }`}
              >
                HISTORY
              </button>
            </div>

            <div className="mb-5">
              <p className="cd-label mb-2">REQUEST</p>
              <pre className="min-h-32 whitespace-pre-wrap break-words border border-[#222] p-4 text-xs leading-6 opacity-70">
{`POST ${absoluteEndpoint(mode)}

{
  "tokenId": "${tokenId.trim() || "1"}"
}`}
              </pre>
            </div>

            <div className="grid gap-3">
              <button
                onClick={callTool}
                disabled={!tokenId.trim() || busy}
                className="cd-button disabled:opacity-30"
              >
                {busy ? "CALLING" : "CALL ENDPOINT"}
              </button>
            </div>

            <div className="mt-5 border border-[#222] p-4">
              <p className="cd-label mb-3">EXPECTED RESULT</p>
              <p className="text-xs leading-7 opacity-60">
                Without an X-PAYMENT header, the endpoint should return HTTP
                402. That means the predicate gate is active and waiting for an
                OpenSea-compatible agent to sign the zero-value x402
                authorization.
              </p>
            </div>

            {error && (
              <p className="mt-5 border border-[#553] p-4 text-xs leading-6 tracking-[0.12em] text-[#bfce72]">
                {error}
              </p>
            )}
          </div>

          <div className="border border-[#222] bg-black p-5">
            <p className="cd-label mb-4">ENDPOINT RESULT</p>

            <pre className="min-h-[520px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 opacity-70">
              {result
                ? JSON.stringify(result, null, 2)
                : "No result yet. Call the endpoint to inspect the predicate-gate challenge."}
            </pre>
          </div>
        </div>

        <section className="mt-12 border border-[#222] bg-black p-6">
          <p className="cd-label mb-5">HOW THE FULL AGENT FLOW WORKS</p>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="border border-[#222] p-5">
              <p className="cd-label mb-3">1. IDENTITY</p>
              <p className="text-xs leading-7 opacity-60">
                The endpoint returns a 402 challenge. The agent signs the
                zero-value x402 authorization and retries with the X-PAYMENT
                header. The SDK recovers the caller wallet.
              </p>
            </div>

            <div className="border border-[#222] p-5">
              <p className="cd-label mb-3">2. OWNERSHIP</p>
              <p className="text-xs leading-7 opacity-60">
                After the wallet is recovered, the route checks whether that
                wallet owns the requested Chain Dreams token. Only matching
                token owners receive the protected dream data.
              </p>
            </div>
          </div>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}