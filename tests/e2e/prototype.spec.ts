import { expect, test } from "@playwright/test";

// Art prototype: the painted scene, the character and the light that follows the window width.
test("art prototype shows the scene, the character and the right light for the width", async ({
  page,
}) => {
  await page.goto("/prototype");

  await expect(page.locator(".plates")).toBeVisible();
  // only the layers this width can show are downloaded; the rest stay a blank pixel
  const loaded = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>(".plate img")].map((img) => ({
      layer: img.closest("picture")?.className ?? "",
      src: img.currentSrc,
      ok: img.complete,
    })),
  );
  const real = loaded.filter((l) => l.src.includes("/art/scene/"));
  expect(real.length).toBeGreaterThan(0);
  expect(real.length).toBeLessThanOrEqual(2);
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
  // wait for the page to come alive (the panel reports the real width once it has)
  await expect(page.locator(".sky-panel-meta")).toHaveText(/^[1-9]\d* px/);
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
