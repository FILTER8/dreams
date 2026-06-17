import { defineManifest } from "@opensea/tool-sdk";

const BASE_URL = "https://dreams.ratchetvex.xyz";
const CREATOR_ADDRESS = "0x085610B382e4D4eecab01a43Ac99B42436af37bF";
const CHAIN_DREAMS_CONTRACT = "0x35221D6E9dC3E4a277F40b40f7492BE3b236D380";

export const chainDreamLookupManifest = defineManifest({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "chain-dream-lookup",
  description:
    "Token-gated lookup for the current Chain Dreams state of a token, including phrase, cycle, dream seed, owner, motion data, visual data link, and collection links.",
  endpoint: `${BASE_URL}/api/tools/chain-dream-lookup`,
  creatorAddress: CREATOR_ADDRESS,

  inputs: {
    type: "object",
    additionalProperties: false,
    properties: {
      tokenId: {
        type: "string",
        description: "Chain Dreams token ID to look up."
      },
      wallet: {
        type: "string",
        description: "Wallet address requesting access. Must currently own the token."
      },
      signature: {
        type: "string",
        description:
          "Signature over the Chain Dreams tool access message for this token and wallet."
      }
    },
    required: ["tokenId", "wallet", "signature"]
  },

  outputs: {
    type: "object",
    additionalProperties: true,
    properties: {
      success: { type: "boolean" },
      tool: { type: "string" },
      version: { type: "string" },
      tokenId: { type: "string" },
      cycle: { type: "string" },
      owner: { type: "string" },
      dream: {
        type: "object",
        properties: {
          phrase: { type: "string" },
          dreamSeed: { type: "string" }
        },
        required: ["phrase", "dreamSeed"]
      },
      vocabulary: {
        type: "object",
        properties: {
          subjects: { type: "number" },
          verbs: { type: "number" },
          endings: { type: "number" }
        }
      },
      motion: {
        type: "object",
        properties: {
          orbitSpeed: { type: "string" },
          driftSpeed: { type: "string" },
          ditherTempo: { type: "string" }
        }
      },
      links: {
        type: "object",
        properties: {
          dream: { type: "string" },
          visual: { type: "string" },
          visualData: { type: "string" },
          opensea: { type: "string" }
        }
      }
    },
    required: ["success", "tool", "version", "tokenId", "cycle", "owner", "dream"]
  },

  "io.opensea.display": {
    title: "Chain Dream Lookup",
    category: "Agent memory",
    icon: `${BASE_URL}/ratchet-vex-dreaming.png`,
    featuredImage: `${BASE_URL}/ratchet-vex-dreaming.png`
  },

  "io.opensea.access": {
    type: "erc721-owner",
    chain: "eip155:1",
    contract: CHAIN_DREAMS_CONTRACT,
    description: "Caller must own the Chain Dreams token being queried."
  },

  "io.opensea.collection": {
    name: "Chain Dreams",
    contract: CHAIN_DREAMS_CONTRACT,
    chain: "ethereum",
    standard: "ERC-721",
    website: BASE_URL
  }
});

export const chainDreamHistoryManifest = defineManifest({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "chain-dream-history",
  description:
    "Token-gated lookup for the historical Chain Dreams record of a token, returning previous dream phrases, cycles, seeds, motion data, and current dream state.",
  endpoint: `${BASE_URL}/api/tools/chain-dream-history`,
  creatorAddress: CREATOR_ADDRESS,

  inputs: {
    type: "object",
    additionalProperties: false,
    properties: {
      tokenId: {
        type: "string",
        description: "Chain Dreams token ID to inspect."
      },
      wallet: {
        type: "string",
        description: "Wallet address requesting access. Must currently own the token."
      },
      signature: {
        type: "string",
        description:
          "Signature over the Chain Dreams tool access message for this token and wallet."
      }
    },
    required: ["tokenId", "wallet", "signature"]
  },

  outputs: {
    type: "object",
    additionalProperties: true,
    properties: {
      success: { type: "boolean" },
      tool: { type: "string" },
      version: { type: "string" },
      tokenId: { type: "string" },
      current: {
        type: "object",
        properties: {
          cycle: { type: "string" },
          phrase: { type: "string" },
          dreamSeed: { type: "string" },
          motion: { type: "object" }
        }
      },
      historyCount: { type: "number" },
      history: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cycle: { type: "string" },
            phrase: { type: "string" },
            dreamSeed: { type: ["string", "null"] },
            motion: { type: ["object", "null"] },
            ok: { type: "boolean" }
          }
        }
      }
    },
    required: ["success", "tool", "version", "tokenId", "current", "historyCount", "history"]
  },

  "io.opensea.display": {
    title: "Chain Dream History",
    category: "Agent memory",
    icon: `${BASE_URL}/ratchet-vex-dreaming.png`,
    featuredImage: `${BASE_URL}/ratchet-vex-dreaming.png`
  },

  "io.opensea.access": {
    type: "erc721-owner",
    chain: "eip155:1",
    contract: CHAIN_DREAMS_CONTRACT,
    description: "Caller must own the Chain Dreams token being queried."
  },

  "io.opensea.collection": {
    name: "Chain Dreams",
    contract: CHAIN_DREAMS_CONTRACT,
    chain: "ethereum",
    standard: "ERC-721",
    website: BASE_URL
  }
});