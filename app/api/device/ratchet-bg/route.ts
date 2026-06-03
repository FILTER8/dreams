import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";

const W = 320;
const H = 240;

function rgb565(r: number, g: number, b: number) {
  return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
}

export async function GET() {
  const file = fs.readFileSync(
    path.join(process.cwd(), "public", "ratchet-vex-dreaming.png")
  );

  const rgb = await sharp(file)
    .resize(W, H)
    .removeAlpha()
    .raw()
    .toBuffer();

  const out = Buffer.alloc(W * H * 2);

  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 2) {
    const v = rgb565(rgb[i], rgb[i + 1], rgb[i + 2]);
   out[j] = v & 0xff;
out[j + 1] = v >> 8;
  }

  return new NextResponse(out, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(out.length),
      "cache-control": "public, max-age=3600",
      "x-format": "rgb565",
      "x-width": "320",
      "x-height": "240",
    },
  });
}