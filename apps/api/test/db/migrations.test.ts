import { QueryTypes, type Sequelize } from "sequelize";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigrator, createSeeder, Project, rollback } from "../../src/db";
import { connect } from "./helpers";

const TABLES = [
  "certifications",
  "contact_messages",
  "education",
  "experiences",
  "profiles",
  "project_tags",
  "project_technologies",
  "projects",
  "skills",
  "tags",
  "technologies",
];

let sequelize: Sequelize;

async function userTables(): Promise<string[]> {
  const rows = await sequelize.query<{ table_name: string }>(
    `SELECT table_name::text AS table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name NOT LIKE 'schema_%' ORDER BY table_name`,
    { type: QueryTypes.SELECT },
  );
  return rows.map((row) => row.table_name);
}

beforeAll(async () => {
  sequelize = connect();
  await createSeeder(sequelize).down({ to: 0 });
  await createMigrator(sequelize).down({ to: 0 });
});

afterAll(async () => {
  await sequelize.close();
});

describe("migrations", () => {
  it("create every table on the way up", async () => {
    const applied = await createMigrator(sequelize).up();

    expect(applied.map((m) => m.name)).toEqual(["0001-initial-schema", "0002-contact-bot-check"]);
    expect(await userTables()).toEqual(TABLES);
    expect(await createMigrator(sequelize).pending()).toEqual([]);
  });

  it("are a no-op when already applied", async () => {
    expect(await createMigrator(sequelize).up()).toEqual([]);
  });

  it("drop every table on the way down, and can go up again", async () => {
    await createMigrator(sequelize).down({ to: 0 });
    expect(await userTables()).toEqual([]);

    await createMigrator(sequelize).up();
    expect(await userTables()).toEqual(TABLES);
  });

  it("undo seeds when a rollback empties the schema, so the next seed run is not skipped", async () => {
    await createSeeder(sequelize).up();

    const undone = await rollback(sequelize, { all: true });
    expect(undone).toEqual({
      migrations: ["0002-contact-bot-check", "0001-initial-schema"],
      seeders: ["0001-portfolio-content"],
    });
    expect(await createSeeder(sequelize).executed()).toEqual([]);

    await createMigrator(sequelize).up();
    expect((await createSeeder(sequelize).up()).map((s) => s.name)).toEqual([
      "0001-portfolio-content",
    ]);
    expect(await Project.count()).toBeGreaterThan(0);

    await createSeeder(sequelize).down({ to: 0 });
  });

  it("index projects for full-text search", async () => {
    const [index] = await sequelize.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'projects_search_idx'`,
      { type: QueryTypes.SELECT },
    );
    expect(index?.indexdef).toContain("USING gin (search_vector)");
  });

  it("enforce constraints in the database, not just in code", async () => {
    await expect(
      sequelize.query(
        `INSERT INTO profiles (id, name, title, location, tagline, summary) VALUES (2, 'a', 'b', 'c', 'd', 'e')`,
      ),
    ).rejects.toThrow(/profiles_single_row/);

    await expect(
      sequelize.query(`INSERT INTO tags (slug, label) VALUES ('Not A Slug', 'x')`),
    ).rejects.toThrow(/tags_slug_format/);

    await expect(
      sequelize.query(
        `INSERT INTO experiences (organisation, role, location, start_date, end_date)
         VALUES ('a', 'b', 'c', '2020-01-01', '2019-01-01')`,
      ),
    ).rejects.toThrow(/experiences_dates_ordered/);

    await expect(
      sequelize.query(
        `INSERT INTO contact_messages (name, email, message, ip_hash) VALUES ('a', 'b', '', repeat('0', 64))`,
      ),
    ).rejects.toThrow(/contact_messages_message_length/);
  });
});
