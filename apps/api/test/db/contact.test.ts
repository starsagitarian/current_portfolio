import type { Sequelize } from "sequelize";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactReceiptSchema, ProblemSchema, PurgeResultSchema } from "@starsagitarian/shared";
import { createApp, type AppDependencies } from "../../src/app";
import { BotCheckUnavailableError, type BotCheck } from "../../src/contact/bot-check";
import type { Mail, Mailer } from "../../src/contact/mailer";
import { ContactMessage } from "../../src/db";
import { connect, resetDatabase, testConfig } from "./helpers";

const SALT = "test-salt-0123456789abcdef";
const CRON_SECRET = "cron-secret-0123456789abcdef";
const SITE = "https://starsagitarian.vercel.app";

let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = connect();
  await resetDatabase(sequelize);
});

beforeEach(async () => {
  await ContactMessage.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

/** Passes the token "pass" and nothing else, like Turnstile with a real widget. */
const botCheck: BotCheck = { verify: (token) => Promise.resolve(token === "pass") };

function recordingMailer(fail = false) {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    send: (mail) => {
      sent.push(mail);
      return fail ? Promise.reject(new Error("Resend answered 500")) : Promise.resolve();
    },
  };
  return { sent, mailer };
}

function contactApp(deps: Partial<AppDependencies> = {}, env: Record<string, string> = {}) {
  return createApp(
    testConfig({
      IP_HASH_SALT: SALT,
      CONTACT_ALERT_EMAIL: "owner@example.com",
      CORS_ORIGINS: `${SITE},https://starsagitarian-*-starsagitarian.vercel.app`,
      CRON_SECRET,
      RATE_LIMIT_PER_MINUTE: "10000",
      ...env,
    }),
    { sequelize, botCheck, ...deps },
  );
}

const message = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello! I enjoyed the London scene.\nCould we talk about a role?",
  turnstileToken: "pass",
};

