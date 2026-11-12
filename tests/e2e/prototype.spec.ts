import { expect, test } from "@playwright/test";

// SP-6 art prototype: the scene, the character and the light that follows the window width.
test("art prototype shows the scene, the character and the right light for the width", async ({
  page,
}) => {
  await page.goto("/prototype");

  await expect(page.locator("svg.london-scene")).toBeVisible();
  await expect(page.locator(".character img")).toBeVisible();
  await expect(page.locator(".character-eyes")).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;
  const sky = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue("--sky")),
  );
  if (width <= 560) expect(sky).toBe(0);
  else if (width >= 1280) expect(sky).toBe(2);
  else expect(sky).toBeGreaterThan(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("the light slider previews any light", async ({ page }) => {
  await page.goto("/prototype");
  await page.getByRole("slider", { name: /light/i }).fill("1");
  await expect(page.getByText("Dusk", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(getComputedStyle(document.documentElement).getPropertyValue("--sky")),
      ),
    )
    .toBe(1);
});
