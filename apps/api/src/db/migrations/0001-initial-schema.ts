import { DataTypes, literal, type QueryInterface, type Transaction } from "sequelize";
import type { StepContext } from "../migrator";

const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal("now()") },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal("now()") },
};
const pk = { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false };
const sortOrder = { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 };

function sql(queryInterface: QueryInterface, transaction: Transaction, statement: string) {
  return queryInterface.sequelize.query(statement, { transaction });
}

export async function up({ queryInterface, transaction }: StepContext): Promise<void> {
  const opts = { transaction };

  await queryInterface.createTable(
    "profiles",
    {
      id: pk,
      name: { type: DataTypes.STRING(100), allowNull: false },
      title: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: false },
      tagline: { type: DataTypes.STRING(200), allowNull: false },
      summary: { type: DataTypes.TEXT, allowNull: false },
      ...timestamps,
    },
    opts,
  );
  // One profile only: the site is about one person.
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE profiles ADD CONSTRAINT profiles_single_row CHECK (id = 1)`,
  );

  await queryInterface.createTable(
    "tags",
    {
      id: pk,
      slug: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      label: { type: DataTypes.STRING(60), allowNull: false },
      ...timestamps,
    },
    opts,
  );
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE tags ADD CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
  );

  await queryInterface.createTable(
    "technologies",
    {
      id: pk,
      name: { type: DataTypes.STRING(60), allowNull: false },
      ...timestamps,
    },
    opts,
  );
  // Case-insensitive uniqueness: "PostgreSQL" and "postgresql" are the same technology.
  await sql(
    queryInterface,
    transaction,
    `CREATE UNIQUE INDEX technologies_name_lower_key ON technologies (lower(name))`,
  );

  await queryInterface.createTable(
    "projects",
    {
      id: pk,
      slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      title: { type: DataTypes.STRING(120), allowNull: false },
      organisation: { type: DataTypes.STRING(120), allowNull: true },
      summary: { type: DataTypes.STRING(300), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      repo_url: { type: DataTypes.STRING(300), allowNull: true },
      live_url: { type: DataTypes.STRING(300), allowNull: true },
      cover_image: { type: DataTypes.STRING(200), allowNull: true },
      featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: sortOrder,
      published_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    },
    opts,
  );
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE projects ADD CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
  );
  // Full-text search: title outranks summary, which outranks body. Postgres keeps it current.
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE projects ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
       setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
       setweight(to_tsvector('english', coalesce(organisation, '')), 'B') ||
       setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
       setweight(to_tsvector('english', coalesce(body, '')), 'C')
     ) STORED`,
  );
  await sql(
    queryInterface,
    transaction,
    `CREATE INDEX projects_search_idx ON projects USING GIN (search_vector)`,
  );
  await queryInterface.addIndex("projects", ["published_at", "sort_order"], {
    name: "projects_listing_idx",
    ...opts,
  });

  const projectRef = {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: { model: "projects", key: "id" },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  };

  await queryInterface.createTable(
    "project_tags",
    {
      project_id: projectRef,
      tag_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "tags", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    opts,
  );
  await queryInterface.addIndex("project_tags", ["tag_id"], {
    name: "project_tags_tag_idx",
    ...opts,
  });

  await queryInterface.createTable(
    "project_technologies",
    {
      project_id: projectRef,
      technology_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "technologies", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      sort_order: sortOrder,
    },
    opts,
  );
  await queryInterface.addIndex("project_technologies", ["technology_id"], {
    name: "project_technologies_technology_idx",
    ...opts,
  });

  await queryInterface.createTable(
    "experiences",
    {
      id: pk,
      organisation: { type: DataTypes.STRING(120), allowNull: false },
      role: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      highlights: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      sort_order: sortOrder,
      ...timestamps,
    },
    opts,
  );
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE experiences ADD CONSTRAINT experiences_dates_ordered CHECK (end_date IS NULL OR end_date >= start_date)`,
  );
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE experiences ADD CONSTRAINT experiences_highlights_array CHECK (jsonb_typeof(highlights) = 'array')`,
  );

  await queryInterface.createTable(
    "skills",
    {
      id: pk,
      name: { type: DataTypes.STRING(60), allowNull: false },
      category: { type: DataTypes.STRING(60), allowNull: false },
      sort_order: sortOrder,
      ...timestamps,
    },
    opts,
  );
  await queryInterface.addIndex("skills", ["category", "name"], {
    name: "skills_category_name_key",
    unique: true,
    ...opts,
  });

  await queryInterface.createTable(
    "certifications",
    {
      id: pk,
      name: { type: DataTypes.STRING(150), allowNull: false },
      issuer: { type: DataTypes.STRING(100), allowNull: false },
      issued_on: { type: DataTypes.DATEONLY, allowNull: false },
      credential_url: { type: DataTypes.STRING(300), allowNull: true },
      sort_order: sortOrder,
      ...timestamps,
    },
    opts,
  );

  await queryInterface.createTable(
    "education",
    {
      id: pk,
      institution: { type: DataTypes.STRING(150), allowNull: false },
      qualification: { type: DataTypes.STRING(150), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: true },
      end_year: { type: DataTypes.SMALLINT, allowNull: true },
      sort_order: sortOrder,
      ...timestamps,
    },
    opts,
  );

  await queryInterface.createTable(
    "contact_messages",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
      },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      ip_hash: { type: DataTypes.CHAR(64), allowNull: false },
      user_agent: { type: DataTypes.STRING(300), allowNull: true },
      created_at: timestamps.created_at,
    },
    opts,
  );
  await sql(
    queryInterface,
    transaction,
    `ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_message_length CHECK (char_length(message) BETWEEN 1 AND 5000)`,
  );
  // Serves both the per-sender rate limit and the 12-month retention sweep.
  await queryInterface.addIndex("contact_messages", ["ip_hash", "created_at"], {
    name: "contact_messages_rate_idx",
    ...opts,
  });
  await queryInterface.addIndex("contact_messages", ["created_at"], {
    name: "contact_messages_created_idx",
    ...opts,
  });
}

export async function down({ queryInterface, transaction }: StepContext): Promise<void> {
  for (const table of [
    "contact_messages",
    "education",
    "certifications",
    "skills",
    "experiences",
    "project_technologies",
    "project_tags",
    "projects",
    "technologies",
    "tags",
    "profiles",
  ]) {
    await queryInterface.dropTable(table, { transaction });
  }
}
