import type { ProjectDetail } from "@starsagitarian/shared";
import * as content from "./content";

const tagLabels = new Map<string, string>(content.tags.map((tag) => [tag.slug, tag.label]));

/**
 * The seeded projects in the shape GET /v1/projects/:slug publishes, in their curated order. The
 * web app keeps a copy as its fallback for when the API cannot be reached (see
 * scripts/content-snapshot.ts), and tests check that the API serves exactly this.
 */
export function projectsFromSeed(): ProjectDetail[] {
  return content.projects.map((seed) => ({
    slug: seed.slug,
    title: seed.title,
    organisation: seed.organisation,
    summary: seed.summary,
    featured: seed.featured,
    // the API lists a project's tags by label
    tags: seed.tags
      .map((slug) => ({ slug, label: tagLabels.get(slug) ?? slug }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    technologies: seed.technologies,
    repoUrl: seed.repoUrl,
    liveUrl: null,
    coverImage: null,
    publishedAt: content.projectsPublishedAt,
    body: seed.body,
  }));
}
