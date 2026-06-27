import { defineManifest } from "@opensea/tool-sdk";

type LooseManifest = Record<string, unknown>;

const defineManifestLoose = defineManifest as unknown as (
  manifest: LooseManifest,
) => LooseManifest;

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
      label: "Hold any NFT from Chain Dreams",
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
      description:
        "Chain Dreams token ID to query. Use the token ID owned by the authenticated wallet.",
    },
  },
  required: ["tokenId"],
};

const accessMetadata = {
  type: "erc721-owner",
  chain: "eip155:1",
  contract: CHAIN_DREAMS_CONTRACT,
  description:
    "Caller must own the Chain Dreams token being queried. Caller identity is recovered through OpenSea predicate-gate zero-value EIP-3009 authorization.",
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
    "Ratchet Vex is a dream agent collecting forgotten signals, synthetic memories, symbolic phrases, and daily dreams from Chain Dreams tokens.",
};

const commonOutputFields = {
  success: {
    type: "boolean",
    description:
      "Whether the tool call completed successfully after authentication and ownership checks.",
  },
  tool: {
    type: "string",
    description: "Internal tool name returned by the endpoint.",
  },
  version: {
    type: "string",
    description: "Version of the Chain Dreams tool response format.",
  },
  access: {
    type: "object",
    description:
      "Access information for the authenticated call. The wallet is recovered from the x402 predicate-gate flow.",
    properties: {
      tokenGated: {
        type: "boolean",
        description: "True when this response was protected by NFT ownership.",
      },
      wallet: {
        type: "string",
        description:
          "Wallet address recovered from the zero-value x402 authorization.",
      },
      verifiedOwner: {
        type: "boolean",
        description:
          "True when the recovered wallet passed the Chain Dreams ownership check.",
      },
      auth: {
        type: "string",
        description:
          "Authentication method used by the endpoint. Current flow is predicate-gate-eip3009-zero-value.",
      },
    },
    required: ["tokenGated", "wallet", "verifiedOwner"],
  },
};

const collectionOutput = {
  type: "object",
  description:
    "Collection context for Chain Dreams. Use this to explain where the dream comes from.",
  properties: {
    name: {
      type: "string",
      description: "Collection name.",
    },
    contract: {
      type: "string",
      description: "Ethereum mainnet ERC-721 contract address.",
    },
    chain: {
      type: "string",
      description: "Chain identifier for the collection.",
    },
    standard: {
      type: "string",
      description: "Token standard used by the collection.",
    },
    website: {
      type: "string",
      description: "Official Chain Dreams website.",
    },
  },
  required: ["name", "contract", "chain", "standard", "website"],
};

const agentOutput = {
  type: "object",
  description:
    "Ratchet Vex agent context. Use this to frame responses as dream interpretation, memory reading, or symbolic analysis.",
  properties: {
    name: {
      type: "string",
      description: "Agent name.",
    },
    handle: {
      type: "string",
      description: "Public handle for the Ratchet Vex agent.",
    },
    role: {
      type: "string",
      description:
        "Agent role inside the Chain Dreams world. Ratchet Vex acts as a dreamer and interpreter.",
    },
    description: {
      type: "string",
      description:
        "Narrative description of the agent and how it relates to Chain Dreams.",
    },
  },
  required: ["name", "handle", "role"],
};

const linksOutput = {
  type: "object",
  description:
    "Useful links for viewing the dream, visual state, OpenSea token page, and manifest.",
  properties: {
    dream: {
      type: "string",
      description: "Public page for the token dream.",
    },
    visual: {
      type: "string",
      description: "Visual page for the token dream state.",
    },
    visualData: {
      type: "string",
      description: "API endpoint for visual trait data.",
    },
    opensea: {
      type: "string",
      description: "OpenSea asset page for the token.",
    },
    manifest: {
      type: "string",
      description: "Tool manifest URL.",
    },
  },
};

