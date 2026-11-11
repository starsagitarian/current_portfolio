import { createApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.PORT, () => {
  console.info(`${config.service} ${config.version} listening on http://localhost:${config.PORT}`);
});

// Finish in-flight requests before exiting (Docker and most hosts send SIGTERM).
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
