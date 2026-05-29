export type ChainDreamAttribute = {
  trait_type: string;
  value: string | number;
};

export type ChainDreamToken = {
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  tokenUri?: string;
  owner?: string;
  attributes?: ChainDreamAttribute[];
};

type UnknownRecord = Record<string, unknown>;

type AlchemyNft = {
  tokenId?: string | number;
  id?: {
    tokenId?: string | number;
  };
  name?: string;
  description?: string;
  raw?: {
    metadata?: UnknownRecord;
  };
  metadata?: UnknownRecord;
  image?: {
    originalUrl?: string;
    cachedUrl?: string;
  };
  media?: Array<{
    gateway?: string;
  }>;
  tokenUri?: {
    gateway?: string;
    raw?: string;
  };
  owners?: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function numberOrStringValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  return undefined;
}

export function normalizeTokenId(id: unknown) {
  if (typeof id === "number") return String(id);
  if (typeof id !== "string") return "";
  if (id.startsWith("0x")) return BigInt(id).toString();
  return id;
}

export function normalizeAttributes(attributes: unknown): ChainDreamAttribute[] {
  if (!Array.isArray(attributes)) return [];

  return attributes.reduce<ChainDreamAttribute[]>((acc, rawAttr) => {
    if (!isRecord(rawAttr)) return acc;

    const traitType =
      stringValue(rawAttr.trait_type) ??
      stringValue(rawAttr.traitType) ??
      stringValue(rawAttr.key) ??
      stringValue(rawAttr.name);

    const value =
      numberOrStringValue(rawAttr.value) ??
      numberOrStringValue(rawAttr.trait_value) ??
      numberOrStringValue(rawAttr.traitValue);

    if (!traitType || value === undefined) return acc;

    acc.push({
      trait_type: traitType,
      value,
    });

    return acc;
  }, []);
}

export function fromAlchemyNft(nft: AlchemyNft): ChainDreamToken {
  const tokenId = normalizeTokenId(nft.tokenId ?? nft.id?.tokenId);
  const metadata = nft.raw?.metadata ?? nft.metadata ?? {};

  const image =
    stringValue(metadata.image) ??
    stringValue(metadata.image_url) ??
    nft.image?.originalUrl ??
    nft.image?.cachedUrl ??
    nft.media?.[0]?.gateway;

  const attributes = normalizeAttributes(metadata.attributes);

  return {
    tokenId,
    name: stringValue(metadata.name) ?? nft.name ?? `Chain Dreams #${tokenId}`,
    description: stringValue(metadata.description) ?? nft.description,
    image,
    animationUrl:
      stringValue(metadata.animation_url) ?? stringValue(metadata.animationUrl),
    tokenUri: nft.tokenUri?.gateway ?? nft.tokenUri?.raw,
    owner: nft.owners?.[0],
    attributes,
  };
}