import { Router } from "express";
import { HealthResponseSchema, type HealthResponse } from "@starsagitarian/shared";
import type { Config } from "../config";
import { HttpError } from "../errors";

const DATABASE_TIMEOUT_MS = 5_000;

export interface HealthOptions {
  /** Resolves when the database answers; rejects otherwise. Undefined when no database is set. */
  checkDatabase?: (() => Promise<void>) | undefined;
}

/**
 * `GET /health` is a cheap liveness check that never touches the database.
 * `GET /health?deep=1` also checks the database and answers 503 if it is down,
 * so it should only be called on demand (it wakes a sleeping Neon database).
 */
export function healthRouter(
  config: Pick<Config, "service" | "version">,
  { checkDatabase }: HealthOptions = {},
): Router {
  const router = Router();

  router.get("/health", async (req, res) => {
    const deep = req.query.deep === "1" || req.query.deep === "true";
    let database: HealthResponse["database"];

    if (deep) {
      if (checkDatabase === undefined) {
        throw new HttpError(503, "Service Unavailable", "The database is not configured.");
      }
      try {
        await withTimeout(checkDatabase(), DATABASE_TIMEOUT_MS);
      } catch {
        // The reason stays in the server logs; callers only learn that it is down.
        req.log.warn("deep health check: database unreachable");
        throw new HttpError(503, "Service Unavailable", "The database is unreachable.");
      }
      database = "up";
    }

    const body: HealthResponse = HealthResponseSchema.parse({
      status: "ok",
      service: config.service,
      version: config.version,
      time: new Date().toISOString(),
      ...(database === undefined ? {} : { database }),
    });
    res.set("Cache-Control", "no-store").json(body);
  });

  return router;
}

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`timed out after ${ms} ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}
