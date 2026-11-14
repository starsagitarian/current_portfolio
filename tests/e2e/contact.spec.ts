import { expect, test, type Page, type Route } from "@playwright/test";

/*
 * The contact form, with JavaScript (checked as you type, sent without leaving the page) and
 * without (an ordinary form the API answers with a redirect). Cloudflare's widget and the API are
 * both stood in for here, so no message is stored or emailed; the API's own tests cover it.
 */

/** Stands in for Cloudflare Turnstile: hands over a fresh token shortly after each render/reset. */
const FAKE_TURNSTILE = `
  (() => {
    let n = 0, options;
    const issue = () => setTimeout(() => options.callback("test-token-" + ++n), 50);
    window.turnstile = {
      render(el, o) { options = o; issue(); return "widget"; },
      reset() { issue(); },
      remove() {},
    };
  })();`;

const PROBLEM = "application/problem+json";

async function setUp(page: Page, answer: (route: Route) => Promise<void>) {
  const sent: unknown[] = [];
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }),
  );
  await page.route("**/v1/contact", async (route) => {
    if (route.request().method() === "POST") sent.push(route.request().postDataJSON());
    await answer(route);
  });
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  await page.goto("/contact");
  // the form's own checks take over once React is running
  await expect(page.locator("form.contact-form")).toHaveAttribute("novalidate", "");
  return sent;
}

const field = (page: Page, name: string) =>
  page.getByRole("main").getByLabel(name, { exact: true });

async function fill(page: Page, values: { name?: string; email?: string; message?: string }) {
  if (values.name !== undefined) await field(page, "Name").fill(values.name);
  if (values.email !== undefined) await field(page, "Email").fill(values.email);
  if (values.message !== undefined) await field(page, "Message").fill(values.message);
}

const send = (page: Page) => page.getByRole("button", { name: "Send message" }).click();

test("sends a message and says thank you, without leaving the page", async ({ page }) => {
  const sent = await setUp(page, (route) =>
    route.fulfill({ status: 202, json: { status: "received" } }),
  );
  await fill(page, {
    name: "  Ada Lovelace ",
    email: " ada@example.com ",
    message: "Hello! Could we talk about a role?",
  });
  await send(page);

  const thanks = page.getByRole("heading", { level: 2, name: "Thank you, Ada." });
  await expect(thanks).toBeVisible();
  await expect(thanks).toBeFocused();
  await expect(page.getByText("ada@example.com")).toBeVisible();
  await expect(page).toHaveURL("/contact");
  expect(sent).toEqual([
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hello! Could we talk about a role?",
      turnstileToken: "test-token-1",
    },
  ]);

  // another message gets a fresh form and a fresh token
  await page.getByRole("button", { name: "Send another message" }).click();
  await expect(field(page, "Name")).toHaveValue("");
  await fill(page, { name: "Ada", email: "ada@example.com", message: "One more thing." });
  await send(page);
  await expect(page.getByRole("heading", { name: "Thank you, Ada." })).toBeVisible();
  expect((sent[1] as { turnstileToken: string }).turnstileToken).not.toBe("test-token-1");
});

test("checks each field before sending, and says what to fix", async ({ page }) => {
  const sent = await setUp(page, (route) => route.fulfill({ status: 202, json: {} }));

  await send(page);
  for (const name of ["Name", "Email", "Message"]) {
    await expect(field(page, name)).toHaveAttribute("aria-invalid", "true");
  }
  await expect(field(page, "Name")).toBeFocused();
  await expect(page.getByText("Please tell me your name.")).toBeVisible();

  await fill(page, { name: "Ada", email: "ada@example" });
  await field(page, "Message").focus();
  await expect(page.getByText("That email address doesn't look right.")).toBeVisible();
  await expect(field(page, "Email")).toHaveAccessibleDescription(/doesn't look right/);

  await fill(page, { email: "ada@example.com", message: "Hi" });
  await expect(field(page, "Email")).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("That email address doesn't look right.")).toBeHidden();
  expect(sent).toEqual([]);
});

