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

  test("keeps every line of text readable at every width from 320 to 1920 px", async ({
    browser,
  }) => {
    // Without the 0.35 s colour transition, so each width can be measured as soon as it settles.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const failures: string[] = [];
    for (let width = 320; width <= 1920; width += 10) {
      await page.setViewportSize({ width, height: 900 });
      await nextFrame(page);
      const problems = await page.evaluate(measureContrast);
      failures.push(...problems.map((problem) => `${width} px: ${problem}`));
    }
    await context.close();

    expect(failures, failures.slice(0, 10).join("\n")).toEqual([]);
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

/**
 * Runs in the page: for every element that holds text, the WCAG contrast between the text and
 * the surface behind it, with a translucent surface laid over pure black and over pure white
 * (the darkest and lightest the painting could be). Text must sit on a surface.
 */
function measureContrast(): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) return ["no canvas"];

  const rgba = (css: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top: number[], bottom: number[]) =>
    [0, 1, 2].map((i) => (top[i] ?? 0) * (top[3] ?? 1) + (bottom[i] ?? 0) * (1 - (top[3] ?? 1)));
  const luminance = (rgb: number[]) => {
    const [r = 0, g = 0, b = 0] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  };

  const problems: string[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(
    "body *:not(script, style, noscript)",
  )) {
    const ownText = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    if (ownText === "" || element.getClientRects().length === 0) continue;
    // text kept for screen readers only (clipped to nothing) is not seen, so not measured
    if (element.closest("[style*='clip'], .home-intro") !== null) {
      const box = element.getBoundingClientRect();
      const clipped = getComputedStyle(element.closest(".home-intro") ?? element).clipPath;
      if (clipped.startsWith("inset(50%") || box.width * box.height < 4) continue;
    }

    let surface: HTMLElement | null = element;
    let background = rgba(getComputedStyle(element).backgroundColor);
    while (background[3] === 0) {
      surface = surface.parentElement;
      if (surface === null || surface.tagName === "MAIN") break;
      background = rgba(getComputedStyle(surface).backgroundColor);
    }
    const label = `"${ownText.slice(0, 30)}"`;
    if (background[3] === 0) {
      problems.push(`${label} sits on the painting, not a surface`);
      continue;
    }

    const style = getComputedStyle(element);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const minimum = large ? 3 : 4.5;
    const text = rgba(style.color);
    for (const behind of [
      [0, 0, 0],
      [255, 255, 255],
    ]) {
      const bg = over(background, behind);
      const ratio = contrast(over(text, bg), bg);
      if (ratio < minimum) {
        problems.push(`${label} ${ratio.toFixed(2)}:1 over ${behind[0] === 0 ? "black" : "white"}`);
      }
    }
  }
  return problems;
}
