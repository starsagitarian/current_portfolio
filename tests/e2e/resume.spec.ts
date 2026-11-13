import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ProfileSchema } from "@starsagitarian/shared";

/*
 * The résumé: the agreed CV content (the API's, which matches the seed copy bundled with the
 * site), a CV that downloads as a PDF, and every section reachable by heading.
 */

const profile = ProfileSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "../../apps/web/src/content/profile.snapshot.json"),
      "utf8",
    ),
  ),
);

test("shows the agreed CV content", async ({ page }) => {
  await page.goto("/resume");
  const main = page.getByRole("main");

  await expect(main.getByRole("heading", { level: 1, name: "Résumé" })).toBeVisible();
  for (const name of ["About me", "Experience", "Skills", "Certifications", "Education"]) {
    await expect(main.getByRole("heading", { level: 2, name })).toBeAttached();
  }
  await expect(main.getByText(profile.summary)).toBeAttached();

  for (const job of profile.experience) {
    await expect(main.getByRole("heading", { level: 3, name: job.role, exact: true })).toHaveCount(
      1,
    );
    for (const highlight of job.highlights) {
      await expect(main.getByText(highlight, { exact: true })).toBeAttached();
    }
  }
  for (const skill of profile.skills.flatMap((group) => group.skills)) {
    await expect(main.locator(".chip", { hasText: skill }).first()).toBeAttached();
  }
  for (const cert of profile.certifications) {
    await expect(main.getByText(cert.name, { exact: true })).toBeAttached();
  }
  // the newest role first, with its dates
  await expect(page.locator(".timeline-entry").first()).toContainText("Feb 2026 – Sep 2026");
});

test("downloads the CV as a PDF from the site's own address", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one download covers it");
  await page.goto("/resume");
  const link = page.getByRole("link", { name: "Download CV" });
  await expect(link).toHaveAttribute("href", "/resume/cv.pdf");

  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  expect(download.suggestedFilename()).toBe("baiju-joseph-cv.pdf");
  const file = await download.path();
  expect(readFileSync(file).subarray(0, 5).toString()).toBe("%PDF-");
});

test("keeps the page in one column on phones, two on desktops", async ({ page }, info) => {
  await page.goto("/resume");
  const [main, side] = [page.locator(".resume-main"), page.locator(".resume-side")];
  const [a, b] = [await main.boundingBox(), await side.boundingBox()];
  if (a === null || b === null) throw new Error("columns missing");
  if (info.project.name === "desktop") {
    expect(b.x).toBeGreaterThan(a.x + a.width);
  } else {
    expect(b.y).toBeGreaterThan(a.y + a.height - 1);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
