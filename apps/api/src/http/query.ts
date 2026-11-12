import type { z } from "zod";
import { HttpError } from "../errors";

/** Validates query parameters against a schema, answering 400 with what was wrong. */
export function parseQuery<T extends z.ZodType>(schema: T, query: unknown): z.output<T> {
  const parsed = schema.safeParse(query);
  if (parsed.success) return parsed.data;

  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`)
    .join("; ");
  throw new HttpError(400, "Bad Request", `Invalid query parameters. ${detail}.`);
}
