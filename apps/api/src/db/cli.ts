/**
 * Database command line: npm run db:<command> -w @starsagitarian/api
 *
 *   migrate     apply pending migrations
 *   rollback    undo the latest migration (or all with --all)
 *   status      list applied and pending migrations and seeders
 *   seed        load portfolio content
 *   unseed      remove portfolio content (contact messages are kept)
 *   reset       unseed, roll back everything, migrate, seed (local use only)
 *   clear-messages  delete every contact message (preview databases copied from production)
 */
import { loadConfig } from "../config";
import { ContactMessage, connectDatabase, createMigrator, createSeeder, rollback } from "./index";

const USAGE = "Usage: db <migrate|rollback [--all]|status|seed|unseed|reset|clear-messages>";

async function main(argv: string[]): Promise<void> {
  const [command, flag] = argv;
  const config = loadConfig();
  const sequelize = connectDatabase(config);
  if (sequelize === undefined) throw new Error("DATABASE_URL is not set.");

  const migrator = createMigrator(sequelize);
  const seeder = createSeeder(sequelize);
  const names = (steps: { name: string }[]) => steps.map((s) => s.name).join(", ") || "none";

  try {
    switch (command) {
      case "migrate":
        console.info(`Applied: ${names(await migrator.up())}`);
        break;
      case "rollback": {
        const undone = await rollback(sequelize, { all: flag === "--all" });
        if (undone.seeders.length > 0) console.info(`Unseeded: ${undone.seeders.join(", ")}`);
        console.info(`Rolled back: ${undone.migrations.join(", ") || "none"}`);
        break;
      }
      case "status":
        console.info(`Migrations applied: ${names(await migrator.executed())}`);
        console.info(`Migrations pending: ${names(await migrator.pending())}`);
        console.info(`Seeders applied:    ${names(await seeder.executed())}`);
        console.info(`Seeders pending:    ${names(await seeder.pending())}`);
        break;
      case "seed":
        console.info(`Seeded: ${names(await seeder.up())}`);
        break;
      case "unseed":
        console.info(`Unseeded: ${names(await seeder.down({ to: 0 }))}`);
        break;
      case "reset":
        if (config.NODE_ENV === "production") throw new Error("reset is disabled in production.");
        await seeder.down({ to: 0 });
        await migrator.down({ to: 0 });
        console.info(`Applied: ${names(await migrator.up())}`);
        console.info(`Seeded: ${names(await seeder.up())}`);
        break;
      case "clear-messages":
        if (config.NODE_ENV === "production") {
          throw new Error("clear-messages is disabled in production.");
        }
        console.info(`Deleted ${await ContactMessage.destroy({ where: {} })} contact messages.`);
        break;
      default:
        throw new Error(USAGE);
    }
  } finally {
    await sequelize.close();
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
