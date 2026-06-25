import { defineManifest } from "@opensea/tool-sdk";

export const BASE_URL = "https://dreams.ratchetvex.xyz";
export const CREATOR_ADDRESS = "0x085610b382e4d4eecab01a43ac99b42436af37bf";
export const CHAIN_DREAMS_CONTRACT =
  "0x35221d6e9dc3e4a277f40b40f7492be3b236d380";

const ICON_URL = `${BASE_URL}/tool-icon.png`;
const FEATURED_URL = `${BASE_URL}/tool-featured.png`;

const access = {
  logic: "OR",
  requirements: [
    {
      kind: "0xbdf8c428",
      data: "0x00000000000000000000000035221d6e9dc3e4a277f40b40f7492be3b236d380",
      label: "Hold any NFT from this collection",
      links: {
        opensea:
          "https://opensea.io/assets/ethereum/0x35221D6E9dC3E4a277F40b40f7492BE3b236D380",
      },
    },
  ],
};

const inputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    tokenId: {
      type: "string",
      description: "Chain Dreams token ID to query.",
    },
  },
  required: ["tokenId"],
};

const accessMetadata = {
  type: "erc721-owner",
  chain: "eip155:1",
  contract: CHAIN_DREAMS_CONTRACT,
  description:
    "Caller must own the Chain Dreams token being queried. Caller identity is recovered from OpenSea predicate-gate zero-value EIP-3009 authorization.",
};

const collectionMetadata = {
  name: "Chain Dreams",
  contract: CHAIN_DREAMS_CONTRACT,
  chain: "ethereum",
  chainId: 1,
  standard: "ERC-721",
  website: BASE_URL,
  opensea: `https://opensea.io/assets/ethereum/${CHAIN_DREAMS_CONTRACT}`,
};

const agentMetadata = {
  name: "Ratchet Vex",
  handle: "@RatchetVex",
  role: "dreamer",
  description:
    "An agent collecting forgotten signals, synthetic memories, and daily dreams.",
};

export const chainDreamLookupManifest = defineManifest({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "chain-dream-lookup",
  description:
    "Token-gated lookup for the current Chain Dreams state of a token. Returns the current phrase, cycle, dream seed, owner, vocabulary counts, motion data, visual traits, collection context, Ratchet Vex agent context, and links.",
  endpoint: `${BASE_URL}/api/tools/chain-dream-lookup`,
  creatorAddress: CREATOR_ADDRESS,
  access,

  inputs: inputSchema,

  outputs: {
    type: "object",
    additionalProperties: true,
    properties: {
      success: { type: "boolean" },
      tool: { type: "string" },
      version: { type: "string" },

      access: {
        type: "object",
        properties: {
          tokenGated: { type: "boolean" },
          wallet: { type: "string" },
          verifiedOwner: { type: "boolean" },
          auth: { type: "string" },
        },
        required: ["tokenGated", "wallet", "verifiedOwner"],
      },

      collection: {
        type: "object",
        properties: {
          name: { type: "string" },
          contract: { type: "string" },
          chain: { type: "string" },
          standard: { type: "string" },
          website: { type: "string" },
        },
        required: ["name", "contract", "chain", "standard", "website"],
      },

      agent: {
        type: "object",
        properties: {
          name: { type: "string" },
          handle: { type: "string" },
          role: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "handle", "role"],
      },

      token: {
        type: "object",
        properties: {
          tokenId: { type: "string" },
          name: { type: "string" },
          owner: { type: "string" },
          opensea: { type: "string" },
        },
        required: ["tokenId", "name", "owner"],
      },

      dream: {
        type: "object",
        properties: {
          cycle: { type: "string" },
          phrase: { type: "string" },
          dreamSeed: { type: "string" },
          page: { type: "string" },
        },
        required: ["cycle", "phrase", "dreamSeed", "page"],
      },

      vocabulary: {
        type: "object",
        properties: {
          subjects: { type: "number" },
          verbs: { type: "number" },
          endings: { type: "number" },
        },
      },

      motion: {
        type: "object",
        properties: {
          orbitSpeed: { type: "string" },
          driftSpeed: { type: "string" },
          ditherTempo: { type: "string" },
        },
      },

      visual: {
        type: "object",
        properties: {
          page: { type: "string" },
          data: { type: "string" },
          image: { type: "string" },
          traits: {
            type: ["object", "null"],
            properties: {
              mood: { type: "number" },
              moodName: { type: "string" },
              blobCount: { type: "number" },
              ditherCount: { type: "number" },
              contourCount: { type: "number" },
              satelliteCount: { type: "number" },
              bgColor: { type: "number" },
            },
          },
        },
      },

      links: {
        type: "object",
        properties: {
          dream: { type: "string" },
          visual: { type: "string" },
          visualData: { type: "string" },
          opensea: { type: "string" },
          manifest: { type: "string" },
        },
      },
    },
    required: [
      "success",
      "tool",
      "version",
      "access",
      "collection",
      "agent",
      "token",
      "dream",
    ],
  },

  "io.opensea.display": {
    title: "Chain Dream Lookup",
    subtitle: "Read the current dream state of a token",
    category: "Agent memory",
    icon: ICON_URL,
    featuredImage: FEATURED_URL,
    website: BASE_URL,
  },

  "io.opensea.access": accessMetadata,
  "io.opensea.collection": collectionMetadata,
  "io.opensea.agent": agentMetadata,

  "io.chain-dreams.tool": {
    layer: "current-dream",
    purpose: "Allows agents to read the current dream carried by a token.",
    tokenGated: true,
    requiresSignature: false,
    auth: "predicate-gate-eip3009-zero-value",
    supportedTokenStandard: "ERC-721",
  },
});

