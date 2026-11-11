import type { Sequelize } from "sequelize";
import { inject } from "vitest";
import { loadConfig, type Config } from "../../src/config";
import { connectDatabase, createMigrator, createSeeder } from "../../src/db";

export function testConfig(overrides: Partial<Record<string, string>> = {}): Config {
  return loadConfig({ NODE_ENV: "test", DATABASE_URL: inject("databaseUrl"), ...overrides });
}

export function connect(): Sequelize {
  const sequelize = connectDatabase(testConfig());
  if (sequelize === undefined) throw new Error("test database URL missing");
  return sequelize;
}

/** Empties the database, then migrates and (optionally) seeds it. */
export async function resetDatabase(sequelize: Sequelize, { seed = true } = {}): Promise<void> {
  await createSeeder(sequelize).down({ to: 0 });
  await createMigrator(sequelize).down({ to: 0 });
  await createMigrator(sequelize).up();
  if (seed) await createSeeder(sequelize).up();
}
