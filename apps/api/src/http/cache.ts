import type { Response } from "express";

/**
 * Public content: browsers reuse it for 5 minutes and the CDN for an hour, after which the CDN
 * keeps serving the old copy for up to a day while it fetches a fresh one in the background.
 * So the database is asked at most about once an hour per URL, which keeps Neon asleep.
 */
export const CONTENT_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export const NO_STORE = "no-store";

export function cacheAsContent(res: Response): Response {
  return res.set("Cache-Control", CONTENT_CACHE_CONTROL);
}