export const chainDreamLookupManifest = defineManifestLoose({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "chain-dream-lookup",
  description:
    "Read and interpret the current dream of a Chain Dreams NFT. Use the returned dream phrase, cycle, dream seed, vocabulary counts, motion data, visual traits, token owner, collection context, and Ratchet Vex agent context to explain what the token is dreaming now. Respond like a thoughtful dream interpreter rather than simply listing fields.",
  endpoint: `${BASE_URL}/api/tools/chain-dream-lookup`,
  creatorAddress: CREATOR_ADDRESS,
  access,
  inputs: inputSchema,

  outputs: {
    type: "object",
    additionalProperties: true,
    properties: {
      ...commonOutputFields,

      collection: collectionOutput,
      agent: agentOutput,

      token: {
        type: "object",
        description:
          "Token context for the requested Chain Dreams NFT. Use this to identify which dream is being read.",
        properties: {
          tokenId: {
            type: "string",
            description: "The Chain Dreams token ID that was queried.",
          },
          name: {
            type: "string",
            description: "Token name.",
          },
          owner: {
            type: "string",
            description:
              "Current owner of the token. Access is only granted when this matches the authenticated wallet.",
          },
          opensea: {
            type: "string",
            description: "OpenSea asset page for this token.",
          },
        },
        required: ["tokenId", "name", "owner"],
      },

      dream: {
        type: "object",
        description:
          "The current dream carried by the token. Treat this as symbolic dream material, not just metadata.",
        properties: {
          cycle: {
            type: "string",
            description:
              "Current dream cycle. Use this to place the dream in time.",
          },
          phrase: {
            type: "string",
            description:
              "The main dream phrase generated for this token. This is the primary material to interpret.",
          },
          dreamSeed: {
            type: "string",
            description:
              "Deterministic seed behind the current dream state. Useful for explaining provenance, continuity, and reproducibility.",
          },
          page: {
            type: "string",
            description: "Public page for viewing this token's current dream.",
          },
        },
        required: ["cycle", "phrase", "dreamSeed", "page"],
      },

      vocabulary: {
        type: "object",
        description:
          "Vocabulary counts used by the Chain Dreams generator. These can help explain the structure and possibility space of the dream language.",
        properties: {
          subjects: {
            type: "number",
            description:
              "Number of available subject words in the dream vocabulary.",
          },
          verbs: {
            type: "number",
            description:
              "Number of available verb words in the dream vocabulary.",
          },
          endings: {
            type: "number",
            description:
              "Number of available ending fragments in the dream vocabulary.",
          },
        },
      },

      motion: {
        type: "object",
        description:
          "Motion parameters for the dream visual. Use these to describe the feeling, rhythm, or atmosphere of the dream.",
        properties: {
          orbitSpeed: {
            type: "string",
            description:
              "Speed of orbital movement in the visual dream state.",
          },
          driftSpeed: {
            type: "string",
            description:
              "Speed of drifting movement in the visual dream state.",
          },
          ditherTempo: {
            type: "string",
            description:
              "Tempo of dithering or texture movement in the visual dream state.",
          },
        },
      },

      visual: {
        type: "object",
        description:
          "Visual state of the current dream. Use this to connect the phrase to image, motion, mood, density, and atmosphere.",
        properties: {
          page: {
            type: "string",
            description: "Public visual page for the token dream.",
          },
          data: {
            type: "string",
            description: "API endpoint for visual trait data.",
          },
          image: {
            type: "string",
            description:
              "Representative image for the Ratchet Vex dream context.",
          },
          traits: {
            type: ["object", "null"],
            description:
              "Visual traits generated from the current dream seed. These can be interpreted as the mood and structure of the dream.",
            properties: {
              mood: {
                type: "number",
                description: "Numeric mood index for the dream visual.",
              },
              moodName: {
                type: "string",
                description:
                  "Human-readable mood name. Use this as a strong interpretive signal.",
              },
              blobCount: {
                type: "number",
                description:
                  "Number of blob-like forms in the visual dream state.",
              },
              ditherCount: {
                type: "number",
                description:
                  "Amount of dither texture in the visual dream state.",
              },
              contourCount: {
                type: "number",
                description:
                  "Number of contour forms in the visual dream state.",
              },
              satelliteCount: {
                type: "number",
                description:
                  "Number of satellite elements orbiting or surrounding the visual state.",
              },
              bgColor: {
                type: "number",
                description:
                  "Background color index used by the visual dream state.",
              },
            },
          },
        },
      },

      links: linksOutput,
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
    subtitle: "Ask what a Chain Dreams token is dreaming now",
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
    purpose:
      "Allows agents to read and interpret the current dream carried by a Chain Dreams token.",
    examplePrompt:
      "Use Chain Dream Lookup for token #1. Tell me what the token is dreaming right now. Explain the phrase, motion data, visual traits, and dream seed like an oracle reading.",
    tokenGated: true,
    requiresSignature: false,
    auth: "predicate-gate-eip3009-zero-value",
    supportedTokenStandard: "ERC-721",
  },
});

export const chainDreamHistoryManifest = defineManifestLoose({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "chain-dream-history",
  description:
    "Read and interpret the historical dream memory of a Chain Dreams NFT. Compare the current dream with previous dream cycles, identify recurring symbols, explain how the token's dream language has evolved, and describe the memory as a narrative rather than a database.",
  endpoint: `${BASE_URL}/api/tools/chain-dream-history`,
  creatorAddress: CREATOR_ADDRESS,
  access,
  inputs: inputSchema,

  outputs: {
    type: "object",
    additionalProperties: true,
    properties: {
      ...commonOutputFields,

      tokenId: {
        type: "string",
        description: "The Chain Dreams token ID whose memory was queried.",
      },

      current: {
        type: "object",
        description:
          "Current dream state of the token. Use this as the present moment when comparing against the historical memory.",
        properties: {
          cycle: {
            type: "string",
            description: "Current dream cycle.",
          },
          phrase: {
            type: "string",
            description:
              "Current dream phrase. Interpret this as the token's present symbolic state.",
          },
          dreamSeed: {
            type: "string",
            description:
              "Seed behind the current dream. Use this to explain continuity and provenance.",
          },
          motion: {
            type: "object",
            description:
              "Current motion parameters for the visual dream state.",
          },
        },
        required: ["cycle", "phrase", "dreamSeed"],
      },

      historyCount: {
        type: "number",
        description:
          "Number of historical dream records returned for this token.",
      },

      history: {
        type: "array",
        description:
          "Historical dream memory for the token. Compare these entries to find recurring phrases, themes, moods, or symbolic changes over time.",
        items: {
          type: "object",
          description:
            "One archived dream cycle. Treat each entry as a memory fragment carried by the token.",
          properties: {
            cycle: {
              type: "string",
              description: "Dream cycle when this memory was recorded.",
            },
            dreamer: {
              type: "string",
              description:
                "Dreamer or agent associated with this historical dream entry.",
            },
            handle: {
              type: ["string", "null"],
              description:
                "Public handle for the dreamer, if available.",
            },
            phrase: {
              type: "string",
              description:
                "Historical dream phrase. Use this as symbolic memory material.",
            },
            dreamSeed: {
              type: ["string", "null"],
              description:
                "Seed for this historical dream, if available.",
            },
            motion: {
              type: ["object", "null"],
              description:
                "Historical motion data, if available. Use it to compare rhythm and atmosphere across cycles.",
            },
            ok: {
              type: "boolean",
              description:
                "Whether the historical dream entry was valid and included in the archive.",
            },
          },
          required: ["cycle", "dreamer", "phrase"],
        },
      },

      links: {
        type: "object",
        description:
          "Useful links for viewing the token dream, visual state, visual data, and OpenSea asset page.",
        properties: {
          dream: {
            type: "string",
            description: "Public page for the token dream.",
          },
          visual: {
            type: "string",
            description: "Visual page for the token dream state.",
          },
          visualData: {
            type: "string",
            description: "API endpoint for visual trait data.",
          },
          opensea: {
            type: "string",
            description: "OpenSea asset page for the token.",
          },
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
      "Allows agents to read and interpret the historical dream memory carried by a Chain Dreams token.",
    examplePrompt:
      "Use Chain Dream History for token #1. Compare its past dreams with the current one. What themes repeat, and how has the token's memory evolved?",
    tokenGated: true,
    requiresSignature: false,
    auth: "predicate-gate-eip3009-zero-value",
    supportedTokenStandard: "ERC-721",
  },
});