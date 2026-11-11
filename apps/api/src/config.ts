import { z } from "zod";
import pkg from "../package.json" with { type: "json" };

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** PostgreSQL connection string. Optional so the API can boot (and report it) without one. */
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// URL")
    .optional(),
  /** Require TLS to the database (true for Neon and any hosted Postgres). */
  DATABASE_SSL: z.stringbool().default(false),
  /** Connections per process; keep low on serverless hosts. */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
});

export type Config = z.infer<typeof EnvSchema> & { version: string; service: string };

/** Reads and validates configuration from environment variables; throws on invalid values. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return { ...parsed.data, version: pkg.version, service: "starsagitarian-api" };
}
