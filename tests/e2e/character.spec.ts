import { expect, test, type Page } from "@playwright/test";

/*
 * The character: animated on every layout, eyes locked to the artwork at every width, and eyes
 * that follow the pointer on a desktop only.
 */

const nextFrame = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );

/** The pupils' current offset in image pixels, from the first eye. */
const pupilOffset = (page: Page) =>
  page
    .locator(".character-pupil")
    .first()
    .evaluate((el) => {
      const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(
        (el as SVGElement).style.transform,
      );
      return { x: Number(match?.[1] ?? 0), y: Number(match?.[2] ?? 0) };
    });

async function choosePose(page: Page, pose: "Standing" | "Waving") {
  await page.getByRole("button", { name: pose }).click();
  await expect(page.locator(".character")).toHaveAttribute("data-pose", pose.toLowerCase());
  await expect(page.locator(".character img")).toHaveJSProperty("complete", true);
}

for (const pose of ["Standing", "Waving"] as const) {
  test(`${pose.toLowerCase()}: animates on this layout`, async ({ page }) => {
    await page.goto("/prototype");
    await choosePose(page, pose);

    const running = await page
      .locator(".character-body")
      .evaluate((el) =>
        el.getAnimations().map((a) => [(a as CSSAnimation).animationName, a.playState]),
      );
    expect(running).toContainEqual([
      pose === "Standing" ? "character-breathe" : "character-wave",
      "running",
    ]);
    await expect(page.locator(".character-eye")).toHaveCount(2);
  });
}

test("eyes stay on the artwork at every width from 320 to 1920 px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "resizes the window itself");
  await page.goto("/prototype");

  const failures: string[] = [];
  for (const pose of ["Standing", "Waving"] as const) {
    await choosePose(page, pose);
    for (let width = 320; width <= 1920; width += 40) {
      await page.setViewportSize({ width, height: 900 });
      await nextFrame(page);
      const fit = await page.evaluate(() => {
        const img = document.querySelector<HTMLImageElement>(".character img");
        const svg = document.querySelector<SVGSVGElement>(".character-eyes");
        if (img === null || svg === null) return null;
        const a = img.getBoundingClientRect();
        const b = svg.getBoundingClientRect();
        const box = svg.viewBox.baseVal;
        return {
          edges: Math.max(
            Math.abs(a.left - b.left),
            Math.abs(a.top - b.top),
            Math.abs(a.right - b.right),
            Math.abs(a.bottom - b.bottom),
          ),
          // The overlay draws in the image's own pixels, so the proportions must match. The
          // browser reports the natural size scaled to the chosen srcset entry, so allow for rounding.
          ratio: Math.abs(img.naturalWidth - (img.naturalHeight * box.width) / box.height),
        };
      });
      if (fit === null) failures.push(`${pose} ${width} px: character missing`);
      else if (fit.edges > 0.5 || fit.ratio > 1.5) {
        failures.push(
          `${pose} ${width} px: off by ${fit.edges.toFixed(2)} px, ratio ${fit.ratio.toFixed(2)}`,
        );
      }
    }
  }
  expect(failures).toEqual([]);
});

test("eyes follow the mouse on a desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a desktop pointer");
  await page.goto("/prototype");
  await choosePose(page, "Standing");
  const box = await page.locator(".character-eyes").boundingBox();
  if (box === null) throw new Error("no eyes");
  const eyeY = box.y + box.height * 0.12;

  await page.mouse.move(5, eyeY);
  await nextFrame(page);
  expect((await pupilOffset(page)).x).toBeLessThan(-4);

  // stay inside the window: leaving it hands the eyes back to their idle glances
  await page.mouse.move((page.viewportSize()?.width ?? 1440) - 5, eyeY);
  await nextFrame(page);
  expect((await pupilOffset(page)).x).toBeGreaterThan(4);

  await page.mouse.move(box.x + box.width / 2, 2);
  await nextFrame(page);
  expect((await pupilOffset(page)).y).toBeLessThan(-1);
});

test("eyes do not chase a touch screen or visitors who prefer less motion", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one run covers both cases");

  for (const options of [
    { hasTouch: true, isMobile: true, viewport: { width: 412, height: 900 } },
    { reducedMotion: "reduce" as const, viewport: { width: 1440, height: 900 } },
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto("/prototype");
    await expect(page.locator(".character img")).toHaveJSProperty("complete", true);
    await page.mouse.move(5, 300);
    await nextFrame(page);
    await page.mouse.move(1400, 300);
    await nextFrame(page);
    expect(await pupilOffset(page)).toEqual({ x: 0, y: 0 });
    await context.close();
  }
});
