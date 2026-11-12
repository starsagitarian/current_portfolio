import { Op, QueryTypes, type Includeable, type Sequelize } from "sequelize";
import { Project, Tag, Technology } from "../db";

export interface ProjectSearch {
  /** Only projects with this tag slug. */
  tag?: string | undefined;
  /** Free text, matched with Postgres full-text search (web-search syntax). */
  q?: string | undefined;
  limit: number;
  offset: number;
}

export interface ProjectPage {
  projects: Project[];
  total: number;
}

const INCLUDE: Includeable[] = [
  { model: Tag, as: "tags", through: { attributes: [] } },
  { model: Technology, as: "technologies", through: { attributes: ["sortOrder"] } },
];

// Published projects matching the optional tag and search text. Values are bound parameters.
const MATCHING = `
  FROM projects p
  WHERE p.published_at IS NOT NULL
    AND p.published_at <= now()
    AND ($tag::text IS NULL OR EXISTS (
      SELECT 1 FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
      WHERE pt.project_id = p.id AND t.slug = $tag::text))
    AND ($q::text IS NULL OR p.search_vector @@ websearch_to_tsquery('english', $q::text))`;

/** Reads projects from PostgreSQL. Drafts and future-dated projects are never returned. */
export class ProjectRepository {
  constructor(private readonly sequelize: Sequelize) {}

  async search({ tag, q, limit, offset }: ProjectSearch): Promise<ProjectPage> {
    const bind = { tag: tag ?? null, q: q ?? null };

    // Best matches first when searching; otherwise the curated order.
    const [rows, counts] = await Promise.all([
      this.sequelize.query<{ id: number }>(
        `SELECT p.id ${MATCHING}
         ORDER BY
           CASE WHEN $q::text IS NULL THEN 0
                ELSE ts_rank(p.search_vector, websearch_to_tsquery('english', $q::text)) END DESC,
           p.sort_order, p.id
         LIMIT $limit OFFSET $offset`,
        { bind: { ...bind, limit, offset }, type: QueryTypes.SELECT },
      ),
      this.sequelize.query<{ total: string }>(`SELECT count(*) AS total ${MATCHING}`, {
        bind,
        type: QueryTypes.SELECT,
      }),
    ]);

    const total = Number(counts[0]?.total ?? 0);
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return { projects: [], total };

    const projects = await Project.findAll({ where: { id: ids }, include: INCLUDE });
    const byId = new Map(projects.map((project) => [project.id, project]));
    return {
      projects: ids.flatMap((id) => byId.get(id) ?? []),
      total,
    };
  }

  findBySlug(slug: string): Promise<Project | null> {
    return Project.findOne({
      where: { slug, publishedAt: { [Op.lte]: new Date() } },
      include: INCLUDE,
    });
  }
}
