import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "icons");

await mkdir(out, { recursive: true });

function svgFor(size, maskable) {
  const pad = maskable ? Math.round(size * 0.12) : 0;
  const inner = size - 2 * pad;
  const rxBg = maskable ? size * 0.22 : size * 0.18;
  const rxInner = inner * 0.14;
  const fontSize = Math.round(inner * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#312e81" rx="${rxBg}"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" fill="#6366f1" rx="${rxInner}"/>
  <text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="800" font-size="${fontSize}">AM</text>
</svg>`;
}

async function write(size, filename, maskable) {
  const buf = Buffer.from(svgFor(size, maskable));
  await sharp(buf).png().toFile(join(out, filename));
}

await write(192, "icon-192.png", false);
await write(512, "icon-512.png", false);
await write(180, "apple-touch-icon.png", false);
await write(512, "icon-maskable-512.png", true);
console.log("PWA icons written to", out);
