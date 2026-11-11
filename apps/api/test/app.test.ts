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

describe("loadConfig", () => {
  it("applies defaults", () => {
    expect(loadConfig({})).toMatchObject({
      PORT: 4000,
      NODE_ENV: "development",
      LOG_LEVEL: "info",
    });
  });

  it("rejects an invalid port", () => {
    expect(() => loadConfig({ PORT: "99999" })).toThrow(/Invalid environment configuration/);
  });
});
