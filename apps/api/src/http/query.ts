import type { z } from "zod";
import { HttpError } from "../errors";

function parseOr400<T extends z.ZodType>(schema: T, input: unknown, what: string): z.output<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || what}: ${issue.message}`)
    .join("; ");
  throw new HttpError(400, "Bad Request", `Invalid ${what}. ${detail}.`);
}

/** Validates query parameters against a schema, answering 400 with what was wrong. */
export function parseQuery<T extends z.ZodType>(schema: T, query: unknown): z.output<T> {
  return parseOr400(schema, query, "query parameters");
}

/** Validates a JSON request body against a schema, answering 400 with what was wrong. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  return parseOr400(schema, body, "request body");
}