export const chainDreamHistoryManifest = defineManifest({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "chain-dream-history",
  description:
    "Token-gated lookup for the historical Chain Dreams record of a token. Returns the current dream plus previous dream cycles, phrases, seeds, motion data, and dreamer metadata.",
  endpoint: `${BASE_URL}/api/tools/chain-dream-history`,
  creatorAddress: CREATOR_ADDRESS,
  access,

  inputs: inputSchema,

  outputs: {
    type: "object",
    additionalProperties: true,
    properties: {
      success: { type: "boolean" },
      tool: { type: "string" },
      version: { type: "string" },

      access: {
        type: "object",
        properties: {
          tokenGated: { type: "boolean" },
          wallet: { type: "string" },
          verifiedOwner: { type: "boolean" },
          auth: { type: "string" },
        },
        required: ["tokenGated", "wallet", "verifiedOwner"],
      },

      tokenId: { type: "string" },

      current: {
        type: "object",
        properties: {
          cycle: { type: "string" },
          phrase: { type: "string" },
          dreamSeed: { type: "string" },
          motion: { type: "object" },
        },
        required: ["cycle", "phrase", "dreamSeed"],
      },

      historyCount: { type: "number" },

      history: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cycle: { type: "string" },
            dreamer: { type: "string" },
            handle: { type: ["string", "null"] },
            phrase: { type: "string" },
            dreamSeed: { type: ["string", "null"] },
            motion: { type: ["object", "null"] },
            ok: { type: "boolean" },
          },
          required: ["cycle", "dreamer", "phrase"],
        },
      },

      links: {
        type: "object",
        properties: {
          dream: { type: "string" },
          visual: { type: "string" },
          visualData: { type: "string" },
          opensea: { type: "string" },
        },
      },
    },
    required: [
      "success",
      "tool",
      "version",
      "access",
      "tokenId",
      "current",
      "historyCount",
      "history",
    ],
  },

  "io.opensea.display": {
    title: "Chain Dream History",
    subtitle: "Read the memory of a token across dream cycles",
    category: "Agent memory",
    icon: ICON_URL,
    featuredImage: FEATURED_URL,
    website: BASE_URL,
  },

  "io.opensea.access": accessMetadata,
  "io.opensea.collection": collectionMetadata,
  "io.opensea.agent": agentMetadata,

  "io.chain-dreams.tool": {
    layer: "dream-history",
    purpose:
      "Allows agents to read the historical dream memory carried by a token.",
    tokenGated: true,
    requiresSignature: false,
    auth: "predicate-gate-eip3009-zero-value",
    supportedTokenStandard: "ERC-721",
  },
});
