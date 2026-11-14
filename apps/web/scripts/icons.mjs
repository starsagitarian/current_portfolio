/**
 * Builds the home-screen icons in public/icons from the logo (design/brand), the emblem without
 * its wordmark on the logo's own cream:
 *
 *   icon-192.png, icon-512.png   the emblem filling most of the square (purpose "any")
 *   icon-maskable-512.png        more cream around it, so Android's circle and squircle masks
 *                                (which keep only the middle 80%) never clip the star
 *
 *   npm run icons -w @starsagitarian/web
 */
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "../../..");
const LOGO = path.join(root, "design/brand/starsagitarian-logo.png");
const OUT = path.join(import.meta.dirname, "../public/icons");

/**
 * The emblem's box in the 400 px logo, measured once (it spans x 90-315, y 76-276), with a
 * margin of plain cream: 10 px on three sides, 3 px below, where the wordmark ribbon starts.
 */
const EMBLEM = { left: 80, top: 66, width: 246, height: 214 };
const MARGIN = { side: 10, bottom: 3 };

// The logo's cream is lighter in the middle: take the colour from the emblem box's own edge.
const box = await sharp(LOGO).extract(EMBLEM).raw().toBuffer();
const edge = [];
for (let x = 0; x < EMBLEM.width; x++) edge.push(x, (EMBLEM.height - 1) * EMBLEM.width + x);
for (let y = 0; y < EMBLEM.height; y++)
  edge.push(y * EMBLEM.width, y * EMBLEM.width + EMBLEM.width - 1);
const mean = (c) =>
  Math.round(edge.reduce((sum, i) => sum + (box[i * 3 + c] ?? 0), 0) / edge.length);
const cream = { r: mean(0), g: mean(1), b: mean(2), alpha: 1 };

/** Fades the box's border into the cream, so no seam shows where the crop meets it. */
const feather = await sharp(
  Buffer.from(
    `<svg width="${EMBLEM.width}" height="${EMBLEM.height}"><rect x="${MARGIN.side}" y="${MARGIN.side}" width="${EMBLEM.width - 2 * MARGIN.side}" height="${EMBLEM.height - MARGIN.side - MARGIN.bottom}" fill="#fff"/></svg>`,
  ),
)
  .blur(3)
  .png()
  .toBuffer();
const emblem = await sharp(LOGO)
  .extract(EMBLEM)
  .ensureAlpha()
  .composite([{ input: feather, blend: "dest-in" }])
  .png()
  .toBuffer();

/** The emblem centred on cream, taking `share` of the square's width, at `size` pixels. */
async function icon(file, size, share) {
  const side = Math.round(EMBLEM.width / share);
  const x = side - EMBLEM.width;
  const y = side - EMBLEM.height;
  // two passes: sharp would otherwise resize before extending, whatever the call order
  const square = await sharp(emblem)
    .extend({
      left: Math.floor(x / 2),
      right: Math.ceil(x / 2),
      top: Math.floor(y / 2),
      bottom: Math.ceil(y / 2),
      background: cream,
    })
    .flatten({ background: cream })
    .toBuffer();
  await sharp(square)
    .resize(size, size, { kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .png({ compressionLevel: 9, palette: true, quality: 95 })
    .toFile(path.join(OUT, file));
  console.info(`Wrote public/icons/${file}`);
}

await icon("icon-192.png", 192, 0.82);
await icon("icon-512.png", 512, 0.82);
await icon("icon-maskable-512.png", 512, 0.62);