describe("POST /v1/contact", () => {
  it("stores the message with a hashed IP and emails the owner", async () => {
    const { sent, mailer } = recordingMailer();
    const res = await request(contactApp({ mailer }))
      .post("/v1/contact")
      .set("X-Forwarded-For", "203.0.113.7")
      .set("User-Agent", "test-browser/1.0")
      .send({ ...message, name: "  Ada Lovelace  " })
      .expect(202);

    expect(ContactReceiptSchema.parse(res.body)).toEqual({ status: "received" });
    expect(res.headers["cache-control"]).toBe("no-store");

    const rows = await ContactMessage.findAll();
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: message.message,
      userAgent: "test-browser/1.0",
    });
    expect(row?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.ipHash).not.toContain("203.0.113.7");

    expect(sent).toEqual([
      expect.objectContaining({
        to: "owner@example.com",
        replyTo: "ada@example.com",
        subject: "Portfolio message from Ada Lovelace",
        idempotencyKey: `contact-${row?.id ?? ""}`,
      }),
    ]);
    expect(sent[0]?.text).toContain(message.message);
  });

  it("keeps line breaks out of the email subject", async () => {
    const { sent, mailer } = recordingMailer();
    await request(contactApp({ mailer }))
      .post("/v1/contact")
      .send({ ...message, name: "Eve\r\nBcc: victim@example.com" })
      .expect(202);

    expect(sent[0]?.subject).toBe("Portfolio message from Eve Bcc: victim@example.com");
  });

  it("drops a message whose honeypot is filled in, while answering as usual", async () => {
    const { sent, mailer } = recordingMailer();
    const verify = vi.fn((token: string) => Promise.resolve(token === "pass"));
    const res = await request(contactApp({ mailer, botCheck: { verify } }))
      .post("/v1/contact")
      .send({ ...message, website: "https://spam.example" })
      .expect(202);

    expect(res.body).toEqual({ status: "received" });
    expect(await ContactMessage.count()).toBe(0);
    expect(sent).toEqual([]);
    expect(verify).not.toHaveBeenCalled();
  });

  it("refuses a message that fails the bot check", async () => {
    const res = await request(contactApp())
      .post("/v1/contact")
      .send({ ...message, turnstileToken: "forged" })
      .expect(403);

    expect(ProblemSchema.parse(res.body).detail).toBe("The bot check failed. Please try again.");
    expect(await ContactMessage.count()).toBe(0);
  });

  it("answers 503 when the bot check service is down", async () => {
    const down: BotCheck = {
      verify: () => Promise.reject(new BotCheckUnavailableError(new Error("timeout"))),
    };
    await request(contactApp({ botCheck: down }))
      .post("/v1/contact")
      .send(message)
      .expect(503);
    expect(await ContactMessage.count()).toBe(0);
  });

  it.each([
    [{ ...message, name: "   " }, "name"],
    [{ ...message, email: "not-an-email" }, "email"],
    [{ ...message, message: "x".repeat(5001) }, "message"],
    [{ ...message, turnstileToken: "" }, "turnstileToken"],
    [{ name: "Ada" }, "email"],
  ])("rejects an invalid body with a 400 naming the field (%#)", async (body, field) => {
    const res = await request(contactApp()).post("/v1/contact").send(body).expect(400);
    expect(ProblemSchema.parse(res.body).detail).toContain(`${field}:`);
  });

  it("accepts a 5,000-character message in a non-Latin script", async () => {
    await request(contactApp())
      .post("/v1/contact")
      .send({ ...message, message: "東".repeat(5000) })
      .expect(202);
  });

  it("allows five messages an hour from one sender, then answers 429", async () => {
    const app = contactApp();
    const send = (ip: string) =>
      request(app).post("/v1/contact").set("X-Forwarded-For", ip).send(message);

    for (let i = 0; i < 5; i++) expect((await send("198.51.100.1")).status).toBe(202);

    const limited = await send("198.51.100.1");
    expect(limited.status).toBe(429);
    const retryAfter = Number(limited.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(3500);
    expect(retryAfter).toBeLessThanOrEqual(3600);

    // Someone else is not affected.
    expect((await send("198.51.100.2")).status).toBe(202);
    expect(await ContactMessage.count()).toBe(6);
  });

  it("holds the limit under parallel requests from one sender", async () => {
    const app = contactApp();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app).post("/v1/contact").set("X-Forwarded-For", "198.51.100.9").send(message),
      ),
    );

    expect(results.filter((res) => res.status === 202)).toHaveLength(5);
    expect(results.filter((res) => res.status === 429)).toHaveLength(3);
    expect(await ContactMessage.count()).toBe(5);
  });

  it("keeps the message when the alert email fails", async () => {
    const { mailer } = recordingMailer(true);
    await request(contactApp({ mailer })).post("/v1/contact").send(message).expect(202);
    expect(await ContactMessage.count()).toBe(1);
  });

  it("stores messages without emailing when no alert address is set", async () => {
    const { sent, mailer } = recordingMailer();
    const app = createApp(testConfig({ IP_HASH_SALT: SALT }), { sequelize, botCheck, mailer });
    await request(app).post("/v1/contact").send(message).expect(202);

    expect(sent).toEqual([]);
    expect(await ContactMessage.count()).toBe(1);
  });

  it("answers 503 until the bot check and IP salt are configured", async () => {
    const unconfigured = createApp(testConfig(), { sequelize });
    const res = await request(unconfigured).post("/v1/contact").send(message).expect(503);
    expect(ProblemSchema.parse(res.body).detail).toBe("The contact form is not configured.");
  });
});

/** The message as a browser without JavaScript sends it: no bot-check token. */
const withoutToken = { name: message.name, email: message.email, message: message.message };

