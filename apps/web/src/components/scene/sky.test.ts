import { describe, expect, it } from "vitest";
import { SKY_INIT_SCRIPT, skyForWidth } from "./sky";

/** Runs the inline <head> script against a fake window and returns the --sky it sets. */
function runInitScript(width: number): number {
  let value = "";
  const document = {
    documentElement: { style: { setProperty: (_: string, v: string) => (value = v) } },
  };
  new Function("innerWidth", "document", SKY_INIT_SCRIPT)(width, document);
  return Number(value);
}

describe("sky from viewport width", () => {
  it("holds the three pure lights", () => {
    expect(skyForWidth(375)).toBe(0);
    expect(skyForWidth(560)).toBe(0);
    expect(skyForWidth(820)).toBe(1);
    expect(skyForWidth(1100)).toBe(1);
    expect(skyForWidth(1280)).toBe(2);
    expect(skyForWidth(2560)).toBe(2);
  });

  it("blends smoothly and never goes backwards", () => {
    let previous = 0;
    for (let width = 320; width <= 1920; width += 1) {
      const sky = skyForWidth(width);
      expect(sky).toBeGreaterThanOrEqual(previous);
      expect(sky - previous).toBeLessThan(0.02);
      previous = sky;
    }
  });

  it("matches the inline script that runs before first paint", () => {
    for (let width = 320; width <= 1920; width += 10) {
      expect(runInitScript(width)).toBeCloseTo(skyForWidth(width), 10);
    }
  });
});
