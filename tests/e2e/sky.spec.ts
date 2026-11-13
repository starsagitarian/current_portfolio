import { expect, test, type Page } from "@playwright/test";

/*
 * The light that follows the window width: set before first paint, kept in step while resizing,
 * readable at every width, and light on downloads.
 */

const skyOf = (page: Page) =>
  page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--sky")));

const nextFrame = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );

test("sets the light for the width before the page first paints", async ({ page }) => {
  // Read --sky as the very first script after the inline one, before React or any other code.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { firstSky: string }).firstSky =
        document.documentElement.style.getPropertyValue("--sky");
    });
  });
  await page.goto("/");

  const first = await page.evaluate(() => (window as unknown as { firstSky: string }).firstSky);
  const width = page.viewportSize()?.width ?? 0;
  expect(first).not.toBe("");
  if (width <= 560) expect(Number(first)).toBe(0);
  else if (width >= 1280) expect(Number(first)).toBe(2);
  else expect(Number(first)).toBeGreaterThan(0);
});

test.describe("on a desktop browser", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "resizes the window itself");
  });

  test("follows the window while it is resized", async ({ page }) => {
    await page.goto("/");
    for (const [width, expected] of [
      [1440, 2],
      [375, 0],
      [900, 1],
      [1920, 2],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await nextFrame(page);
      expect(await skyOf(page), `${width} px`).toBe(expected);
    }

    await page.setViewportSize({ width: 660, height: 900 });
    await nextFrame(page);
    const blend = await skyOf(page);
    expect(blend).toBeGreaterThan(0);
    expect(blend).toBeLessThan(1);
  });
});

test("without JavaScript, shows the pure light for the width", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one run covers the three widths");

  for (const [width, expected] of [
    [375, "0"],
    [900, "1"],
    [1440, "2"],
  ] as const) {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");
    // Playwright's own evaluation still runs; the page's scripts do not.
    const state = await page.evaluate(() => ({
      inline: document.documentElement.style.getPropertyValue("--sky"),
      sky: getComputedStyle(document.documentElement).getPropertyValue("--sky").trim(),
    }));
    expect(state.inline, `${width} px: no script ran`).toBe("");
    expect(state.sky, `${width} px`).toBe(expected);
    await expect(page.locator(".plates")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
    await context.close();
  }
});

test("downloads only the one painting this screen shows", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");

  const scene = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/art/scene/"))
      .map((entry) => ({
        name: entry.name.split("/").pop() ?? "",
        bytes: (entry as PerformanceResourceTiming).encodedBodySize,
      })),
  );

  expect(scene.map((entry) => entry.name)).toHaveLength(1);
  const total = scene.reduce((sum, entry) => sum + entry.bytes, 0);
  expect(total, scene.map((entry) => entry.name).join(", ")).toBeLessThanOrEqual(260_000);
});
