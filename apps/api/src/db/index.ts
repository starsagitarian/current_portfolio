import type { Sequelize } from "sequelize";
import type { Config } from "../config";
import { initModels } from "./models";
import { createSequelize } from "./sequelize";

export { createMigrator, createSeeder, rollback } from "./migrator";
export * from "./models";

/** Creates the database connection and binds the models, or returns undefined when no URL is set. */
export function connectDatabase(config: Config): Sequelize | undefined {
  if (config.DATABASE_URL === undefined) return undefined;
  const sequelize = createSequelize({
    url: config.DATABASE_URL,
    ssl: config.DATABASE_SSL,
    poolMax: config.DATABASE_POOL_MAX,
  });
  initModels(sequelize);
  return sequelize;
}
