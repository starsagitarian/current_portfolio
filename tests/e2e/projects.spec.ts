import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ProjectDetailSchema } from "@starsagitarian/shared";

/*
 * Projects: a tile for each one, a filter that lives in the address (so it survives a refresh,
 * a shared link and the back button) without a trip to the server, a page for each project,
 * and the drawing that travels from the tile to the top of that page.
 */

const projects = ProjectDetailSchema.array().parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "../../apps/web/src/content/projects.snapshot.json"),
      "utf8",
    ),
  ),
);
const tagged = (tag: string) =>
  projects.filter((project) => project.tags.some((t) => t.slug === tag)).map((p) => p.title);

// The development server's floating button can sit over the content; it is not part of the site.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
});

const tileTitles = (page: Page) =>
  page.locator(".project-filter ~ .project-grid .tile-title").allTextContents();

const filter = (page: Page) => page.getByRole("navigation", { name: "Filter projects" });

async function choose(page: Page, name: string, touch: boolean) {
  const chip = filter(page).getByRole("link", { name: new RegExp(`^${name}\\b`) });
  if (touch) await chip.tap();
  else await chip.click();
  await expect(chip).toHaveAttribute("aria-current", "true");
}

test("lists every project, each tile leading to its own page", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect.poll(() => tileTitles(page)).toEqual(projects.map((p) => p.title));

  for (const project of projects) {
    await expect(
      page.getByRole("link", { name: project.title, exact: true }).first(),
    ).toHaveAttribute("href", `/projects/${project.slug}`);
  }
  await expect(page.locator(".project-filter ~ .project-grid .tile-badge")).toHaveCount(
    projects.filter((p) => p.featured).length,
  );
});

test("filters by tag in the address, through refresh, back and forward", async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  await page.goto("/projects");
  await expect(filter(page).getByRole("link", { name: /^All/ })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await choose(page, "Cloud", touch);
  await expect(page).toHaveURL("/projects?tag=cloud");
  await expect.poll(() => tileTitles(page)).toEqual(tagged("cloud"));
  await expect(page.getByRole("status")).toHaveText(
    `Showing ${tagged("cloud").length} cloud projects`,
  );

  await choose(page, "Data", touch);
  await expect(page).toHaveURL("/projects?tag=data");
  await expect.poll(() => tileTitles(page)).toEqual(tagged("data"));

  // a refresh keeps the filter, and so does the HTML itself, before any script runs
  await page.reload();
  await expect.poll(() => tileTitles(page)).toEqual(tagged("data"));

  await page.goBack();
  await expect(page).toHaveURL("/projects?tag=cloud");
  await expect.poll(() => tileTitles(page)).toEqual(tagged("cloud"));
  await expect(filter(page).getByRole("link", { name: /^Cloud/ })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.goBack();
  await expect(page).toHaveURL("/projects");
  await expect.poll(() => tileTitles(page)).toEqual(projects.map((p) => p.title));

  await page.goForward();
  await expect(page).toHaveURL("/projects?tag=cloud");
  await expect.poll(() => tileTitles(page)).toEqual(tagged("cloud"));
});

test("filters without asking the server again", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  await page.goto("/projects");
  await expect(filter(page)).toBeVisible();

  const requests: string[] = [];
  page.on("request", (request) => {
    // the list's own address (prefetches of the project pages it links to are expected)
    if (new URL(request.url()).pathname === "/projects") requests.push(request.url());
  });
  await choose(page, "Web", false);
  await expect.poll(() => tileTitles(page)).toEqual(tagged("web"));
  await choose(page, "All", false);
  await expect.poll(() => tileTitles(page)).toEqual(projects.map((p) => p.title));
  expect(requests).toEqual([]);
});

test("a shared filtered link opens filtered, and an unknown tag shows everything", async ({
  page,
}) => {
  await page.goto("/projects?tag=web");
  await expect.poll(() => tileTitles(page)).toEqual(tagged("web"));
  await expect(filter(page).getByRole("link", { name: /^Web/ })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.goto("/projects?tag=gardening");
  await expect.poll(() => tileTitles(page)).toEqual(projects.map((p) => p.title));
});

test("without JavaScript, every project is still listed and linked", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/projects");
  for (const project of projects) {
    await expect(page.getByRole("link", { name: project.title, exact: true })).toBeVisible();
  }
  await page.goto("/projects/remedic");
  await expect(page.getByRole("heading", { level: 1, name: projects[6]?.title })).toBeVisible();
  await context.close();
});

