import { randomUUID } from "node:crypto";
import express, { Router, type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import type { Sequelize } from "sequelize";
import { loadConfig, type Config } from "./config";
import { TurnstileBotCheck, type BotCheck } from "./contact/bot-check";
import { ResendMailer, type Mailer } from "./contact/mailer";
import { errorHandler, HttpError, notFound } from "./errors";
import { originMatcher, publicReadCors } from "./http/cors";
import { rateLimitPerMinute } from "./http/rate-limit";
import { ContactMessageRepository } from "./repositories/contact-messages";
import { ProfileRepository } from "./repositories/profile";
import { ProjectRepository } from "./repositories/projects";
import { contactRouter } from "./routes/contact";
import { cronRouter } from "./routes/cron";
import { docsRouter } from "./routes/docs";
import { healthRouter } from "./routes/health";
import { profileRouter } from "./routes/profile";
import { projectsRouter } from "./routes/projects";
import { ContactService, RetentionService } from "./services/contact";
import { ProfileService } from "./services/profile";
import { ProjectService } from "./services/projects";

const REQUEST_ID_HEADER = "x-request-id";

export interface AppDependencies {
  /** The database connection, when DATABASE_URL is set. */
  sequelize?: Sequelize | undefined;
  /** Replaces Cloudflare Turnstile (tests). */
  botCheck?: BotCheck | undefined;
  /** Replaces Resend (tests). */
  mailer?: Mailer | undefined;
  /** Replaces the clock (tests). */
  now?: (() => Date) | undefined;
}

/** The contact form, when the database, a bot check and the IP salt are all configured. */
function contactService(
  config: Config,
  repository: ContactMessageRepository,
  deps: AppDependencies,
): ContactService | undefined {
  const botCheck =
    deps.botCheck ??
    (config.TURNSTILE_SECRET_KEY === undefined
      ? undefined
      : new TurnstileBotCheck(config.TURNSTILE_SECRET_KEY));
  if (botCheck === undefined || config.IP_HASH_SALT === undefined) return undefined;

  const mailer =
    deps.mailer ??
    (config.RESEND_API_KEY === undefined
      ? undefined
      : new ResendMailer(config.RESEND_API_KEY, config.CONTACT_FROM));

  return new ContactService(
    repository,
    botCheck,
    mailer,
    {
      ipHashSalt: config.IP_HASH_SALT,
      limitPerHour: config.CONTACT_LIMIT_PER_HOUR,
      alertEmail: config.CONTACT_ALERT_EMAIL,
    },
    deps.now,
  );
}

/**
 * Version 1 of the public API. Routes read through services, which read through repositories,
 * so HTTP concerns, shaping and SQL each live in one place.
 */
function v1Router(config: Config, deps: AppDependencies): Router {
  const router = Router();
  router.use(rateLimitPerMinute(config.RATE_LIMIT_PER_MINUTE));
  router.use(publicReadCors);

  const { sequelize } = deps;
  if (sequelize === undefined) {
    router.use(() => {
      throw new HttpError(503, "Service Unavailable", "The database is not configured.");
    });
    return router;
  }

  router.use(projectsRouter(new ProjectService(new ProjectRepository(sequelize))));
  router.use(profileRouter(new ProfileService(new ProfileRepository())));
  router.use(
    contactRouter({
      contact: contactService(config, new ContactMessageRepository(sequelize), deps),
      isAllowedOrigin: originMatcher(config.CORS_ORIGINS),
    }),
  );
  return router;
}

/**
 * Builds the Express application without starting a server,
 * so tests and serverless hosts can use it directly.
 */
export function createApp(config: Config = loadConfig(), deps: AppDependencies = {}): Express {
  const logger = pino({
    level: config.NODE_ENV === "test" ? "silent" : config.LOG_LEVEL,
    redact: ["req.headers.authorization", "req.headers.cookie"],
  });

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const id =
          typeof incoming === "string" && /^[\w-]{1,128}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      // One line per request with what is needed to trace it: no headers, cookies or client IPs.
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => {
        if (err !== undefined || res.statusCode >= 500) return "error";
        return res.statusCode >= 400 ? "warn" : "info";
      },
    }),
  );
  app.use(helmet());
  // A 5,000-character message in any script fits comfortably.
  app.use(express.json({ limit: "32kb" }));

  const { sequelize } = deps;
  app.use(
    healthRouter(config, {
      checkDatabase: sequelize ? () => sequelize.authenticate({ logging: false }) : undefined,
    }),
  );
  app.use(docsRouter());
  app.use(
    cronRouter({
      secret: config.CRON_SECRET,
      retention: sequelize
        ? new RetentionService(new ContactMessageRepository(sequelize), deps.now)
        : undefined,
    }),
  );
  app.use("/v1", v1Router(config, deps));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
