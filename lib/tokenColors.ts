// lib/tokenColors.ts

export function decodeSvgDataUri(image?: string) {
  if (!image) return "";

  if (image.startsWith("data:image/svg+xml;base64,")) {
    const base64 = image.replace("data:image/svg+xml;base64,", "");
    return atob(base64);
  }

  if (image.startsWith("data:image/svg+xml;utf8,")) {
    return decodeURIComponent(image.replace("data:image/svg+xml;utf8,", ""));
  }

  return image;
}

export function extractTokenColors(image?: string) {
  const svg = decodeSvgDataUri(image);

  const matches = svg.match(/#[0-9a-fA-F]{6}/g) ?? [];

  const colors = Array.from(
    new Set(matches.map((color) => color.toLowerCase()))
  );

  return colors;
}

export function readableColor(bg: string) {
  const hex = bg.replace("#", "");

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 130 ? "#000000" : "#f4f4f4";
}