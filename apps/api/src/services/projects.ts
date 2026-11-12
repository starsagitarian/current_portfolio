import type {
  ProjectDetail,
  ProjectList,
  ProjectListQuery,
  ProjectSummary,
} from "@starsagitarian/shared";
import type { Project, ProjectTechnology, Technology } from "../db";
import type { ProjectRepository } from "../repositories/projects";

type TechnologyRow = Technology & { ProjectTechnology?: ProjectTechnology };

/** Technologies in the order written for the project, then by name. */
function technologyNames(project: Project): string[] {
  const rows = (project.technologies ?? []) as TechnologyRow[];
  return [...rows]
    .sort(
      (a, b) =>
        (a.ProjectTechnology?.sortOrder ?? 0) - (b.ProjectTechnology?.sortOrder ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .map((tech) => tech.name);
}

function toSummary(project: Project): ProjectSummary {
  return {
    slug: project.slug,
    title: project.title,
    organisation: project.organisation,
    summary: project.summary,
    featured: project.featured,
    tags: [...(project.tags ?? [])]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ slug, label }) => ({ slug, label })),
    technologies: technologyNames(project),
    repoUrl: project.repoUrl,
    liveUrl: project.liveUrl,
    coverImage: project.coverImage,
    // Only published projects reach this point.
    publishedAt: (project.publishedAt ?? new Date(0)).toISOString(),
  };
}

/** Turns stored projects into the shapes the API publishes. */
export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async list({ tag, q, page, pageSize }: ProjectListQuery): Promise<ProjectList> {
    const { projects, total } = await this.repository.search({
      tag,
      q,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return {
      items: projects.map(toSummary),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(slug: string): Promise<ProjectDetail | undefined> {
    const project = await this.repository.findBySlug(slug);
    return project ? { ...toSummary(project), body: project.body } : undefined;
  }
}
