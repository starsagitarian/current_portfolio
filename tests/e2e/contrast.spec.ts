import { expect, test, type Page } from "@playwright/test";

/*
 * Every line of text, measured against what is really behind it: the painting, the glass and
 * any scrim, at every width. For each width the text is made invisible, the page is captured,
 * and each line's own box is read from the capture. Dark text is held to the darkest 5% of the
 * pixels behind it, light text to the brightest 5% (the rest of the 5% allows for the odd star
 * or lamp). WCAG AA: 4.5:1, or 3:1 for large text.
 */

interface TextBox {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rgb: [number, number, number];
  minimum: number;
}

/**
 * Hides the letters (at once: no colour transitions) but keeps everything around them, halos
 * included. The development server's own badge is not part of the site, so it goes too.
 */
const HIDE_TEXT = `*, *::before, *::after {
  color: transparent !important;
  text-decoration-color: transparent !important;
  caret-color: transparent !important;
  transition: none !important;
} svg { visibility: hidden !important; } nextjs-portal { display: none !important; }`;

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

/** Runs in the page: every visible line of text, its box and its colour. */
function collectText(): TextBox[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rgb = (css: string): [number, number, number] => {
    if (ctx === null) return [0, 0, 0];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };

  const boxes: TextBox[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? "";
    const parent = node.parentElement;
    if (text === "" || parent?.closest("script, style, noscript") !== null) continue;
    // folded away in a closed <details> (all but its summary): not on screen
    const folded = parent.closest("details:not([open])");
    if (folded !== null && parent.closest("summary") === null) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    // not on screen, or kept for screen readers only (clipped down to nothing)
    if (rect.width * rect.height < 16) continue;
    let clipped = false;
    for (let el: Element | null = parent; el !== null && !clipped; el = el.parentElement) {
      clipped = getComputedStyle(el).clipPath.startsWith("inset(50%");
    }
    if (clipped) continue;
    const x = Math.max(0, Math.floor(rect.left));
    const y = Math.max(0, Math.floor(rect.top));
    const w = Math.min(innerWidth, Math.ceil(rect.right)) - x;
    const h = Math.min(innerHeight, Math.ceil(rect.bottom)) - y;
    if (w < 2 || h < 2) continue;
    // covered by something else (behind an open menu, say): not seen, so not measured
    const hit = document.elementFromPoint(x + w / 2, y + h / 2);
    if (hit !== null && !parent.contains(hit) && !hit.contains(parent)) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    boxes.push({
      label: text.slice(0, 28),
      x,
      y,
      w,
      h,
      rgb: rgb(style.color),
      minimum: large ? 3 : 4.5,
    });
  }
  return boxes;
}

