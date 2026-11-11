import { Router } from "express";
import { HealthResponseSchema, type HealthResponse } from "@starsagitarian/shared";
import type { Config } from "../config";

/** Liveness check. SP-2 adds `?deep=1`, which also checks the database. */
export function healthRouter(config: Pick<Config, "service" | "version">): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    const body: HealthResponse = HealthResponseSchema.parse({
      status: "ok",
      service: config.service,
      version: config.version,
      time: new Date().toISOString(),
    });
    res.set("Cache-Control", "no-store").json(body);
  });

  return router;
}
