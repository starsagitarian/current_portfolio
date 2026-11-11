import type { Sequelize } from "sequelize";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HealthResponseSchema, ProblemSchema } from "@starsagitarian/shared";
import { createApp } from "../../src/app";
import { loadConfig } from "../../src/config";
import { connectDatabase } from "../../src/db";
import { connect, testConfig } from "./helpers";

let sequelize: Sequelize;

beforeAll(() => {
  sequelize = connect();
});

afterAll(async () => {
  await sequelize.close();
});

describe("GET /health?deep=1", () => {
  it("reports the database as up when it answers", async () => {
    const app = createApp(testConfig(), { sequelize });
    const res = await request(app).get("/health?deep=1").expect(200);

    expect(HealthResponseSchema.parse(res.body).database).toBe("up");
  });

  it("answers 503 without leaking details when the database is unreachable", async () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgres://nobody:wrong@127.0.0.1:1/none",
    });
    const unreachable = connectDatabase(config);
    const app = createApp(config, { sequelize: unreachable });

    const res = await request(app).get("/health?deep=1").expect(503);
    expect(ProblemSchema.parse(res.body).detail).toBe("The database is unreachable.");
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|nobody/);

    await unreachable?.close();
  });

  it("answers 503 when no database is configured", async () => {
    const app = createApp(loadConfig({ NODE_ENV: "test" }));
    const res = await request(app).get("/health?deep=1").expect(503);

    expect(ProblemSchema.parse(res.body).detail).toBe("The database is not configured.");
  });

  it("keeps the shallow check away from the database", async () => {
    const app = createApp(loadConfig({ NODE_ENV: "test" }));
    const res = await request(app).get("/health").expect(200);

    expect(HealthResponseSchema.parse(res.body).database).toBeUndefined();
  });
});
