import { expect, test } from "@playwright/test";

/*
 * Visual baselines: each main page at phone, tablet and desktop size, compared with a reference
 * picture, so a change nobody meant to make fails the build. Still (no motion), with the bot
 * check stood in for and the character's eyes masked.
 *
 * Fonts render differently on each operating system, so the references are Linux pictures, made
 * the way CI runs: `npm run test:visual:update` (Playwright's own Linux container).
 */

const PAGES = [
  { name: "home", path: "/" },
  { name: "resume", path: "/resume" },
  { name: "projects", path: "/projects" },
  { name: "project", path: "/projects/lightning-observation" },
  { name: "contact", path: "/contact" },
];

test.use({ reducedMotion: "reduce" });

for (const { name, path } of PAGES) {
  test(`${name} looks as it should`, async ({ page }, info) => {
    test.skip(process.platform !== "linux", "the references are Linux pictures");
    test.skip(!["mobile", "tablet", "desktop"].includes(info.project.name), "three sizes");
    await page.route("https://challenges.cloudflare.com/**", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile={render(){return 'w'},reset(){},remove(){}}",
      }),
    );
    await page.goto(path);
    await page.waitForFunction(
      () =>
        document.fonts.status === "loaded" &&
        [...document.querySelectorAll<HTMLImageElement>("img")].every((img) => img.complete),
    );
    await expect(page).toHaveScreenshot(`${name}.png`, {
      animations: "disabled",
      caret: "hide",
      // just the eyes: they blink and glance on their own timers
      mask: [page.locator(".character-eye")],
      maxDiffPixelRatio: 0.01,
    });
  });
}
