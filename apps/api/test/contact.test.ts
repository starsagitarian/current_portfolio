import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProblemSchema } from "@starsagitarian/shared";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { BotCheckUnavailableError, TurnstileBotCheck } from "../src/contact/bot-check";
import { ResendMailer } from "../src/contact/mailer";
import { originMatcher } from "../src/http/cors";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentRequest(fetchMock: ReturnType<typeof stubFetch>): [string, RequestInit] {
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit] | undefined;
  if (call === undefined) throw new Error("fetch was not called");
  return call;
}

describe("originMatcher", () => {
  const allowed = originMatcher(
    "https://starsagitarian.vercel.app, https://starsagitarian-*-starsagitarian.vercel.app, http://localhost:3000/",
  );

  it("accepts the site, its previews and local development", () => {
    expect(allowed("https://starsagitarian.vercel.app")).toBe(true);
    expect(allowed("https://starsagitarian-oykefhugg-starsagitarian.vercel.app")).toBe(true);
    expect(allowed("http://localhost:3000")).toBe(true);
  });

  it("refuses look-alikes", () => {
    for (const origin of [
      "https://evil.example",
      "http://starsagitarian.vercel.app",
      "https://starsagitarian.vercel.app.evil.example",
      "https://starsagitarian-a.b-starsagitarian.vercel.app",
      "https://starsagitarian-x-other.vercel.app",
      "https://xstarsagitarian.vercel.app",
    ]) {
      expect(allowed(origin), origin).toBe(false);
    }
  });
});

describe("TurnstileBotCheck", () => {
  it("posts the secret, token and IP to Cloudflare and reads success", async () => {
    const fetchMock = stubFetch(Response.json({ success: true }));
    await expect(new TurnstileBotCheck("secret-1").verify("token-1", "203.0.113.9")).resolves.toBe(
      true,
    );

    const [url, init] = sentRequest(fetchMock);
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = new URLSearchParams(init.body as string);
    expect(Object.fromEntries(body)).toEqual({
      secret: "secret-1",
      response: "token-1",
      remoteip: "203.0.113.9",
    });
  });

  it("reports a rejected token as a failed check", async () => {
    stubFetch(Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
    await expect(new TurnstileBotCheck("s").verify("bad", undefined)).resolves.toBe(false);
  });

  it("reports an unreachable or failing service as unavailable", async () => {
    stubFetch(new TypeError("fetch failed"));
    await expect(new TurnstileBotCheck("s").verify("t", undefined)).rejects.toBeInstanceOf(
      BotCheckUnavailableError,
    );

    stubFetch(new Response("oops", { status: 500 }));
    await expect(new TurnstileBotCheck("s").verify("t", undefined)).rejects.toBeInstanceOf(
      BotCheckUnavailableError,
    );
  });
});

describe("ResendMailer", () => {
  const mail = {
    to: "owner@example.com",
    replyTo: "visitor@example.com",
    subject: "Hello",
    text: "Body",
    idempotencyKey: "contact-1",
  };

  it("sends one email through the Resend API", async () => {
    const fetchMock = stubFetch(Response.json({ id: "email-1" }));
    await new ResendMailer("re_key", "Site <onboarding@resend.dev>").send(mail);

    const [url, init] = sentRequest(fetchMock);
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_key",
      "Idempotency-Key": "contact-1",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Site <onboarding@resend.dev>",
      to: ["owner@example.com"],
      reply_to: "visitor@example.com",
      subject: "Hello",
      text: "Body",
    });
  });

  it("fails with the status only, never the response body", async () => {
    stubFetch(Response.json({ message: "owner@example.com is not allowed" }, { status: 403 }));
    const error = await new ResendMailer("k", "f").send(mail).catch((e: unknown) => e);

    expect(String(error)).toBe("Error: Resend answered 403");
  });
});

describe("contact and cron without their settings", () => {
  const app = createApp(loadConfig({ NODE_ENV: "test" }));

  it("answers 503 for the contact form without a database", async () => {
    const res = await request(app).post("/v1/contact").send({}).expect(503);
    expect(ProblemSchema.parse(res.body).status).toBe(503);
  });

  it("answers 503 for scheduled jobs without CRON_SECRET", async () => {
    const res = await request(app).get("/cron/purge-contact-messages").expect(503);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("asks for a bearer token when CRON_SECRET is set", async () => {
    const secured = createApp(loadConfig({ NODE_ENV: "test", CRON_SECRET: "s".repeat(32) }));
    for (const auth of [undefined, "Bearer wrong", `Basic ${"s".repeat(32)}`]) {
      const req = request(secured).get("/cron/purge-contact-messages");
      const res = await (auth === undefined ? req : req.set("Authorization", auth));
      expect(res.status).toBe(401);
      expect(res.headers["www-authenticate"]).toContain("Bearer");
    }
  });
});