describe("messages without the bot check (no JavaScript)", () => {
  it("are stored, marked, and flagged in the alert email", async () => {
    const { sent, mailer } = recordingMailer();
    await request(contactApp({ mailer })).post("/v1/contact").send(withoutToken).expect(202);

    const [row] = await ContactMessage.findAll();
    expect(row?.botChecked).toBe(false);
    expect(sent[0]?.subject).toBe("[No bot check] Portfolio message from Ada Lovelace");
    expect(sent[0]?.text).toContain("without the bot check");
  });

  it("are capped site-wide each day, while checked messages carry on", async () => {
    const app = contactApp({}, { CONTACT_UNCHECKED_PER_DAY: "2" });
    const send = (ip: string, body: object) =>
      request(app).post("/v1/contact").set("X-Forwarded-For", ip).send(body);

    expect((await send("192.0.2.1", withoutToken)).status).toBe(202);
    expect((await send("192.0.2.2", withoutToken)).status).toBe(202);

    // a third, from anyone, waits for the day to roll over
    const busy = await send("192.0.2.3", withoutToken);
    expect(busy.status).toBe(429);
    expect(ProblemSchema.parse(busy.body).detail).toContain("without the bot check");
    expect(Number(busy.headers["retry-after"])).toBeGreaterThan(86_000);

    expect((await send("192.0.2.3", message)).status).toBe(202);
    expect(await ContactMessage.count({ where: { botChecked: false } })).toBe(2);
  });

  it("hold the cap under parallel requests", async () => {
    const app = contactApp({}, { CONTACT_UNCHECKED_PER_DAY: "3" });
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        request(app)
          .post("/v1/contact")
          .set("X-Forwarded-For", `192.0.2.${20 + i}`)
          .send(withoutToken),
      ),
    );
    expect(results.filter((res) => res.status === 202)).toHaveLength(3);
    expect(await ContactMessage.count()).toBe(3);
  });

  it("are refused when the daily allowance is 0", async () => {
    const app = contactApp({}, { CONTACT_UNCHECKED_PER_DAY: "0" });
    await request(app).post("/v1/contact").send(withoutToken).expect(403);
    expect(await ContactMessage.count()).toBe(0);
  });
});

describe("plain form posts (no JavaScript)", () => {
  /** A plain form post, from the site unless another origin (or none, null) is given. */
  const form = (app = contactApp(), origin: string | null = SITE) => {
    const req = request(app).post("/v1/contact").type("form");
    return origin === null ? req : req.set("Origin", origin);
  };
  const fields = { name: "Ada Lovelace", email: " ada@example.com ", message: "Hello there." };

  it("store the message and send the browser back to the site's thank-you page", async () => {
    const res = await form().send(fields).expect(303);

    expect(res.headers.location).toBe(`${SITE}/contact/sent`);
    expect(res.headers["cache-control"]).toBe("no-store");
    const [row] = await ContactMessage.findAll();
    expect(row).toMatchObject({ email: "ada@example.com", botChecked: false });
  });

  it("go back to the preview they came from", async () => {
    const preview = "https://starsagitarian-abc123-starsagitarian.vercel.app";
    const res = await form(contactApp(), preview).send(fields).expect(303);
    expect(res.headers.location).toBe(`${preview}/contact/sent`);
  });

  it("use the widget's token when the page had JavaScript after all", async () => {
    await form()
      .send({ ...fields, "cf-turnstile-response": "pass" })
      .expect(303);
    expect((await ContactMessage.findOne())?.botChecked).toBe(true);
  });

  it("explain each refusal on its own page", async () => {
    const back = (res: request.Response) => {
      expect(res.status).toBe(303);
      return res.headers.location;
    };

    expect(back(await form().send({ ...fields, email: "not an email" }))).toBe(
      `${SITE}/contact/not-sent/invalid`,
    );
    expect(back(await form(contactApp({}, { CONTACT_UNCHECKED_PER_DAY: "0" })).send(fields))).toBe(
      `${SITE}/contact/not-sent/bot-check`,
    );
    expect(back(await form().send({ ...fields, "cf-turnstile-response": "wrong" }))).toBe(
      `${SITE}/contact/not-sent/bot-check`,
    );
    expect(
      back(await form(createApp(testConfig({ CORS_ORIGINS: SITE }), { sequelize })).send(fields)),
    ).toBe(`${SITE}/contact/not-sent/unavailable`);

    const once = contactApp({}, { CONTACT_UNCHECKED_PER_DAY: "1" });
    await form(once).send(fields).expect(303);
    expect(back(await form(once).send(fields))).toBe(`${SITE}/contact/not-sent/busy`);
    expect(await ContactMessage.count()).toBe(1);
  });

  it("answer a filled-in honeypot like a success, and drop it", async () => {
    const res = await form()
      .send({ ...fields, website: "https://spam.example" })
      .expect(303);
    expect(res.headers.location).toBe(`${SITE}/contact/sent`);
    expect(await ContactMessage.count()).toBe(0);
  });

  it("are refused from other sites, or with no site at all", async () => {
    await form(contactApp(), "https://evil.example").send(fields).expect(403);
    await form(contactApp(), null).send(fields).expect(403);
    expect(await ContactMessage.count()).toBe(0);
  });

  it("refuse repeated fields", async () => {
    const res = await form()
      .send("name=Ada&name=Eve&email=ada%40example.com&message=Hi")
      .expect(303);
    expect(res.headers.location).toBe(`${SITE}/contact/not-sent/invalid`);
  });
});

