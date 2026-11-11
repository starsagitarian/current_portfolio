import { createApp } from "./app";
import { loadConfig } from "./config";
import { connectDatabase } from "./db";

const config = loadConfig();
const sequelize = connectDatabase(config);
const app = createApp(config, { sequelize });

const server = app.listen(config.PORT, () => {
  console.info(`${config.service} ${config.version} listening on http://localhost:${config.PORT}`);
  if (sequelize === undefined) console.warn("DATABASE_URL is not set: running without a database.");
});

// Finish in-flight requests and close database connections before exiting.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      void (sequelize?.close() ?? Promise.resolve()).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
