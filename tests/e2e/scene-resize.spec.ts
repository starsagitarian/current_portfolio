import { expect, test, type Page } from "@playwright/test";

/*
 * The painting follows the window as it is resized (or a tablet is turned), in every engine.
 * Safari's picks a <picture>'s image once and keeps it, so a layer that was out of range when
 * the page loaded stayed blank: phones and tablets showed flat sky. This drags one window from
 * desktop through tablet to phone and back, and every layer in view must show its painting.
 */

/**
 * The layers that can be seen, and whether each shows a real painting (not the blank pixel).
 * They stack day, dusk, night; a layer under a fully opaque one is covered, and may stay blank.
 */
const visibleLayers = (page: Page) =>
  page.evaluate(() => {
    const seen: { layer: string; painted: boolean }[] = [];
    for (const plate of [...document.querySelectorAll<HTMLElement>(".plate")].reverse()) {
      const opacity = Number(getComputedStyle(plate).opacity);
      if (opacity <= 0.05) continue;
      const img = plate.querySelector("img");
      seen.push({
        layer: plate.className.replace("plate plate-", ""),
        painted: img !== null && img.complete && img.naturalWidth > 1,
      });
      if (opacity >= 0.999) break;
    }
    return seen;
  });

test("the painting follows the window from desktop to phone and back", async ({ page }, info) => {
  test.skip(!["desktop", "webkit"].includes(info.project.name), "a desktop window, resized");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  for (const [width, height] of [
    [1440, 900],
    [1180, 900],
    [820, 1000],
    [600, 900],
    [390, 844],
    [820, 1000],
    [1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    // every layer in view painted, once the window has settled
    await expect
      .poll(
        async () => {
          const layers = await visibleLayers(page);
          return layers.length > 0 && layers.every((layer) => layer.painted)
            ? "painted"
            : JSON.stringify(layers);
        },
        { message: `${width} × ${height}`, timeout: 10_000 },
      )
      .toBe("painted");
  }
});
