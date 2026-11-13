import { expect, test } from "@playwright/test";

test("home page introduces Baiju and links his profiles", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Baiju Joseph/);
  await expect(page.getByRole("heading", { level: 1, name: "Baiju Joseph" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Software & Cloud Engineer")).toBeVisible();

  const profiles = page.getByRole("navigation", { name: "Profiles" });
  await expect(profiles.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/starsagitarian",
  );
  await expect(profiles.getByRole("link", { name: "LinkedIn" })).toBeVisible();
});

test("page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
