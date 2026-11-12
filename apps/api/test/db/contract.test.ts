import type { Express } from "express";
import type { Sequelize } from "sequelize";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { loadConfig } from "../../src/config";
import type { BotCheck } from "../../src/contact/bot-check";
import { ContactMessage, Profile } from "../../src/db";
import { createContract } from "../helpers/contract";
import { connect, resetDatabase, testConfig } from "./helpers";

/*
 * Contract tests: every response the API gives is checked against the OpenAPI document, and the
 * last test fails if any documented response was never produced. Together they keep the docs
 * and the API from drifting apart.
 */

const contract = createContract();
let sequelize: Sequelize;
let app: Express;

beforeAll(async () => {
  sequelize = connect();
  await resetDatabase(sequelize);
  app = createApp(testConfig({ RATE_LIMIT_PER_MINUTE: "10000" }), { sequelize });
});

afterAll(async () => {
  await sequelize.close();
});

/** One request per content operation: its documented path and a URL that exercises it. */
const CONTENT: [path: string, url: string][] = [
  ["/v1/projects", "/v1/projects?tag=cloud&q=aws&page=1&pageSize=5"],
  ["/v1/projects/{slug}", "/v1/projects/lightning-observation"],
  ["/v1/profile", "/v1/profile"],
  ["/v1/profile/cv.pdf", "/v1/profile/cv.pdf"],
];

describe.each(CONTENT)("GET %s", (path, url) => {
  it("200 and 304 match the spec", async () => {
    const ok = await request(app).get(url);
    contract.check(ok, "get", path);
    expect(ok.status).toBe(200);

    const notModified = await request(app).get(url).set("If-None-Match", String(ok.headers.etag));
    contract.check(notModified, "get", path);
    expect(notModified.status).toBe(304);
  });

  it("429 matches the spec", async () => {
    const limited = createApp(testConfig({ RATE_LIMIT_PER_MINUTE: "1" }), { sequelize });
    await request(limited).get(url);
    const res = await request(limited).get(url);
    contract.check(res, "get", path);
    expect(res.status).toBe(429);
  });

  it("503 matches the spec", async () => {
    const res = await request(createApp(loadConfig({ NODE_ENV: "test" }))).get(url);
    contract.check(res, "get", path);
    expect(res.status).toBe(503);
  });
});

describe("client errors", () => {
  it("400 for invalid list parameters matches the spec", async () => {
    const res = await request(app).get("/v1/projects?pageSize=0");
    contract.check(res, "get", "/v1/projects");
    expect(res.status).toBe(400);
  });

  it("404 for an unknown project matches the spec", async () => {
    const res = await request(app).get("/v1/projects/no-such-project");
    contract.check(res, "get", "/v1/projects/{slug}");
    expect(res.status).toBe(404);
  });

  it("404 without a profile matches the spec", async () => {
    await Profile.destroy({ where: {} });
    try {
      for (const path of ["/v1/profile", "/v1/profile/cv.pdf"]) {
        const res = await request(app).get(path);
        contract.check(res, "get", path);
        expect(res.status).toBe(404);
      }
    } finally {
      await resetDatabase(sequelize);
    }
  });
});

describe("GET /health", () => {
  it("200, shallow and deep, matches the spec", async () => {
    for (const url of ["/health", "/health?deep=1"]) {
      const res = await request(app).get(url);
      contract.check(res, "get", "/health");
      expect(res.status).toBe(200);
    }
  });

  it("503 on a deep check without a database matches the spec", async () => {
    const res = await request(createApp(loadConfig({ NODE_ENV: "test" }))).get("/health?deep=1");
    contract.check(res, "get", "/health");
    expect(res.status).toBe(503);
  });
});

describe("POST /v1/contact", () => {
  const botCheck: BotCheck = { verify: (token) => Promise.resolve(token === "pass") };
  const contactApp = (env: Record<string, string> = {}) =>
    createApp(
      testConfig({
        IP_HASH_SALT: "contract-salt-0123456789",
        RATE_LIMIT_PER_MINUTE: "10000",
        ...env,
      }),
      { sequelize, botCheck },
    );
  const message = {
    name: "Ada",
    email: "ada@example.com",
    message: "Hello",
    turnstileToken: "pass",
  };
  const post = (app: Express, body: object) => request(app).post("/v1/contact").send(body);

  it("202, 400 and 403 match the spec", async () => {
    const app = contactApp();
    for (const [body, status] of [
      [message, 202],
      [{ ...message, email: "nope" }, 400],
      [{ ...message, turnstileToken: "forged" }, 403],
    ] as const) {
      const res = await post(app, body);
      contract.check(res, "post", "/v1/contact");
      expect(res.status).toBe(status);
    }
  });

  it("429 matches the spec", async () => {
    const app = contactApp({ CONTACT_LIMIT_PER_HOUR: "1" });
    await post(app, message).set("X-Forwarded-For", "192.0.2.50");
    const res = await post(app, message).set("X-Forwarded-For", "192.0.2.50");
    contract.check(res, "post", "/v1/contact");
    expect(res.status).toBe(429);
  });

  it("503 matches the spec", async () => {
    const res = await post(createApp(testConfig(), { sequelize }), message);
    contract.check(res, "post", "/v1/contact");
    expect(res.status).toBe(503);
  });
});

describe("GET /cron/purge-contact-messages", () => {
  const secret = "contract-cron-secret-0123";
  const path = "/cron/purge-contact-messages";

  it("200 and 401 match the spec", async () => {
    const app = createApp(testConfig({ CRON_SECRET: secret }), { sequelize });
    const ok = await request(app).get(path).set("Authorization", `Bearer ${secret}`);
    contract.check(ok, "get", path);
    expect(ok.status).toBe(200);

    const unauthorised = await request(app).get(path);
    contract.check(unauthorised, "get", path);
    expect(unauthorised.status).toBe(401);
  });

  it("503 matches the spec", async () => {
    const res = await request(createApp(testConfig(), { sequelize })).get(path);
    contract.check(res, "get", path);
    expect(res.status).toBe(503);
  });

  afterAll(async () => {
    await ContactMessage.destroy({ where: {} });
  });
});

describe("coverage", () => {
  it("has produced every documented response", () => {
    expect(contract.unexercised()).toEqual([]);
  });
});
