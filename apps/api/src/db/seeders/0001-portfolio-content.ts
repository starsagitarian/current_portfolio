import {
  Certification,
  Education,
  Experience,
  initModels,
  Profile,
  Project,
  ProjectTag,
  ProjectTechnology,
  Skill,
  Tag,
  Technology,
} from "../models";
import type { StepContext } from "../migrator";
import * as content from "./content";

/** Fixed so re-seeding gives identical data. */
const PUBLISHED_AT = new Date("2026-11-11T00:00:00Z");

export async function up({ sequelize, transaction }: StepContext): Promise<void> {
  initModels(sequelize);
  const opts = { transaction };

  await Profile.create({ id: 1, ...content.profile }, opts);

  const tags = await Tag.bulkCreate([...content.tags], { ...opts, returning: true });
  const tagIds = new Map(tags.map((tag) => [tag.slug, tag.id]));

  const techNames = [...new Set(content.projects.flatMap((p) => p.technologies))];
  const technologies = await Technology.bulkCreate(
    techNames.map((name) => ({ name })),
    { ...opts, returning: true },
  );
  const techIds = new Map(technologies.map((tech) => [tech.name, tech.id]));

  for (const [index, seed] of content.projects.entries()) {
    const project = await Project.create(
      {
        slug: seed.slug,
        title: seed.title,
        organisation: seed.organisation,
        summary: seed.summary,
        body: seed.body,
        repoUrl: seed.repoUrl,
        liveUrl: null,
        coverImage: null,
        featured: seed.featured,
        sortOrder: index,
        publishedAt: PUBLISHED_AT,
      },
      opts,
    );

    await ProjectTag.bulkCreate(
      seed.tags.map((slug) => ({ projectId: project.id, tagId: lookup(tagIds, slug) })),
      opts,
    );
    await ProjectTechnology.bulkCreate(
      seed.technologies.map((name, order) => ({
        projectId: project.id,
        technologyId: lookup(techIds, name),
        sortOrder: order,
      })),
      opts,
    );
  }

  await Experience.bulkCreate(
    content.experiences.map((experience, index) => ({ ...experience, sortOrder: index })),
    opts,
  );

  await Skill.bulkCreate(
    Object.entries(content.skills).flatMap(([category, names]) =>
      names.map((name, index) => ({ category, name, sortOrder: index })),
    ),
    opts,
  );

  await Certification.bulkCreate(
    content.certifications.map((cert, index) => ({
      ...cert,
      credentialUrl: null,
      sortOrder: index,
    })),
    opts,
  );

  await Education.bulkCreate(
    content.education.map((item, index) => ({ ...item, sortOrder: index })),
    opts,
  );
}

export async function down({ queryInterface, transaction }: StepContext): Promise<void> {
  // Contact messages are visitor data, not seed content, so they are left alone.
  await queryInterface.sequelize.query(
    `TRUNCATE profiles, tags, technologies, projects, project_tags, project_technologies,
       experiences, skills, certifications, education RESTART IDENTITY CASCADE`,
    { transaction },
  );
}

function lookup(ids: Map<string, number>, key: string): number {
  const id = ids.get(key);
  if (id === undefined) throw new Error(`Seed data references unknown key "${key}"`);
  return id;
}
