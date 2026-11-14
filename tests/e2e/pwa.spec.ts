import { expect, test } from "@playwright/test";

/*
 * Add to Home Screen: a manifest and icons that let the site be installed and open on its own,
 * a service worker that opens visited pages offline (and an offline page for the rest), and a
 * hint for Safari, which has no install prompt of its own.
 */

/** Width and height from a PNG's header. */
const pngSize = (bytes: Buffer) => [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];

test("has a manifest that installs the site, with its icons", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).not.toBeNull();

  const res = await request.get(href ?? "");
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as {
    name: string;
    short_name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({
    short_name: "Baiju Joseph",
    start_url: "/",
    display: "standalone",
  });
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
    "192x192 any",
    "512x512 any",
    "512x512 maskable",
  ]);
  for (const icon of manifest.icons) {
    const file = await request.get(icon.src);
    expect(file.headers()["content-type"], icon.src).toBe("image/png");
    expect(pngSize(await file.body()), icon.src).toEqual(icon.sizes.split("x").map(Number));
  }

  // on an iPhone: its own icon, its own name, and full-screen under the status bar
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "Baiju Joseph",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
    "content",
    "black-translucent",
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
});

test("serves the service worker fresh, and only as script", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  const res = await request.get("/sw.js");
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-type"]).toContain("javascript");
  expect(res.headers()["cache-control"]).toContain("no-cache");
});

test.describe("offline", () => {
  test.use({ serviceWorkers: "allow" });

  test("opens visited pages without a connection, and says so for the rest", async ({
    page,
    context,
  }, info) => {
    test.skip(!process.env.E2E_BASE_URL, "the service worker runs in production builds only");
    test.skip(info.project.name !== "mobile", "one browser covers it");

    await page.goto("/");
    // wait until the worker is in charge of this page
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller === null) {
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        });
      }
    });
    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

    await context.setOffline(true);
    try {
      await page.goto("/projects");
      await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

      await page.goto("/resume");
      await expect(page.getByRole("heading", { level: 1, name: "You’re offline" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
      // still the site: its header and tab bar, styled
      await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});

test.describe("the Home Screen hint", () => {
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

  test("shows Safari visitors how, from their second page, until dismissed", async ({
    browser,
  }, info) => {
    test.skip(info.project.name !== "mobile", "a phone");
    const context = await browser.newContext({
      userAgent: IPHONE,
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const hint = page.getByRole("complementary", { name: "Add to Home Screen" });

    await page.goto("/");
    await page.waitForTimeout(1800);
    await expect(hint).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: "Projects" })
      .tap();
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Add to Home Screen");
    await expect(hint.getByRole("img", { name: "Share" })).toBeVisible();
    // it sits above the tab bar, not over it
    const bar = await page.locator(".tab-bar").boundingBox();
    const card = await hint.boundingBox();
    expect(card && bar && card.y + card.height).toBeLessThanOrEqual(bar?.y ?? 0);

    await hint.getByRole("button", { name: "Dismiss" }).tap();
    await expect(hint).toHaveCount(0);
    await page.goto("/resume");
    await page.waitForTimeout(1800);
    await expect(hint).toHaveCount(0);
    await context.close();
  });

  test("stays away on a desktop", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop");
    await page.goto("/");
    await page.goto("/projects");
    await page.waitForTimeout(1800);
    await expect(page.getByRole("complementary", { name: "Add to Home Screen" })).toHaveCount(0);
  });
});
