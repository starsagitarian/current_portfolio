import type { RequestHandler } from "express";

/**
 * Turns the CORS_ORIGINS setting into a matcher. Entries are exact origins; a `*` in one stands
 * for a run of lower-case letters and digits, which covers preview URLs and nothing wider.
 */
export function originMatcher(setting: string): (origin: string) => boolean {
  const patterns = setting
    .split(",")
    .map((entry) => entry.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .map((entry) => {
      const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9]+");
      return new RegExp(`^${escaped}$`);
    });
  return (origin) => patterns.some((pattern) => pattern.test(origin));
}

/** Public, read-only data: any site may read it from a browser. */
export const publicReadCors: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") res.set("Access-Control-Allow-Origin", "*");
  next();
};

/**
 * Write access for the listed sites only. Preflight requests are answered here; a site that is
 * not listed gets no CORS headers, so the browser refuses to send the request.
 */
export function restrictedCors(isAllowed: (origin: string) => boolean): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    res.vary("Origin");
    if (origin !== undefined && isAllowed(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    if (req.method === "OPTIONS") {
      if (origin !== undefined && isAllowed(origin)) {
        res.set({
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
        });
      }
      res.set("Cache-Control", "no-store").status(204).end();
      return;
    }
    next();
  };
}
