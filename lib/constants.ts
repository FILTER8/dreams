export const CHAIN_DREAMS_CONTRACT =
  process.env.NEXT_PUBLIC_CHAIN_DREAMS_CONTRACT ??
  "0x35221D6E9dC3E4a277F40b40f7492BE3b236D380";

export const OPENSEA_COLLECTION_URL =
  "https://opensea.io/collection/chain-dreams-1982/overview";

export function openseaTokenUrl(tokenId: string | number) {
  return `https://opensea.io/assets/ethereum/${CHAIN_DREAMS_CONTRACT}/${tokenId}`;
}
