/*
 * The painted London backdrop: one scene at three times of day, aligned to the pixel so they can
 * cross-fade. Day sits at the bottom, dusk fades in over it, then night over dusk, all driven by
 * --sky (see sky.ts). Each layer only downloads on the widths where it can be seen.
 */

export const PLATE_DIR = "/art/scene";

/** A 1 x 1 transparent GIF: what a layer "loads" on widths where it is fully hidden. */
export const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const LANDSCAPE = { width: 3344, height: 1882, widths: [1280, 1920, 2560, 3344] } as const;
export const PORTRAIT = { width: 1882, height: 3344, widths: [720, 1080, 1440, 1882] } as const;

/** Phones held upright get the tall daylight painting instead of a sliver of the wide one. */
export const PORTRAIT_MEDIA = "(max-width: 560px) and (orientation: portrait)";

/*
 * Where each layer is visible, matching SKY_STOPS: day until 768 px (dusk is opaque from there),
 * dusk from 560 px until 1280 px (night is opaque from there), night from 1100 px.
 */
export const LAYER_MEDIA = {
  day: "(max-width: 767.98px)",
  dusk: "(min-width: 560.02px) and (max-width: 1279.98px)",
  night: "(min-width: 1100.02px)",
} as const;

export type Plate = "day" | "dusk" | "night" | "day-portrait";

export function srcSet(plate: Plate, format: "avif" | "webp") {
  const { widths } = plate === "day-portrait" ? PORTRAIT : LANDSCAPE;
  return widths.map((w) => `${PLATE_DIR}/${plate}-${w}.${format} ${w}w`).join(", ");
}

/** Rendered width of a plate that covers the viewport (see plates.css). */
export const LANDSCAPE_SIZES = "max(100vw, 178vh)";
export const PORTRAIT_SIZES = "max(100vw, 57vh)";

/*
 * Positions measured on the paintings, as percentages of the plate, for the effects drawn on top.
 */
export const LANDMARKS = {
  landscape: {
    lamps: [
      { x: 2.57, y: 43.0 },
      { x: 97.19, y: 43.15 },
    ],
    river: { top: 70.2, bottom: 83.9, left: 7.5, right: 92.5 },
    towers: [37.4, 62.6],
    /** Tower Bridge's lights, the same on the dusk and night paintings. */
    bridge: {
      // along the walkway's top edge, against the sky
      walkway: { y: 42.3, from: 39.8, to: 60.2 },
      // along the blue girders under the deck
      deck: {
        y: 64.9,
        spans: [
          [13.2, 32.2],
          [40.8, 59.2],
          [67.8, 88.4],
        ],
      },
      /** The lit stonework of each tower: centre x, top and bottom. */
      towerBody: { top: 40.5, bottom: 62.5, width: 6.4 },
    },
  },
  portrait: {
    lamps: [],
    river: { top: 65.8, bottom: 79.6, left: 1, right: 97 },
    towers: [18, 82],
  },
} as const;
