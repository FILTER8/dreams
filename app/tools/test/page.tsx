"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

type ToolMode = "lookup" | "history";

function toolName(mode: ToolMode) {
  return mode === "lookup"
    ? "CHAIN_DREAM_LOOKUP"
    : "CHAIN_DREAM_HISTORY";
}

function endpoint(mode: ToolMode) {
  return mode === "lookup"
    ? "/api/tools/chain-dream-lookup"
    : "/api/tools/chain-dream-history";
}

function buildMessage(mode: ToolMode, tokenId: string, wallet: string) {
  return [
    "Chain Dreams tool access",
    `Tool: ${toolName(mode)}`,
    `Token ID: ${tokenId}`,
    `Wallet: ${wallet.toLowerCase()}`,
  ].join("\n");
}

export default function ToolTestPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [tokenId, setTokenId] = useState("1");
  const [mode, setMode] = useState<ToolMode>("lookup");
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const message =
    address && tokenId
      ? buildMessage(mode, tokenId.trim(), address)
      : "";

  async function sign() {
    if (!address) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const sig = await signMessageAsync({ message });
      setSignature(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signature failed");
    } finally {
      setBusy(false);
    }
  }

  async function callTool() {
    if (!address || !signature) return;

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
          wallet: address,
          signature,
        }),
      });

      const json = await res.json();
      setResult(json);

      if (!res.ok) {
        setError(json?.error ?? "Tool call failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool call failed");
    } finally {
      setBusy(false);
    }
  }

  function resetForMode(nextMode: ToolMode) {
    setMode(nextMode);
    setSignature("");
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
            Sign a token-gated message with the wallet that owns the dream,
            then call the lookup or history tool.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="border border-[#222] bg-black p-5">
            <div className="mb-5">
              <p className="cd-label mb-2">CONNECTED WALLET</p>
              <p className="break-all text-xs leading-6 opacity-70">
                {isConnected && address ? address : "Connect wallet first"}
              </p>
            </div>

            <div className="mb-5">
              <p className="cd-label mb-2">TOKEN ID</p>
              <input
                value={tokenId}
                onChange={(event) => {
                  setTokenId(event.target.value);
                  setSignature("");
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
              <p className="cd-label mb-2">MESSAGE TO SIGN</p>
              <pre className="min-h-32 whitespace-pre-wrap break-words border border-[#222] p-4 text-xs leading-6 opacity-70">
                {message || "Connect wallet to generate message"}
              </pre>
            </div>

            <div className="grid gap-3">
              <button
                onClick={sign}
                disabled={!address || !tokenId || busy}
                className="cd-button disabled:opacity-30"
              >
                {busy ? "WORKING" : "SIGN MESSAGE"}
              </button>

              <button
                onClick={callTool}
                disabled={!address || !signature || busy}
                className="cd-button disabled:opacity-30"
              >
                CALL TOOL
              </button>
            </div>

            {signature && (
              <div className="mt-5">
                <p className="cd-label mb-2">SIGNATURE</p>
                <p className="break-all border border-[#222] p-4 text-[10px] leading-5 opacity-60">
                  {signature}
                </p>
              </div>
            )}

            {error && (
              <p className="mt-5 border border-[#553] p-4 text-xs leading-6 tracking-[0.12em] text-[#bfce72]">
                {error}
              </p>
            )}
          </div>

          <div className="border border-[#222] bg-black p-5">
            <p className="cd-label mb-4">TOOL RESULT</p>

            <pre className="min-h-[520px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 opacity-70">
              {result
                ? JSON.stringify(result, null, 2)
                : "No result yet. Sign first, then call the tool."}
            </pre>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}