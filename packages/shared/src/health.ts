import { z } from "zod";

/** Body returned by the API's `GET /health` endpoint. */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
  version: z.string().min(1),
  time: z.iso.datetime(),
  /** Present only on a deep check (`?deep=1`), which fails with 503 instead of reporting "down". */
  database: z.literal("up").optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
