import { randomUUID } from "node:crypto";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import { loadConfig, type Config } from "./config";
import { errorHandler, notFound } from "./errors";
import { healthRouter } from "./routes/health";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Builds the Express application without starting a server,
 * so tests and serverless hosts can use it directly.
 */
export function createApp(config: Config = loadConfig()): Express {
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
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));

  app.use(healthRouter(config));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