describe("CORS on the contact form", () => {
  const preflight = (origin: string) =>
    request(contactApp())
      .options("/v1/contact")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

  it("lets the site and its previews send messages from the browser", async () => {
    for (const origin of [SITE, "https://starsagitarian-abc123xyz-starsagitarian.vercel.app"]) {
      const res = await preflight(origin).expect(204);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
      expect(res.headers["access-control-allow-methods"]).toBe("POST");
      expect(res.headers["access-control-allow-headers"]).toBe("Content-Type");
    }

    const res = await request(contactApp())
      .post("/v1/contact")
      .set("Origin", SITE)
      .send(message)
      .expect(202);
    expect(res.headers["access-control-allow-origin"]).toBe(SITE);
    expect(res.headers.vary).toContain("Origin");
  });

  it("gives other sites no CORS permission and refuses their messages", async () => {
    const res = await preflight("https://evil.example").expect(204);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();

    const post = await request(contactApp())
      .post("/v1/contact")
      .set("Origin", "https://evil.example")
      .send(message)
      .expect(403);
    expect(ProblemSchema.parse(post.body).detail).toBe(
      "This site may not send messages to the API.",
    );
    expect(await ContactMessage.count()).toBe(0);
  });

  it("lets any site read public content", async () => {
    const res = await request(contactApp())
      .get("/v1/projects")
      .set("Origin", "https://anywhere.example")
      .expect(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});

describe("GET /cron/purge-contact-messages", () => {
  async function insertAged(monthsAgo: number, days = 0) {
    const row = await ContactMessage.create({
      name: "Old",
      email: "old@example.com",
      message: "hi",
      ipHash: "0".repeat(64),
      userAgent: null,
    });
    await sequelize.query(
      `UPDATE contact_messages
         SET created_at = now() - make_interval(months => $months, days => $days)
       WHERE id = $id`,
      { bind: { months: monthsAgo, days, id: row.id } },
    );
    return row.id;
  }

  it("deletes only messages older than 12 months", async () => {
    await insertAged(13);
    await insertAged(12, 2);
    const recent = await insertAged(11);
    const today = await insertAged(0);

    const res = await request(contactApp())
      .get("/cron/purge-contact-messages")
      .set("Authorization", `Bearer ${CRON_SECRET}`)
      .expect(200);

    expect(PurgeResultSchema.parse(res.body).deleted).toBe(2);
    expect(res.headers["cache-control"]).toBe("no-store");
    const left = (await ContactMessage.findAll()).map((row) => row.id).sort();
    expect(left).toEqual([recent, today].sort());
  });

  it("refuses a wrong token and deletes nothing", async () => {
    await insertAged(13);
    await request(contactApp())
      .get("/cron/purge-contact-messages")
      .set("Authorization", "Bearer not-the-secret")
      .expect(401);
    expect(await ContactMessage.count()).toBe(1);
  });
});
