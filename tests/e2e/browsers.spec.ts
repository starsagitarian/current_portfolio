import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

/*
 * What every browser must get right, run in Chrome (desktop and an Android phone), Safari's
 * engine (desktop and an iPhone) and Firefox: each page renders its painting and content with no
 * script errors, the sections are reachable, the projects filter follows the address, and the
 * contact form checks its fields. The deeper tests run in Chrome; these catch engine differences.
 */

const PAGES = [
  { path: "/", heading: "Hi, I’m Baiju." },
  { path: "/resume", heading: "Résumé" },
  { path: "/projects", heading: "Projects" },
  { path: "/projects/lightning-observation", heading: "Lightning observation" },
  { path: "/contact", heading: "Let’s talk" },
  { path: "/credits", heading: "Credits" },
];

/** True when every painting layer that can be seen shows its image (see scene-resize.spec). */
const paintingShown = (page: Page) =>
  page.evaluate(() => {
    let seen = 0;
    for (const plate of [...document.querySelectorAll<HTMLElement>(".plate")].reverse()) {
      const opacity = Number(getComputedStyle(plate).opacity);
      if (opacity <= 0.05) continue;
      const img = plate.querySelector("img");
      if (img === null || !img.complete || img.naturalWidth <= 1) return false;
      seen += 1;
      if (opacity >= 0.999) break;
    }
    return seen > 0;
  });

/**
 * Presses a control as the device would: a tap on touch screens, a click otherwise. In WebKit,
 * Playwright's pre-click check misreads controls on frosted glass (backdrop-filter) as covered by
 * the page; the page's own hit test finds them, so there the check is skipped and the click,
 * still a real one at the control's position, goes to whatever WebKit finds under it.
 */
async function press(control: Locator, info: TestInfo) {
  if (info.project.use.hasTouch === true) await control.tap();
  else await control.click({ force: info.project.use.browserName === "webkit" });
}

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Service Worker")) {
      errors.push(message.text());
    }
  });
  return errors;
};

for (const { path, heading } of PAGES) {
  test(`${path} renders with its painting and no errors`, async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeAttached();
    await expect.poll(() => paintingShown(page), { timeout: 10_000 }).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    expect(errors).toEqual([]);
  });
}

test("every section is reachable from the navigation", async ({ page }, info) => {
  await page.goto("/credits");
  for (const [name, path] of [
    ["Résumé", "/resume"],
    ["Projects", "/projects"],
    ["Contact", "/contact"],
  ] as const) {
    await press(
      page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name }),
      info,
    );
    await expect(page).toHaveURL(path);
  }
});

test("the projects filter follows the address, and Back", async ({ page }, info) => {
  await page.goto("/projects");
  const chip = page.getByRole("navigation", { name: "Filter projects" }).getByRole("link", {
    name: /^Data/,
  });
  await press(chip, info);
  await expect(page).toHaveURL("/projects?tag=data");
  await expect(page.locator(".project-filter ~ .project-grid .project-tile")).toHaveCount(3);
  await page.goBack();
  await expect(page).toHaveURL("/projects");
  await expect(page.locator(".project-filter ~ .project-grid .project-tile")).toHaveCount(7);
});

test("the contact form checks its fields before sending", async ({ page }, info) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.turnstile={render(e,o){setTimeout(()=>o.callback('t'),20);return 'w'},reset(){},remove(){}}",
    }),
  );
  await page.goto("/contact");
  await expect(page.locator("form.contact-form")).toHaveAttribute("novalidate", "");
  await press(page.getByRole("button", { name: "Send message" }), info);
  await expect(page.getByRole("main").getByLabel("Name", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Please tell me your name.")).toBeVisible();
});
