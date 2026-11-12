import request from "supertest";
import { describe, expect, it } from "vitest";
import { HealthResponseSchema, PROBLEM_CONTENT_TYPE, ProblemSchema } from "@starsagitarian/shared";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";

const app = createApp(loadConfig({ NODE_ENV: "test" }));

describe("GET /health", () => {
  it("returns a valid health body that is never cached", async () => {
    const res = await request(app).get("/health").expect(200);

    expect(HealthResponseSchema.parse(res.body).status).toBe("ok");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("sends security headers and hides the framework", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("echoes a safe request id and replaces an unsafe one", async () => {
    const safe = await request(app).get("/health").set("X-Request-Id", "abc-123");
    expect(safe.headers["x-request-id"]).toBe("abc-123");

    const unsafe = await request(app).get("/health").set("X-Request-Id", "<script>");
    expect(unsafe.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("errors", () => {
  it("answers unknown routes with a problem+json 404", async () => {
    const res = await request(app).get("/nope").expect(404);

    expect(res.headers["content-type"]).toContain(PROBLEM_CONTENT_TYPE);
    expect(ProblemSchema.parse(res.body)).toMatchObject({ status: 404, title: "Not Found" });
  });

  it("answers malformed JSON with a problem+json 400", async () => {
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);

    expect(ProblemSchema.parse(res.body)).toMatchObject({ status: 400, title: "Bad Request" });
  });
});

describe("/v1 without a database", () => {
  it("answers 503 problem+json that is never cached", async () => {
    const res = await request(app).get("/v1/projects").expect(503);

    expect(res.headers["content-type"]).toContain(PROBLEM_CONTENT_TYPE);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(ProblemSchema.parse(res.body).detail).toBe("The database is not configured.");
  });
});

describe("rate limiting", () => {
  it("allows the configured number of requests a minute, then answers 429", async () => {
    const limited = createApp(loadConfig({ NODE_ENV: "test", RATE_LIMIT_PER_MINUTE: "2" }));

    const first = await request(limited).get("/v1/profile");
    expect(first.headers.ratelimit).toMatch(/r=1/);
    await request(limited).get("/v1/profile");

    const res = await request(limited).get("/v1/profile").expect(429);
    expect(res.headers["retry-after"]).toMatch(/^\d+$/);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(ProblemSchema.parse(res.body)).toMatchObject({
      status: 429,
      title: "Too Many Requests",
    });
  });

  it("leaves the health check alone", async () => {
    const limited = createApp(loadConfig({ NODE_ENV: "test", RATE_LIMIT_PER_MINUTE: "1" }));
    for (let i = 0; i < 3; i++) await request(limited).get("/health").expect(200);
  });
});

describe("loadConfig", () => {
  it("applies defaults", () => {
    expect(loadConfig({})).toMatchObject({
      PORT: 4000,
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      RATE_LIMIT_PER_MINUTE: 60,
    });
  });

  it("treats empty values as unset", () => {
    const config = loadConfig({ RESEND_API_KEY: "", CONTACT_ALERT_EMAIL: "" });
    expect(config.RESEND_API_KEY).toBeUndefined();
    expect(config.CONTACT_ALERT_EMAIL).toBeUndefined();
  });

  it("rejects an invalid port", () => {
    expect(() => loadConfig({ PORT: "99999" })).toThrow(/Invalid environment configuration/);
  });
});
