import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { PurgeResultSchema } from "@starsagitarian/shared";
import { HttpError } from "../errors";
import { NO_STORE } from "../http/cache";
import type { RetentionService } from "../services/contact";

export interface CronOptions {
  /** The bearer token callers must send; undefined disables the routes. */
  secret: string | undefined;
  /** Undefined without a database. */
  retention: RetentionService | undefined;
}

/** Compares in constant time, so the response time reveals nothing about the secret. */
function sameSecret(given: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Scheduled jobs. `GET /cron/purge-contact-messages` deletes contact messages older than 12
 * months; Vercel Cron calls it daily with `Authorization: Bearer <CRON_SECRET>`.
 */
export function cronRouter({ secret, retention }: CronOptions): Router {
  const router = Router();

  router.use("/cron", (req, res, next) => {
    res.set("Cache-Control", NO_STORE);
    if (secret === undefined) {
      throw new HttpError(503, "Service Unavailable", "Scheduled jobs are not configured.");
    }
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!sameSecret(token, secret)) {
      res.set("WWW-Authenticate", 'Bearer realm="cron"');
      throw new HttpError(401, "Unauthorized", "A valid bearer token is required.");
    }
    next();
  });

  router.get("/cron/purge-contact-messages", async (req, res) => {
    if (retention === undefined) {
      throw new HttpError(503, "Service Unavailable", "The database is not configured.");
    }
    const { deleted, before } = await retention.purgeExpired();
    req.log.info({ deleted }, "cron: purged expired contact messages");
    res.json(PurgeResultSchema.parse({ deleted, before: before.toISOString() }));
  });

  return router;
}
