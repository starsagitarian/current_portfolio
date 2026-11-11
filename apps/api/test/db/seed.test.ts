import { createHash } from "node:crypto";
import { QueryTypes, type Sequelize } from "sequelize";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  Certification,
  ContactMessage,
  createSeeder,
  Education,
  Experience,
  Profile,
  Project,
  ProjectTechnology,
  Skill,
  Tag,
  Technology,
} from "../../src/db";
import * as content from "../../src/db/seeders/content";
import { connect, resetDatabase } from "./helpers";

let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = connect();
  await resetDatabase(sequelize);
});

afterAll(async () => {
  await sequelize.close();
});

describe("portfolio seed", () => {
  it("loads every piece of content", async () => {
    expect(await Profile.count()).toBe(1);
    expect(await Project.count()).toBe(content.projects.length);
    expect(await Tag.count()).toBe(content.tags.length);
    expect(await Experience.count()).toBe(content.experiences.length);
    expect(await Certification.count()).toBe(3);
    expect(await Education.count()).toBe(2);
    expect(await Skill.count()).toBe(Object.values(content.skills).flat().length);
    expect(await Technology.count()).toBe(
      new Set(content.projects.flatMap((p) => p.technologies)).size,
    );
  });

  it("links projects to their tags and technologies in order", async () => {
    const project = await Project.findOne({
      where: { slug: "lightning-observation" },
      include: [
        { model: Tag, as: "tags" },
        { model: Technology, as: "technologies" },
      ],
      order: [[{ model: Technology, as: "technologies" }, ProjectTechnology, "sortOrder", "ASC"]],
    });

    expect(project?.title).toBe("Lightning observation");
    expect(project?.organisation).toBe("Met Office");
    expect(project?.tags?.map((t) => t.slug).sort()).toEqual(["cloud", "data"]);
    expect(project?.technologies?.[0]?.name).toBe("Python");
  });

  it("finds projects with ranked full-text search", async () => {
    const rows = await sequelize.query<{ slug: string }>(
      `SELECT slug FROM projects
       WHERE search_vector @@ websearch_to_tsquery('english', :q)
       ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', :q)) DESC`,
      { replacements: { q: "lightning" }, type: QueryTypes.SELECT },
    );
    expect(rows[0]?.slug).toBe("lightning-observation");

    const pipelines = await sequelize.query<{ slug: string }>(
      `SELECT slug FROM projects WHERE search_vector @@ websearch_to_tsquery('english', 'ONIX pipelines')`,
      { type: QueryTypes.SELECT },
    );
    expect(pipelines.map((r) => r.slug)).toEqual(["book-content-pipelines"]);
  });

  it("can be undone and re-applied without touching contact messages", async () => {
    await ContactMessage.create({
      name: "Visitor",
      email: "visitor@example.com",
      message: "Hello",
      ipHash: "0".repeat(64),
      userAgent: null,
    });

    await createSeeder(sequelize).down({ to: 0 });
    expect(await Project.count()).toBe(0);
    expect(await ContactMessage.count()).toBe(1);

    await createSeeder(sequelize).up();
    expect(await Project.count()).toBe(content.projects.length);
  });
});

describe("publishing guard", () => {
  // SHA-256 of phrases that must never be published (agreed 11 Nov 2026). Stored as hashes
  // so the repository itself never contains them.
  const BLOCKED_PHRASE_HASHES = new Set([
    "84a6316766620d637f3b1f6b0f679964b65500ad3cc2bda52b3106174fbc7e3e",
    "b47ff3539cd686bd0bea570950571a1a96706b2a0c87a9434db7a4d612565aa8",
    "e561a0b11afc91a1a9288f4d76b2815bdb045ba4cb9c4db4e9af55f7158e77d3",
    "213f67768585260948e5554d4e2d180e1f08cd0815d04dfcc9103295f93251b7",
    "23e8cc9b2e9cefca7fa7847228bdfd4c5612280dc0bb088fdfb4ffd6fa6acffa",
    "c847afc45b20de017c746a673d9cc387393b121e6771b3a372479433469b7fd6",
  ]);

  /** Every run of 1 to 3 consecutive words, lower-cased, hashed. */
  function phraseHashes(text: string): Set<string> {
    const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const hashes = new Set<string>();
    for (let start = 0; start < words.length; start++) {
      for (let length = 1; length <= 3 && start + length <= words.length; length++) {
        const phrase = words.slice(start, start + length).join(" ");
        hashes.add(createHash("sha256").update(phrase).digest("hex"));
      }
    }
    return hashes;
  }

  it("finds a phrase of up to three words in running text (self-check of the guard)", () => {
    const target = createHash("sha256").update("quiet river bank").digest("hex");
    expect(phraseHashes("A walk along the Quiet, river-bank path").has(target)).toBe(true);
    expect(phraseHashes("A river walk").has(target)).toBe(false);
  });

  it("keeps blocked phrases out of every seeded text", async () => {
    const dump = JSON.stringify(
      await Promise.all([
        Profile.findAll({ raw: true }),
        Project.findAll({ raw: true }),
        Experience.findAll({ raw: true }),
        Skill.findAll({ raw: true }),
        Certification.findAll({ raw: true }),
        Education.findAll({ raw: true }),
        Technology.findAll({ raw: true }),
      ]),
    );
    const found = [...phraseHashes(dump)].filter((hash) => BLOCKED_PHRASE_HASHES.has(hash));
    expect(found).toEqual([]);
  });
});
