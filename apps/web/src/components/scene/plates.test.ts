import { describe, expect, it } from "vitest";
import { LANDSCAPE, LAYER_MEDIA, PORTRAIT, srcSet } from "./plates";
import { skyForWidth } from "./sky";

/** Evaluates the simple min-width / max-width queries used by the layers. */
function matches(query: string, width: number) {
  const min = /min-width:\s*([\d.]+)px/.exec(query);
  const max = /max-width:\s*([\d.]+)px/.exec(query);
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
}

describe("painted plates", () => {
  it("downloads a layer on exactly the widths where it can be seen", () => {
    for (let width = 320; width <= 2560; width += 1) {
      const sky = skyForWidth(width);
      const visible = {
        day: sky < 1, // dusk is opaque from sky = 1
        dusk: sky > 0 && sky < 2, // night is opaque from sky = 2
        night: sky > 1,
      };
      for (const layer of ["day", "dusk", "night"] as const) {
        expect(matches(LAYER_MEDIA[layer], width), `${layer} at ${width}px`).toBe(visible[layer]);
      }
    }
  });

  it("lists every exported size, smallest first", () => {
    expect(srcSet("night", "avif")).toBe(
      LANDSCAPE.widths.map((w) => `/art/scene/night-${w}.avif ${w}w`).join(", "),
    );
    expect(srcSet("day-portrait", "webp").split(", ")).toHaveLength(PORTRAIT.widths.length);
  });
});
