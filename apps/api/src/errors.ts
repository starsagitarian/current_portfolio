import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ConnectionError } from "sequelize";
import { PROBLEM_CONTENT_TYPE, type Problem } from "@starsagitarian/shared";
import { NO_STORE } from "./http/cache";

/** An error that maps directly onto an HTTP problem response. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(detail ?? title);
    this.name = "HttpError";
  }
}

/** Errors are never cached, so a CDN cannot keep serving a failure after it is fixed. */
function sendProblem(res: Response, problem: Problem): void {
  res
    .status(problem.status)
    .set("Cache-Control", NO_STORE)
    .type(PROBLEM_CONTENT_TYPE)
    .json(problem);
}

function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("status" in err)) return undefined;
  const { status } = err;
  return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
}

/** Final route: anything not matched above is a 404. */
export const notFound: RequestHandler = (req, res) => {
  sendProblem(res, {
    type: "about:blank",
    title: "Not Found",
    status: 404,
    detail: `No route for ${req.method} ${req.path}`,
    instance: req.originalUrl,
  });
};

/** Turns thrown errors into problem+json responses without leaking internals. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    sendProblem(res, {
      type: "about:blank",
      title: err.title,
      status: err.status,
      ...(err.detail === undefined ? {} : { detail: err.detail }),
      instance: req.originalUrl,
    });
    return;
  }

  // Body-parser errors (malformed JSON, payload too large) carry their own 4xx status.
  const status = clientErrorStatus(err);
  if (status !== undefined) {
    sendProblem(res, {
      type: "about:blank",
      title: "Bad Request",
      status,
      instance: req.originalUrl,
    });
    return;
  }

  if (err instanceof ConnectionError) {
    // The reason stays in the server logs; callers only learn that it is down.
    req.log.error({ err }, "database unreachable");
    sendProblem(res, {
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      detail: "The database is unreachable.",
      instance: req.originalUrl,
    });
    return;
  }

  req.log.error({ err }, "unhandled error");
  sendProblem(res, {
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    instance: req.originalUrl,
  });
};
