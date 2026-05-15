// Generate PNG icons from public/icon.svg at the sizes the PWA + iOS need.
//   npx tsx scripts/generate-icons.ts

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const svg = readFileSync(resolve(process.cwd(), "public/icon.svg"));

const targets: Array<{ size: number; name: string }> = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  // iOS pulls apple-touch-icon at 180. Lots of devices look for /favicon.ico
  // but a 32px PNG fallback is fine for modern browsers.
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32, name: "favicon-32.png" },
];

async function main() {
  for (const t of targets) {
    const out = resolve(process.cwd(), "public", t.name);
    await sharp(svg).resize(t.size, t.size).png().toFile(out);
    console.log("wrote", out);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
