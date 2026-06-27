"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import type { SignTypedDataParameters, WalletClient } from "viem";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TokenImage } from "@/components/TokenImage";
import type { ChainDreamToken } from "@/lib/metadata";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ToolMode = "lookup" | "history" | "both";

type BrowserX402Account = {
  address: `0x${string}`;
  signTypedData: (
    args: SignTypedDataParameters,
  ) => Promise<`0x${string}`>;
};

type OwnerTokensResponse = {
  tokens?: ChainDreamToken[];
  error?: string;
};

type DreamChatResponse = {
  success?: boolean;
  text?: string;
  error?: string;
};

const OPERATOR_ADDRESS = "0x085610b382e4d4eecab01a43ac99b42436af37bf";

function endpoint(mode: Exclude<ToolMode, "both">) {
  return mode === "lookup"
    ? "/api/tools/chain-dream-lookup"
    : "/api/tools/chain-dream-history";
}

function createBrowserX402Account(
  walletClient: WalletClient,
  address: `0x${string}`,
): BrowserX402Account {
  return {
    address,
    signTypedData: async (args) => {
      return walletClient.signTypedData({
        ...args,
        account: address,
      });
    },
  };
}

function getSavedApiKey() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("chain-dreams-openai-key") ?? "";
}

export default function ToolTestPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const [tokens, setTokens] = useState<ChainDreamToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  const [tokenId, setTokenId] = useState("");
  const [mode, setMode] = useState<ToolMode>("both");
  const [apiKey, setApiKey] = useState(getSavedApiKey);
  const [model, setModel] = useState("gpt-4.1-mini");

  const [toolData, setToolData] = useState<unknown>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("What is this token dreaming right now?");

  const [busyDream, setBusyDream] = useState(false);
  const [busyChat, setBusyChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedToken = useMemo(() => {
    return tokens.find((token) => token.tokenId === tokenId) ?? null;
  }, [tokens, tokenId]);

  useEffect(() => {
    if (apiKey) {
      sessionStorage.setItem("chain-dreams-openai-key", apiKey);
    } else {
      sessionStorage.removeItem("chain-dreams-openai-key");
    }
  }, [apiKey]);

  useEffect(() => {
    async function loadOwnedTokens() {
      if (!address || !isConnected) {
        setTokens([]);
        setTokenId("");
        setToolData(null);
        setMessages([]);
        return;
      }

      try {
        setTokensLoading(true);
        setError(null);

        const res = await fetch(`/api/owner/${address}`, {
          cache: "no-store",
        });

        const json = (await res.json()) as OwnerTokensResponse;

        if (!res.ok) {
          throw new Error(json.error ?? "Could not load owned tokens.");
        }

        const ownedTokens = json.tokens ?? [];
        setTokens(ownedTokens);
        setTokenId(ownedTokens[0]?.tokenId ?? "");
      } catch (err) {
        setTokens([]);
        setTokenId("");
        setError(
          err instanceof Error ? err.message : "Could not load owned tokens.",
        );
      } finally {
        setTokensLoading(false);
      }
    }

    loadOwnedTokens();
  }, [address, isConnected]);

  async function callRegisteredTool(nextMode: Exclude<ToolMode, "both">) {
    if (!walletClient || !address) {
      throw new Error("Wallet client not ready.");
    }

    if (walletClient.chain?.id !== 8453) {
      await switchChainAsync({ chainId: 8453 });
    }

    const sdk = await import("@opensea/tool-sdk");

    type AuthFetchOptions = Parameters<
      typeof sdk.eip3009AuthenticatedFetch
    >[1];

    const browserAccount = createBrowserX402Account(
      walletClient,
      address as `0x${string}`,
    );

const fetchOptions = {
  account: browserAccount as unknown as AuthFetchOptions["account"],
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    tokenId: tokenId.trim(),
  }),
  allowedRecipients: [OPERATOR_ADDRESS],
} satisfies AuthFetchOptions;

    const res = await sdk.eip3009AuthenticatedFetch(
      endpoint(nextMode),
      fetchOptions,
    );

    const text = await res.text();

    let json: unknown = text;

    try {
      json = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      json = text;
    }

    if (!res.ok) {
      const message =
        typeof json === "object" && json && "error" in json
          ? String((json as { error?: unknown }).error)
          : `Tool returned HTTP ${res.status}`;

      throw new Error(message);
    }

    return json;
  }

  async function loadDream() {
    setBusyDream(true);
    setError(null);
    setToolData(null);
    setMessages([]);

    try {
      if (!selectedToken) {
        throw new Error("Select one of your owned Chain Dreams first.");
      }

      let data: unknown;

      if (mode === "both") {
        const [lookup, history] = await Promise.all([
          callRegisteredTool("lookup"),
          callRegisteredTool("history"),
        ]);

        data = {
          lookup,
          history,
        };
      } else {
        data = await callRegisteredTool(mode);
      }

      setToolData(data);

      setMessages([
        {
          role: "assistant",
          content:
            "Dream loaded through the registered OpenSea tool. Ask me what the token is dreaming, what its symbols mean, or how its memory has changed.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dream.");
    } finally {
      setBusyDream(false);
    }
  }

  async function askDream() {
    setBusyChat(true);
    setError(null);

    try {
      if (!apiKey.trim()) {
        throw new Error("Enter your OpenAI API key first.");
      }

      if (!toolData) {
        throw new Error("Load the dream first.");
      }

      const userMessage = input.trim();

      if (!userMessage) {
        throw new Error("Ask the dream something first.");
      }

      const nextMessages: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: userMessage,
        },
      ];

      setMessages(nextMessages);
      setInput("");

      const res = await fetch("/api/dream-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: model.trim() || "gpt-4.1-mini",
          toolData,
          messages: nextMessages,
        }),
      });

      const json = (await res.json()) as DreamChatResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Dream chat returned HTTP ${res.status}`);
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: json.text ?? "No text returned.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setBusyChat(false);
    }
  }

  function selectToken(nextTokenId: string) {
    setTokenId(nextTokenId);
    setToolData(null);
    setMessages([]);
    setError(null);
  }

  function resetMode(nextMode: ToolMode) {
    setMode(nextMode);
    setToolData(null);
    setMessages([]);
    setError(null);
  }

  return (
    <main className="cd-page">
      <SiteHeader />

      <section className="cd-shell min-h-screen pt-32 pb-20">
        <div className="mb-10">
          <p className="cd-label">CHAIN DREAM INTERFACE</p>

          <h1 className="cd-headline mt-3 text-4xl tracking-[0.12em] md:text-6xl">
            TALK TO YOUR DREAM
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 opacity-60">
            Connect your wallet, load the Chain Dreams you own, unlock the
            registered OpenSea tool, and chat with your token dream.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ConnectButton />

            {isConnected && address && (
              <span className="break-all text-xs tracking-[0.12em] opacity-60">
                {address}
              </span>
            )}
          </div>
        </div>

        {isConnected && (
          <div className="mb-8 border border-[#222] bg-black p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="cd-label mb-2">YOUR CHAIN DREAMS</p>
                <p className="text-xs leading-6 opacity-60">
                  {tokensLoading
                    ? "Loading owned tokens..."
                    : tokens.length > 0
                      ? `${tokens.length} token${
                          tokens.length === 1 ? "" : "s"
                        } found in this wallet.`
                      : "No Chain Dreams found in this wallet."}
                </p>
              </div>

              {tokens.length > 0 && (
                <p className="text-xs tracking-[0.16em] opacity-50">
                  SELECT A DREAM
                </p>
              )}
            </div>

            {tokens.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {tokens.map((token) => (
                  <button
                    key={token.tokenId}
                    onClick={() => selectToken(token.tokenId)}
                    className={`border bg-black p-2 text-left transition ${
                      tokenId === token.tokenId
                        ? "border-[#777] opacity-100"
                        : "border-[#222] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="aspect-square overflow-hidden bg-black">
                      <TokenImage tokenId={token.tokenId} image={token.image} />
                    </div>

                    <p className="mt-3 truncate text-[10px] tracking-[0.14em] opacity-70">
                      #{token.tokenId}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="border border-[#222] bg-black p-5">
            <div className="mb-5">
              <p className="cd-label mb-2">SELECTED TOKEN</p>
              <input
                value={tokenId}
                onChange={(event) => selectToken(event.target.value)}
                className="w-full border border-[#222] bg-black px-4 py-3 text-sm tracking-[0.12em] outline-none"
                placeholder="Connect wallet to load owned tokens"
              />
              <p className="mt-2 text-[10px] leading-5 opacity-50">
                Only tokens loaded from your connected wallet are shown above.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <button
                onClick={() => resetMode("lookup")}
                className={`cd-button ${
                  mode === "lookup" ? "opacity-100" : "opacity-50"
                }`}
              >
                NOW
              </button>

              <button
                onClick={() => resetMode("history")}
                className={`cd-button ${
                  mode === "history" ? "opacity-100" : "opacity-50"
                }`}
              >
                MEMORY
              </button>

              <button
                onClick={() => resetMode("both")}
                className={`cd-button ${
                  mode === "both" ? "opacity-100" : "opacity-50"
                }`}
              >
                BOTH
              </button>
            </div>

            <div className="mb-5">
              <p className="cd-label mb-2">YOUR AI KEY</p>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="w-full border border-[#222] bg-black px-4 py-3 text-sm outline-none"
                placeholder="sk-..."
              />
              <p className="mt-2 text-[10px] leading-5 opacity-50">
                Stored only in this browser session. Used only to let your dream
                speak.
              </p>
            </div>

            <div className="mb-5">
              <p className="cd-label mb-2">MODEL</p>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="w-full border border-[#222] bg-black px-4 py-3 text-sm outline-none"
                placeholder="gpt-4.1-mini"
              />
            </div>

            <button
              onClick={loadDream}
              disabled={!selectedToken || busyDream}
              className="cd-button w-full disabled:opacity-30"
            >
              {busyDream ? "UNLOCKING TOOL" : "LOAD SELECTED DREAM"}
            </button>

            <div className="mt-5 border border-[#222] p-4">
              <p className="cd-label mb-3">HOW IT WORKS</p>
              <p className="text-xs leading-7 opacity-60">
                This page loads the Chain Dreams you own, then calls the
                registered OpenSea tool with your connected wallet. Your wallet
                signs the zero-value authorization, the tool verifies ownership,
                and the dream data is returned.
              </p>
            </div>

            {error && (
              <p className="mt-5 border border-[#553] p-4 text-xs leading-6 tracking-[0.12em] text-[#bfce72]">
                {error}
              </p>
            )}
          </div>

          <div className="border border-[#222] bg-black p-5">
            <p className="cd-label mb-4">DREAM CHAT</p>

            <div className="mb-5 min-h-[360px] overflow-auto border border-[#222] p-4">
              {messages.length === 0 ? (
                <p className="text-xs leading-7 opacity-50">
                  Connect wallet, select one of your Chain Dreams, and load the
                  dream. Then ask Ratchet Vex to interpret the phrase, explain
                  the mood, or describe what the token is dreaming.
                </p>
              ) : (
                <div className="grid gap-4">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`}>
                      <p className="cd-label mb-2">
                        {message.role === "user" ? "COLLECTOR" : "RATCHET VEX"}
                      </p>
                      <p className="whitespace-pre-wrap text-xs leading-7 opacity-70">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-28 w-full resize-none border border-[#222] bg-black px-4 py-3 text-sm leading-7 outline-none"
                placeholder="Ask the dream something..."
              />

              <button
                onClick={askDream}
                disabled={!toolData || !apiKey.trim() || busyChat}
                className="cd-button disabled:opacity-30"
              >
                {busyChat ? "LISTENING" : "ASK THE DREAM"}
              </button>
            </div>
          </div>
        </div>

        <section className="mt-12 border border-[#222] bg-black p-6">
          <p className="cd-label mb-5">RAW TOOL MEMORY</p>

          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 opacity-60">
            {toolData
              ? JSON.stringify(toolData, null, 2)
              : "No dream data loaded yet."}
          </pre>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}