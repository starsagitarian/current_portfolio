import pg from "pg";
import { Sequelize } from "sequelize";

export interface DatabaseOptions {
  url: string;
  ssl: boolean;
  poolMax: number;
  logging?: false | ((sql: string) => void);
}

/** Creates a Sequelize instance for PostgreSQL. It connects lazily, on first query. */
export function createSequelize({
  url,
  ssl,
  poolMax,
  logging = false,
}: DatabaseOptions): Sequelize {
  return new Sequelize(url, {
    dialect: "postgres",
    // Passing the driver explicitly keeps bundlers and serverless hosts from dropping it.
    dialectModule: pg,
    logging,
    pool: { max: poolMax, min: 0, idle: 10_000, acquire: 15_000, evict: 10_000 },
    dialectOptions: ssl ? { ssl: { require: true, rejectUnauthorized: true } } : {},
    define: { underscored: true },
  });
}
