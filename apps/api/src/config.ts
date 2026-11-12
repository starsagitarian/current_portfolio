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
  /** Requests per minute that one client may make to /v1 before it gets 429 responses. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(60),

  // ---- Contact form. It answers 503 until the bot check and the IP salt are set.
  /**
   * Sites allowed to send contact messages from a browser, comma-separated. A `*` stands for one
   * run of letters and digits, for preview deployments such as `https://app-*-team.vercel.app`.
   */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  /** Cloudflare Turnstile secret key (Cloudflare publishes test keys for development). */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /** Secret mixed into stored IP hashes, so they cannot be reversed by guessing addresses. */
  IP_HASH_SALT: z.string().min(16).optional(),
  /** Messages one sender may send in an hour. */
  CONTACT_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(100).default(5),
  /** Resend API key. Without it messages are stored but no alert email is sent. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Where alerts go. Kept in secrets only: it never appears in the repository or on the site. */
  CONTACT_ALERT_EMAIL: z.email().optional(),
  /** Sender of alert emails. Resend's shared address works without a domain of your own. */
  CONTACT_FROM: z.string().min(3).default("starsagitarian <onboarding@resend.dev>"),
  /** Bearer token the scheduler sends to the clean-up route. Vercel Cron sends CRON_SECRET. */
  CRON_SECRET: z.string().min(16).optional(),
});

export type Config = z.infer<typeof EnvSchema> & { version: string; service: string };

/** Reads and validates configuration from environment variables; throws on invalid values. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // An empty value (`KEY=` in a .env file) means "not set".
  const set = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const parsed = EnvSchema.safeParse(set);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return { ...parsed.data, version: pkg.version, service: "starsagitarian-api" };
}
