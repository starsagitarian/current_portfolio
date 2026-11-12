import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SKY_STOPS, skyForWidth } from "./sky";

const css = readFileSync(path.join(import.meta.dirname, "tokens.css"), "utf8");

describe("the no-JavaScript fallback in tokens.css", () => {
  it("switches to dusk and blue hour at the same widths as the engine", () => {
    const breakpoints = [
      ...css.matchAll(/@media \(min-width: (\d+)px\)\s*{\s*:root\s*{\s*--sky: (\d)/g),
    ].map((match) => [Number(match[1]), Number(match[2])]);
    expect(breakpoints).toEqual([
      [SKY_STOPS.dusk, 1],
      [SKY_STOPS.night, 2],
    ]);
    expect(skyForWidth(SKY_STOPS.dusk)).toBe(1);
    expect(skyForWidth(SKY_STOPS.night)).toBe(2);
  });
});
