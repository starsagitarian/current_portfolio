import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "../errors";

/**
 * A fixed one-minute window per client IP. Counts live in memory, so on serverless hosts each
 * warm instance keeps its own: enough to stop a burst from one client, while the CDN answers
 * most reads before they get here.
 */
export function rateLimitPerMinute(limit: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new HttpError(429, "Too Many Requests", "Too many requests. Try again in a minute."));
    },
  });
}
