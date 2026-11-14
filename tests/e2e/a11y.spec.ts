import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * An accessibility audit of every page and state with axe-core, against WCAG 2.2 A and AA (and
 * best practices), at phone, tablet and desktop widths. Colour contrast is left to
 * contrast.spec.ts, which measures each line against the real painting behind it; axe cannot
 * see through the glass to the pixels.
 */

const PAGES = [
  "/",
  "/resume",
  "/projects",
  "/projects?tag=cloud",
  "/projects/lightning-observation",
  "/contact",
  "/contact/sent",
  "/contact/not-sent/busy",
  "/credits",
  "/offline",
];

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .disableRules(["color-contrast"])
    .exclude("nextjs-portal")
    .analyze();
  return results.violations.map(
    (v) =>
      `${v.id} (${v.impact ?? "?"}): ${v.help} — ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(", ")}`,
  );
}

for (const path of PAGES) {
  test(`${path} passes the accessibility audit`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    expect(await audit(page)).toEqual([]);
  });
}

test("the menu, open, passes the accessibility audit", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "phones and tablets");
  await page.goto("/projects");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  expect(await audit(page)).toEqual([]);
});

test("the contact form, with its errors showing, passes the accessibility audit", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.turnstile={render(e,o){setTimeout(()=>o.callback('t'),20);return 'w'},reset(){},remove(){}}",
    }),
  );
  await page.goto("/contact");
  await expect(page.locator("form.contact-form")).toHaveAttribute("novalidate", "");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("main").getByLabel("Name", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await audit(page)).toEqual([]);
});
