import { expect, test, type Page } from "@playwright/test";

/*
 * Home matches the mockups' layout at 375, 820 and 1440 px: the character centre stage on a
 * phone, on the left with section cards on the right on a tablet, and on the right with the
 * introduction on the left on a desktop.
 */

async function layout(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await expect(page.locator(".character img")).toHaveJSProperty("complete", true);
  return page.evaluate(() => {
    const intro = document.querySelector(".home-intro");
    const centre = (selector: string) => {
      const el = document.querySelector(selector);
      if (el === null) return null;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return null;
      return { x: box.left + box.width / 2, top: box.top, bottom: box.bottom, width: box.width };
    };
    return {
      width: innerWidth,
      height: innerHeight,
      character: centre(".home-stage .character"),
      // hidden cards measure 0 x 0: only count the ones on screen
      cards: [...document.querySelectorAll(".home-card")]
        .map((el) => el.getBoundingClientRect())
        .filter((box) => box.width > 0)
        .map((box) => box.left),
      intro: centre(".home-intro"),
      tabBar: centre(".tab-bar"),
      introVisible: intro !== null && getComputedStyle(intro).clipPath === "none",
    };
  });
}

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop", "sets each width itself");
});

test("375 px: the character centre stage, the tab bar below him", async ({ page }) => {
  const home = await layout(page, 375, 812);
  expect(home.character).not.toBeNull();
  expect(Math.abs((home.character?.x ?? 0) - home.width / 2)).toBeLessThan(home.width * 0.05);
  expect(home.cards).toEqual([]);
  expect(home.introVisible).toBe(false);
  expect(home.tabBar).not.toBeNull();
  // he stands above the tab bar, not behind it
  expect(home.character?.bottom ?? 0).toBeLessThanOrEqual((home.tabBar?.top ?? 0) + 1);
});

test("820 px: the character on the left, a card per section on the right", async ({ page }) => {
  const home = await layout(page, 820, 1180);
  expect(home.character?.x ?? 0).toBeLessThan(home.width * 0.4);
  expect(home.cards).toHaveLength(3);
  for (const left of home.cards) expect(left).toBeGreaterThan(home.width * 0.45);
  expect(home.introVisible).toBe(false);
  await expect(page.getByRole("link", { name: "Résumé" }).filter({ visible: true })).toHaveCount(1);
  expect(home.tabBar).toBeNull();
});

test("1440 px: the introduction on the left, the character on the right", async ({ page }) => {
  const home = await layout(page, 1440, 900);
  expect(home.introVisible).toBe(true);
  expect(home.intro?.x ?? 0).toBeLessThan(home.width * 0.4);
  expect(home.character?.x ?? 0).toBeGreaterThan(home.width * 0.65);
  expect(home.cards).toEqual([]);
  await expect(page.getByRole("heading", { level: 1, name: "Hi, I’m Baiju." })).toBeVisible();
  const actions = page.getByRole("navigation", { name: "Explore" }).getByRole("link");
  await expect(actions).toHaveText(["Résumé", "Projects", "Contact"]);
  await actions.first().click();
  await expect(page).toHaveURL("/resume");
});

test("the character stays clear of the header at every width", async ({ page }) => {
  for (const width of [320, 375, 600, 820, 1024, 1280, 1440, 1920]) {
    const home = await layout(page, width, 900);
    const header = await page.locator(".site-header").boundingBox();
    expect(home.character?.top ?? 0, `${width} px`).toBeGreaterThanOrEqual(
      (header?.y ?? 0) + (header?.height ?? 0) - 1,
    );
  }
});
