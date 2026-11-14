import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { ProjectDetailSchema, site } from "@starsagitarian/shared";

/*
 * Search and sharing: every page has its own title, description and canonical address, a link
 * preview (an image small enough for WhatsApp, 1200 × 630 like LinkedIn wants), structured data
 * a search engine can read, and a place in the sitemap. The working pages stay out of search.
 */

const projects = ProjectDetailSchema.array().parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "../../apps/web/src/content/projects.snapshot.json"),
      "utf8",
    ),
  ),
);
const project = projects.find((p) => p.slug === "lightning-observation") ?? projects[0];

const PAGES = [
  { path: "/", title: "Baiju Joseph · Software & Cloud Engineer", schema: "WebSite" },
  { path: "/resume", title: "Résumé · Baiju Joseph", schema: "ProfilePage" },
  { path: "/projects", title: "Projects · Baiju Joseph", schema: "CollectionPage" },
  {
    path: `/projects/${project?.slug}`,
    title: `${project?.title} · Baiju Joseph`,
    schema: "CreativeWork",
  },
  { path: "/contact", title: "Contact · Baiju Joseph", schema: undefined },
  { path: "/credits", title: "Credits · Baiju Joseph", schema: undefined },
];

const meta = (page: Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute("content");

/** JPEG dimensions, from its start-of-frame marker. */
function jpegSize(bytes: Buffer): [number, number] {
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1] ?? 0;
    const length = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2)
      return [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)];
    i += 2 + length;
  }
  return [0, 0];
}

/** The preview image, fetched from this server whatever host its address names. */
async function previewImage(request: APIRequestContext, address: string) {
  const url = new URL(address);
  return request.get(`${url.pathname}${url.search}`);
}

test.describe("each page", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "one browser covers it");
  });

  for (const { path: pagePath, title, schema } of PAGES) {
    test(`${pagePath} has its title, description, canonical address and link preview`, async ({
      page,
      request,
    }) => {
      await page.goto(pagePath);
      await expect(page).toHaveTitle(title);
      const description = await meta(page, "description");
      expect(description?.length ?? 0).toBeGreaterThan(40);

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        pagePath === "/" ? site.url : `${site.url}${pagePath}`,
      );
      expect(await meta(page, "og:title")).toBe(title);
      expect(await meta(page, "og:description")).toBe(description);
      expect(await meta(page, "og:site_name")).toBe(site.name);
      expect(await meta(page, "og:locale")).toBe("en_GB");
      expect(await meta(page, "twitter:card")).toBe("summary_large_image");
      expect(await meta(page, "og:image:width")).toBe("1200");
      expect(await meta(page, "og:image:height")).toBe("630");
      expect((await meta(page, "og:image:alt"))?.length ?? 0).toBeGreaterThan(5);

      const image = await previewImage(request, (await meta(page, "og:image")) ?? "");
      expect(image.status()).toBe(200);
      expect(image.headers()["content-type"]).toBe("image/jpeg");
      const bytes = await image.body();
      // WhatsApp shows no picture for a preview image much over 300 KB
      expect(bytes.length).toBeLessThan(300 * 1024);
      expect(jpegSize(bytes)).toEqual([1200, 630]);

      if (schema !== undefined) {
        const blocks = await page
          .locator('script[type="application/ld+json"]')
          .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent) as unknown));
        const types = JSON.stringify(blocks);
        expect(types).toContain(`"@type":"${schema}"`);
        expect(types).toContain('"@context":"https://schema.org"');
      }
    });
  }
});

test("lists every page and project in the sitemap", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  const res = await request.get("/sitemap.xml");
  expect(res.ok()).toBe(true);
  const xml = await res.text();
  for (const pagePath of ["/", "/resume", "/projects", "/contact", "/credits"]) {
    expect(xml).toContain(`<loc>${site.url}${pagePath}</loc>`);
  }
  for (const p of projects) expect(xml).toContain(`<loc>${site.url}/projects/${p.slug}</loc>`);
  expect(xml).not.toContain("/prototype");
});

test("keeps the working pages out of search", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${site.url}/sitemap.xml`);
  for (const pagePath of ["/prototype", "/offline", "/contact/sent", "/contact/not-sent/"]) {
    expect(robots).toContain(`Disallow: ${pagePath}`);
  }
  for (const pagePath of ["/offline", "/contact/sent", "/contact/not-sent/busy", "/prototype"]) {
    await page.goto(pagePath);
    expect(await meta(page, "robots"), pagePath).toMatch(/noindex/);
  }
});

test("credits every third-party asset, and is easy to find", async ({ page }, info) => {
  await page.goto("/resume");
  const touch = info.project.use.hasTouch === true;
  // (inside the page's main content, so a footer element rather than a page landmark)
  const footer = page.locator(".site-footer");
  const credits = footer.getByRole("link", { name: "Credits" });
  if (touch) await credits.tap();
  else await credits.click();
  await expect(page).toHaveURL("/credits");

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: "Credits" })).toBeVisible();
  for (const name of [
    "Lexend",
    "Lucide",
    "Simple Icons",
    "LinkedIn",
    "SIL Open Font License 1.1",
  ]) {
    await expect(main.getByText(name).first()).toBeAttached();
  }
  await expect(footer.getByRole("link", { name: "Source code" })).toHaveAttribute(
    "href",
    "https://github.com/starsagitarian/current_portfolio",
  );
});
