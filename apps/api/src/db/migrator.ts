import type { QueryInterface, Sequelize, Transaction } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";
import * as initialSchema from "./migrations/0001-initial-schema";
import * as contactBotCheck from "./migrations/0002-contact-bot-check";
import * as portfolioContent from "./seeders/0001-portfolio-content";

export interface StepContext {
  sequelize: Sequelize;
  queryInterface: QueryInterface;
  transaction: Transaction;
}

export interface Step {
  up(context: StepContext): Promise<void>;
  down(context: StepContext): Promise<void>;
}

// Listed explicitly (not globbed) so the bundled production build carries them.
const migrations: readonly (readonly [string, Step])[] = [
  ["0001-initial-schema", initialSchema],
  ["0002-contact-bot-check", contactBotCheck],
];
const seeders: readonly (readonly [string, Step])[] = [
  ["0001-portfolio-content", portfolioContent],
];

function build(sequelize: Sequelize, steps: typeof migrations, tableName: string) {
  const run = (step: Step, direction: "up" | "down") => () =>
    sequelize.transaction(async (transaction) => {
      await step[direction]({
        sequelize,
        queryInterface: sequelize.getQueryInterface(),
        transaction,
      });
    });

  return new Umzug({
    migrations: steps.map(([name, step]) => ({
      name,
      up: run(step, "up"),
      down: run(step, "down"),
    })),
    storage: new SequelizeStorage({ sequelize, tableName }),
    logger: undefined,
  });
}

/** Schema migrations, tracked in `schema_migrations`. Each runs in its own transaction. */
export function createMigrator(sequelize: Sequelize) {
  return build(sequelize, migrations, "schema_migrations");
}

/** Content seeders, tracked separately in `schema_seeds` so they can be undone on their own. */
export function createSeeder(sequelize: Sequelize) {
  return build(sequelize, seeders, "schema_seeds");
}

/**
 * Brings the content (profile, projects, résumé) to exactly what the seed says, whatever is
 * there now: what a deploy runs, so edits to the seed content reach the live site. A seeder runs
 * only once, so `seed` alone would never apply them.
 *
 * Everything happens in one transaction: readers see the old content or the new, never an empty
 * table (the clean-up's table locks hold them back for the moment it takes). Contact messages
 * are not content and are left alone. Afterwards every seeder is recorded as applied, so a later
 * `seed` does nothing. Returns the seeders' names.
 */
export async function syncContent(sequelize: Sequelize): Promise<string[]> {
  await sequelize.transaction(async (transaction) => {
    const context = { sequelize, queryInterface: sequelize.getQueryInterface(), transaction };
    for (const [, step] of [...seeders].reverse()) await step.down(context);
    for (const [, step] of seeders) await step.up(context);
  });
  const storage = new SequelizeStorage({ sequelize, tableName: "schema_seeds" });
  const executed = new Set(await storage.executed());
  for (const [name] of seeders) {
    if (!executed.has(name)) await storage.logMigration({ name });
  }
  return seeders.map(([name]) => name);
}

/**
 * Rolls back the latest migration, or all of them.
 * Seeds are undone first whenever the rollback empties the schema; otherwise
 * `schema_seeds` would still say "seeded" and a later seed run would do nothing.
 */
export async function rollback(
  sequelize: Sequelize,
  { all = false }: { all?: boolean } = {},
): Promise<{ migrations: string[]; seeders: string[] }> {
  const migrator = createMigrator(sequelize);
  const applied = await migrator.executed();
  const emptiesSchema = all || applied.length <= 1;

  const undoneSeeders = emptiesSchema ? await createSeeder(sequelize).down({ to: 0 }) : [];
  const undoneMigrations = await migrator.down(all ? { to: 0 } : undefined);

  return {
    migrations: undoneMigrations.map((m) => m.name),
    seeders: undoneSeeders.map((s) => s.name),
  };
}