test("explains a refusal and keeps what was written", async ({ page }) => {
  let answer = 429;
  await setUp(page, (route) =>
    answer === 0
      ? route.abort("connectionrefused")
      : route.fulfill(
          answer === 429
            ? {
                status: 429,
                contentType: PROBLEM,
                body: JSON.stringify({
                  type: "about:blank",
                  title: "Too Many Requests",
                  status: 429,
                  detail:
                    "You have sent several messages in the last hour. Please try again later.",
                }),
              }
            : {
                status: 400,
                contentType: PROBLEM,
                body: JSON.stringify({
                  type: "about:blank",
                  title: "Bad Request",
                  status: 400,
                  detail: "Invalid request body. email: Invalid email address.",
                }),
              },
        ),
  );
  await fill(page, { name: "Ada", email: "ada@example.com", message: "Hello" });

  await send(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "several messages in the last hour",
  );
  await expect(field(page, "Message")).toHaveValue("Hello");

  answer = 400;
  await send(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "fields to check are marked",
  );
  await expect(field(page, "Email")).toHaveAttribute("aria-invalid", "true");

  answer = 0;
  await fill(page, { email: "ada@example.org" });
  await send(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "couldn't reach the server",
  );
  await expect(field(page, "Name")).toHaveValue("Ada");
});

test("hides the honeypot from people and assistive technology", async ({ page }) => {
  await setUp(page, (route) => route.fulfill({ status: 202, json: {} }));
  const trap = page.locator('input[name="website"]');
  await expect(trap).toBeAttached();
  await expect(trap).not.toBeInViewport();
  await expect(trap).toHaveAttribute("tabindex", "-1");
  await expect(page.getByRole("textbox", { name: "Website" })).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("posts the form to the API and lands on the thank-you page", async ({ page, baseURL }) => {
    let posted: { type: string; body: string } | undefined;
    await page.route("**/v1/contact", async (route) => {
      posted = {
        type: route.request().headers()["content-type"] ?? "",
        body: route.request().postData() ?? "",
      };
      await route.fulfill({ status: 303, headers: { Location: `${baseURL}/contact/sent` } });
    });
    await page.goto("/contact");
    // (text inside <noscript> is invisible to Playwright's text search, so by class)
    await expect(page.locator(".contact-noscript")).toContainText("isn't running JavaScript");

    await fill(page, { name: "Ada", email: "ada@example.com", message: "Hello without scripts" });
    await send(page);

    await expect(page).toHaveURL("/contact/sent");
    await expect(page.getByRole("heading", { level: 1, name: "Thank you" })).toBeVisible();
    expect(posted?.type).toContain("application/x-www-form-urlencoded");
    const fields = new URLSearchParams(posted?.body);
    expect(Object.fromEntries(fields)).toMatchObject({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello without scripts",
      website: "",
    });
  });

  test("explains why a message was not sent, with a way back", async ({ page }) => {
    for (const reason of ["invalid", "bot-check", "limited", "busy", "unavailable"]) {
      await page.goto(`/contact/not-sent/${reason}`);
      await expect(page.getByRole("heading", { level: 1, name: "Not sent yet" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to the form" })).toHaveAttribute(
        "href",
        "/contact",
      );
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        /noindex/,
      );
    }
  });
});

test("Baiju waves: below the form on phones and tablets, beside it on desktops", async ({
  page,
}, info) => {
  await setUp(page, (route) => route.fulfill({ status: 202, json: {} }));
  const figure = page.locator(".contact-figure .character[data-pose='waving']");
  await expect(figure).toBeAttached();
  const card = await page.locator(".contact-card").boundingBox();
  const box = await figure.boundingBox();
  if (card === null || box === null) throw new Error("not laid out");
  if (info.project.name === "desktop") {
    expect(box.x).toBeGreaterThan(card.x + card.width + 16);
  } else {
    expect(box.y).toBeGreaterThan(card.y + card.height);
  }
});
