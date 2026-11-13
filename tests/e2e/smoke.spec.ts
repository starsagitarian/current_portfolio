import { expect, test } from "@playwright/test";

test("home page introduces Baiju and links his profiles", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Baiju Joseph/);
  // on phones and tablets the introduction is for screen readers; it is always in the page
  await expect(page.getByRole("heading", { level: 1, name: "Hi, I’m Baiju." })).toBeAttached();
  await expect(page.getByRole("main").getByText("Software & Cloud Engineer.")).toBeAttached();

  // the profiles: in the introduction on desktops, in the menu on phones and tablets
  await expect(page.locator('a[href="https://github.com/starsagitarian"]').first()).toBeAttached();
  await expect(page.locator('a[href^="https://www.linkedin.com/in/"]').first()).toBeAttached();
});

for (const path of ["/", "/resume", "/projects", "/contact"]) {
  test(`${path} never scrolls sideways`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    // and the tab bar, where there is one, is on screen
    const bar = page.locator(".tab-bar").filter({ visible: true });
    if ((await bar.count()) > 0) await expect(bar).toBeInViewport({ ratio: 1 });
  });
}
