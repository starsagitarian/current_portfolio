import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health";

describe("HealthResponseSchema", () => {
  it("accepts a well-formed health body", () => {
    const body = {
      status: "ok",
      service: "api",
      version: "0.1.0",
      time: new Date().toISOString(),
    };
    expect(HealthResponseSchema.parse(body)).toEqual(body);
  });

  it("rejects any status other than ok", () => {
    const result = HealthResponseSchema.safeParse({
      status: "degraded",
      service: "api",
      version: "0.1.0",
      time: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a time that is not an ISO 8601 timestamp", () => {
    const result = HealthResponseSchema.safeParse({
      status: "ok",
      service: "api",
      version: "0.1.0",
      time: "yesterday",
    });
    expect(result.success).toBe(false);
  });
});
