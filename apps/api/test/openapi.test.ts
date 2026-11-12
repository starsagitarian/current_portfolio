import { readFile } from "node:fs/promises";
import path from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { buildOpenApiDocument } from "../src/openapi/document";
import { DOCS_CACHE_CONTROL } from "../src/routes/docs";

const app = createApp(loadConfig({ NODE_ENV: "test" }));

describe("OpenAPI document", () => {
  it("is a valid OpenAPI 3.1 document", async () => {
    const document = structuredClone(buildOpenApiDocument());
    await expect(SwaggerParser.validate(document as never)).resolves.toBeDefined();
  });

  it("matches the committed openapi.json (run `npm run openapi -w @starsagitarian/api`)", async () => {
    const committed: unknown = JSON.parse(
      await readFile(path.resolve(import.meta.dirname, "../openapi.json"), "utf8"),
    );
    expect(committed).toEqual(buildOpenApiDocument());
  });

  it("gives every operation a unique id", () => {
    const paths = buildOpenApiDocument().paths as Record<
      string,
      Record<string, { operationId: string }>
    >;
    const ids = Object.values(paths).flatMap((ops) =>
      Object.values(ops).map((op) => op.operationId),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("GET /openapi.json", () => {
  it("serves the document, cached for a day at the CDN", async () => {
    const res = await request(app).get("/openapi.json").expect(200);

    expect(res.body).toEqual(buildOpenApiDocument());
    expect(res.headers["cache-control"]).toBe(DOCS_CACHE_CONTROL);
  });
});

describe("GET /docs", () => {
  it("serves the docs page with pinned, integrity-checked Swagger UI", async () => {
    const res = await request(app).get("/docs").expect(200);

    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.headers["cache-control"]).toBe(DOCS_CACHE_CONTROL);
    expect(res.text).toMatch(
      /swagger-ui-dist@\d+\.\d+\.\d+\/swagger-ui-bundle\.js" integrity="sha384-/,
    );
    expect(res.text).toMatch(/swagger-ui-dist@\d+\.\d+\.\d+\/swagger-ui\.css" integrity="sha384-/);
  });

  it("allows the CDN on the docs page only", async () => {
    const docs = await request(app).get("/docs");
    const csp = String(docs.headers["content-security-policy"]);
    expect(csp).toContain("script-src 'self' https://cdn.jsdelivr.net");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

    const health = await request(app).get("/health");
    expect(String(health.headers["content-security-policy"])).not.toContain("cdn.jsdelivr.net");
  });

  it("starts Swagger UI from a script file pointing at the spec", async () => {
    const res = await request(app).get("/docs/init.js").expect(200);

    expect(res.headers["content-type"]).toContain("javascript");
    expect(res.text).toContain('url: "/openapi.json"');
  });
});
