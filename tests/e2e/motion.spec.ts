import { expect, test, type Page } from "@playwright/test";

/*
 * Ambient motion: every loop stays on the compositor (transform and opacity only), nothing loops
 * for visitors who ask for reduced motion, and everything pauses while the tab is hidden.
 */

const PAGES = ["/", "/prototype"];

/** Properties a loop may animate without forcing layout or paint. */
const COMPOSITED = new Set(["transform", "opacity", "translate", "scale", "rotate"]);
const KEYFRAME_META = new Set(["offset", "computedOffset", "easing", "composite"]);

/**
 * The animations that play over time. Scroll-driven ones (the header's frost, sections rising
 * into view) follow the scroll position instead, so they never loop and are not counted.
 */
async function animationsOn(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.timeline === document.timeline)
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target;
        return {
          name: (animation as CSSAnimation).animationName,
          on: target?.className.toString().split(" ")[0] ?? "",
          state: animation.playState,
          properties: [
            ...new Set((effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame))),
          ],
        };
      }),
  );
}

async function setTabHidden(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (value ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

for (const path of PAGES) {
  test(`every loop on ${path} animates transform or opacity only`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    const animations = await animationsOn(page);

    expect(animations.length).toBeGreaterThan(10);
    for (const animation of animations) {
      const painted = animation.properties.filter(
        (property) => !KEYFRAME_META.has(property) && !COMPOSITED.has(property),
      );
      expect(painted, `${animation.name} on .${animation.on}`).toEqual([]);
    }
  });

  test(`nothing loops on ${path} for visitors who prefer reduced motion`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(path);
    await page.waitForLoadState("load");

    expect(await animationsOn(page)).toEqual([]);
    await context.close();
  });

  test(`every loop on ${path} pauses while the tab is hidden`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");

    await setTabHidden(page, true);
    await expect(page.locator("html")).toHaveAttribute("data-tab-hidden", "");
    const hidden = await animationsOn(page);
    expect(hidden.length).toBeGreaterThan(10);
    expect(hidden.filter((animation) => animation.state !== "paused")).toEqual([]);

    await setTabHidden(page, false);
    await expect(page.locator("html")).not.toHaveAttribute("data-tab-hidden");
    const visible = await animationsOn(page);
    expect(visible.every((animation) => animation.state === "running")).toBe(true);
  });
}