/** Runs in the page: reads each box from the capture and returns the lines that fall short. */
async function judge({ png, boxes }: { png: string; boxes: TextBox[] }): Promise<string[]> {
  const image = new Image();
  image.src = `data:image/png;base64,${png}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) return ["no canvas"];
  ctx.drawImage(image, 0, 0);

  const linear = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (r: number, g: number, b: number) =>
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  const problems: string[] = [];
  for (const box of boxes) {
    const { data } = ctx.getImageData(box.x, box.y, box.w, box.h);
    const values: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      values.push(luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0));
    }
    values.sort((a, b) => a - b);
    const text = luminance(...box.rgb);
    const median = values[Math.floor(values.length / 2)] ?? 0;
    // dark text: the darkest pixels behind it are the hardest case; light text: the brightest
    const worst =
      text < median
        ? (values[Math.floor(values.length * 0.05)] ?? 0)
        : (values[Math.floor(values.length * 0.95)] ?? 1);
    const ratio = (Math.max(text, worst) + 0.05) / (Math.min(text, worst) + 0.05);
    if (ratio < box.minimum) {
      problems.push(`"${box.label}" ${ratio.toFixed(2)}:1 (needs ${box.minimum})`);
    }
  }
  return problems;
}

async function measure(page: Page): Promise<string[]> {
  // A new width can bring a different painting: wait for it (and the fonts) before reading the
  // pixels, or the text would be judged against a background that is still arriving.
  await page.waitForFunction(
    () =>
      document.fonts.status === "loaded" &&
      [...document.querySelectorAll<HTMLImageElement>(".plate img")].every((img) => img.complete),
  );
  await nextFrame(page);
  const boxes = await page.evaluate(collectText);
  const hide = await page.addStyleTag({ content: HIDE_TEXT });
  await nextFrame(page);
  const png = (await page.screenshot({ animations: "disabled", caret: "hide" })).toString("base64");
  await hide.evaluate((el) => {
    (el as Element).remove();
  });
  return page.evaluate(judge, { png, boxes });
}

test.describe("text contrast against the real painting", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "sets each width itself");
    test.setTimeout(240_000);
  });

  test("home, at every 10 px from 320 to 1920 px", async ({ browser }) => {
    // Still: no loops or colour transitions, so each width can be read the moment it settles.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".character img")).toHaveJSProperty("complete", true);

    const failures: string[] = [];
    for (let width = 320; width <= 1920; width += 10) {
      await page.setViewportSize({ width, height: 900 });
      failures.push(...(await measure(page)).map((problem) => `${width} px: ${problem}`));
    }
    await context.close();
    expect(failures, failures.slice(0, 12).join("\n")).toEqual([]);
  });

  // One test per page, so they run side by side and each stays well inside its time limit.
  for (const path of [
    "/resume",
    "/projects",
    "/projects?tag=data",
    "/projects/book-content-pipelines",
    "/projects/lightning-observation",
    "/contact",
    "/contact/sent",
    "/contact/not-sent/busy",
  ]) {
    test(`${path}, at every 40 px`, async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(path);
      const failures: string[] = [];
      for (let width = 320; width <= 1920; width += 40) {
        await page.setViewportSize({ width, height: 900 });
        failures.push(...(await measure(page)).map((p) => `${path} ${width} px: ${p}`));
      }
      await context.close();
      expect(failures, failures.slice(0, 12).join("\n")).toEqual([]);
    });
  }

  test("the résumé, top to bottom, at nine widths", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const failures: string[] = [];
    for (const width of [320, 375, 600, 768, 820, 1024, 1200, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/resume");
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 640) {
        await page.evaluate((top) => {
          window.scrollTo(0, top);
        }, y);
        failures.push(...(await measure(page)).map((p) => `résumé ${width} px at ${y}: ${p}`));
      }
    }
    await context.close();
    expect(failures, failures.slice(0, 12).join("\n")).toEqual([]);
  });

  test("the projects, top to bottom, at six widths", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const failures: string[] = [];
    for (const path of ["/projects", "/projects/portfolio-platform"]) {
      for (const width of [320, 390, 768, 1024, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 640) {
          await page.evaluate((top) => {
            window.scrollTo(0, top);
          }, y);
          failures.push(...(await measure(page)).map((p) => `${path} ${width} px at ${y}: ${p}`));
        }
      }
    }
    await context.close();
    expect(failures, failures.slice(0, 12).join("\n")).toEqual([]);
  });

  test("the contact form's errors and thank-you, at six widths", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    // stand-ins for Cloudflare's widget and the API, so nothing is sent
    await page.route("https://challenges.cloudflare.com/**", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile={render(e,o){setTimeout(()=>o.callback('t'),20);return 'w'},reset(){},remove(){}}",
      }),
    );
    await page.route("**/v1/contact", (route) =>
      route.fulfill({ status: 202, json: { status: "received" } }),
    );
    const failures: string[] = [];
    for (const width of [320, 390, 768, 1024, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contact");
      await expect(page.locator("form.contact-form")).toHaveAttribute("novalidate", "");
      await page.getByRole("button", { name: "Send message" }).click();
      await page.getByRole("main").getByLabel("Email", { exact: true }).fill("not-an-email");
      await page.locator("form.contact-form").evaluate((form) => {
        form.scrollIntoView({ block: "center" });
      });
      failures.push(...(await measure(page)).map((p) => `errors ${width} px: ${p}`));

      await page.getByRole("main").getByLabel("Name", { exact: true }).fill("Ada");
      await page.getByRole("main").getByLabel("Email", { exact: true }).fill("ada@example.com");
      await page.getByRole("main").getByLabel("Message", { exact: true }).fill("Hello");
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page.getByRole("heading", { name: "Thank you, Ada." })).toBeVisible();
      failures.push(...(await measure(page)).map((p) => `sent ${width} px: ${p}`));
    }
    await context.close();
    expect(failures, failures.slice(0, 12).join("\n")).toEqual([]);
  });

  test("the menu, at phone and tablet widths", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const failures: string[] = [];
    for (const width of [320, 375, 430, 600, 768, 820, 1024]) {
      await page.setViewportSize({ width, height: 860 });
      await page.goto("/projects");
      // the button only works once the page has hydrated
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
      failures.push(...(await measure(page)).map((p) => `menu ${width} px: ${p}`));
    }
    await context.close();
    expect(failures, failures.slice(0, 12).join("\n")).toEqual([]);
  });
});
