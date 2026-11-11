// Entry point for Vercel Functions: the platform owns the HTTP server and calls the exported app
// for each request. The database connects lazily, on the first query, and is reused while the
// function instance stays warm.
import { createApp } from "./app";
import { loadConfig } from "./config";
import { connectDatabase } from "./db";

const config = loadConfig();

export default createApp(config, { sequelize: connectDatabase(config) });