test("each project has a page of its own", async ({ page }) => {
  for (const project of projects) {
    await page.goto(`/projects/${project.slug}`);
    const main = page.getByRole("main");
    await expect(page).toHaveTitle(`${project.title} · Baiju Joseph`);
    await expect(main.getByRole("heading", { level: 1, name: project.title })).toBeVisible();
    await expect(main.getByText(project.summary, { exact: true })).toBeVisible();
    for (const paragraph of project.body.split(/\n\s*\n/)) {
      await expect(main.getByText(paragraph, { exact: true })).toBeAttached();
    }
    for (const name of project.technologies) {
      await expect(main.locator(".chip", { hasText: name }).first()).toBeAttached();
    }
    if (project.repoUrl !== null) {
      await expect(main.getByRole("link", { name: /View the code/ })).toHaveAttribute(
        "href",
        project.repoUrl,
      );
    }
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      project.summary,
    );
  }
});

test("moves between projects, and back to the list", async ({ page }, info) => {
  const touch = info.project.use.hasTouch === true;
  const press = async (name: RegExp | string) => {
    const link = page.getByRole("main").getByRole("link", { name });
    if (touch) await link.tap();
    else await link.click();
  };
  await page.goto(`/projects/${projects[0]?.slug}`);
  await press(new RegExp(`Next ${projects[1]?.title}`));
  await expect(page).toHaveURL(`/projects/${projects[1]?.slug}`);
  await press(new RegExp(`Previous ${projects[0]?.title}`));
  await expect(page).toHaveURL(`/projects/${projects[0]?.slug}`);
  // the first project's previous is the last
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: new RegExp(`Previous ${projects.at(-1)?.title}`) }),
  ).toBeVisible();

  // a tag opens the list filtered to it
  await press(projects[0]?.tags[0]?.label ?? "");
  await expect(page).toHaveURL(`/projects?tag=${projects[0]?.tags[0]?.slug}`);
  await expect.poll(() => tileTitles(page)).toEqual(tagged(projects[0]?.tags[0]?.slug ?? ""));

  await page.goto(`/projects/${projects[0]?.slug}`);
  await press("All projects");
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  // the section stays marked as current throughout
  await expect(
    page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Projects" }),
  ).toHaveAttribute("aria-current", "page");
});

// A slug nobody has asked for yet streams its page shell before the lookup says "no such
// project", so that first answer keeps a 200 (Next.js documents this) and is marked noindex;
// once known, it is a 404. Either way the visitor sees the not-found page.
test("shows a way back for a project that does not exist, kept out of search", async ({ page }) => {
  const res = await page.goto("/projects/no-such-project");
  expect([200, 404]).toContain(res?.status());
  await expect(page.getByRole("heading", { level: 1, name: "Project not found" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "All projects" })).toBeVisible();
  // (a cached 404 can carry the tag twice, once from the server and once from the client)
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content")));
  expect(robots.length).toBeGreaterThan(0);
  for (const content of robots) expect(content).toMatch(/noindex/);
});

test("the drawing travels from the tile to the project's page", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one browser covers it");
  // Record each view transition and the names taking part in it.
  await page.addInitScript(() => {
    const seen: string[][] = [];
    Object.assign(window, { transitionsSeen: seen });
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
      const transition = start(update);
      void transition.ready.then(() => {
        seen.push(
          [...document.getAnimations()]
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? "")
            .filter((pseudo) => pseudo.startsWith("::view-transition-group(")),
        );
      });
      return transition;
    }) as typeof document.startViewTransition;
  });
  await page.goto("/projects");
  await expect(filter(page)).toBeVisible();
  const slug = "lightning-observation";
  // wait for the page's own links to be prefetched, so the new page arrives in one go
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Lightning observation", exact: true }).first().click();
  await expect(page).toHaveURL(`/projects/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lightning observation");

  const seen = await page.evaluate(
    () => (window as unknown as { transitionsSeen: string[][] }).transitionsSeen,
  );
  expect(seen.flat()).toContain(`::view-transition-group(project-art-${slug})`);
});

// The résumé shares the layout, so it gets the figure too; both pages are checked here.
const WITH_FIGURE = [
  { path: "/projects", content: ".project-filter ~ .project-grid" },
  { path: "/resume", content: ".resume-grid" },
];

for (const { path: pagePath, content } of WITH_FIGURE) {
  test(`on wide screens only, Baiju stands beside the content of ${pagePath}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "sets each width itself");
    const figure = page.locator(".page-figure .character");
    const art: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/art/character-standing")) art.push(request.url());
    });

    // phones, tablets and ordinary desktops: not drawn, and the artwork is not even downloaded
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pagePath);
      await expect(page.locator(content)).toBeVisible();
      await expect(figure).toHaveCount(0);
    }
    expect(art).toEqual([]);

    for (const [width, height] of [
      [1600, 900],
      [1920, 1080],
      [2560, 1300],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(pagePath);
      await expect(page.locator(content)).toBeVisible();
      await expect(figure).toBeVisible();
      const area = await page.locator(content).boundingBox();
      const box = await figure.boundingBox();
      expect(area && box && box.x - (area.x + area.width), `${width} px`).toBeGreaterThan(16);
      expect(box && box.x + box.width, `${width} px`).toBeLessThan(width);
    }
  });
}
