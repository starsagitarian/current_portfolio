import { expect, test, type Page } from "@playwright/test";

/*
 * The layout shell: every section reachable by mouse, touch and keyboard, the current one marked
 * (aria-current and a gold pill), a working skip link and menu, and the site icons.
 */

const SECTIONS = [
  { name: "Résumé", path: "/resume" },
  { name: "Projects", path: "/projects" },
  { name: "Contact", path: "/contact" },
];

/** The accent gold, #e7a83b, as the browser reports it. */
const GOLD = "rgb(231, 168, 59)";

async function expectCurrent(page: Page, nav: string, name: string) {
  // getByRole only finds the navigation that is showing (the header's or the tab bar's)
  const links = page.getByRole("navigation", { name: nav }).getByRole("link");
  await expect(links.filter({ hasText: name })).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("navigation", { name: nav }).locator('[aria-current="page"]'),
  ).toHaveCount(1);
  await expect(links.filter({ hasText: name })).toHaveCSS("background-color", GOLD);
}

test("every section is reachable by mouse from the desktop navigation", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the desktop navigation");
  await page.goto("/");

  for (const section of SECTIONS) {
    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: section.name })
      .click();
    await expect(page).toHaveURL(section.path);
    await expect(page.getByRole("heading", { level: 1, name: section.name })).toBeVisible();
    await expectCurrent(page, "Sections", section.name);
  }
  await page
    .getByRole("link", { name: /Baiju Joseph/ })
    .first()
    .click();
  await expect(page).toHaveURL("/");
});

test("every section is reachable from the tab bar on phones and tablets", async ({
  page,
}, info) => {
  test.skip(info.project.name === "desktop", "phones and tablets");
  // (home on a tablet shows a card per section instead of the tab bar; see home.spec.ts)
  await page.goto("/contact");
  const touch = info.project.use.hasTouch === true;

  for (const section of SECTIONS) {
    const tab = page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: section.name });
    if (touch) await tab.tap();
    else await tab.click();
    await expect(page).toHaveURL(section.path);
    await expect(page.getByRole("heading", { level: 1, name: section.name })).toBeVisible();
    await expectCurrent(page, "Sections", section.name);
  }
});

test("the menu opens, navigates and closes on phones and tablets", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "phones and tablets");
  await page.goto("/contact");
  const touch = info.project.use.hasTouch === true;
  const press = async (name: string) => {
    const target = page.getByRole("button", { name });
    if (touch) await target.tap();
    else await target.click();
  };

  await press("Open menu");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(menu.getByRole("link", { name: "Contact" })).toHaveAttribute("aria-current", "page");
  await expect(menu.locator(".character[data-pose='waving']")).toBeVisible();

  const home = menu.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Home" });
  if (touch) await home.tap();
  else await home.click();
  await expect(page).toHaveURL("/");
  await expect(menu).toBeHidden();

  await press("Open menu");
  await expect(menu).toBeVisible();
  await press("Close menu");
  await expect(menu).toBeHidden();
});

test.describe("by keyboard", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "drives the keyboard on two layouts");
  });

  test("the skip link comes first and jumps to the content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("reaches every section on a desktop", async ({ page }) => {
    await page.goto("/");
    for (const section of SECTIONS) {
      // skip link, then the name, then the sections in order
      await page.locator("body").focus();
      const link = page
        .getByRole("navigation", { name: "Sections" })
        .getByRole("link", { name: section.name });
      for (let i = 0; i < 8 && !(await link.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press("Tab");
      }
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(section.path);
      await expectCurrent(page, "Sections", section.name);
    }
  });

  test("opens and closes the menu on a phone, handing focus back", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const button = page.getByRole("button", { name: "Open menu" });
    await button.focus();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    // focus is inside the menu
    expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();

    // and a section is reachable from inside it
    await page.keyboard.press("Enter");
    await menu.getByRole("link", { name: "Projects" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/projects");
    await expect(menu).toBeHidden();
  });
});

test("serves the favicon and the home-screen icon", async ({ page, request }) => {
  await page.goto("/");
  for (const rel of ["icon", "apple-touch-icon"]) {
    const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
    expect(href, rel).not.toBeNull();
    const res = await request.get(href ?? "");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
});
