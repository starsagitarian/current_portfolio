import { z } from "zod";

/**
 * Error body in the RFC 9457 "problem details" format.
 * The API sends it with the `application/problem+json` content type.
 */
export const ProblemSchema = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
});

export type Problem = z.infer<typeof ProblemSchema>;

export const PROBLEM_CONTENT_TYPE = "application/problem+json";
