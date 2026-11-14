import type { MetadataRoute } from "next";
import { site } from "@starsagitarian/shared";
import { getProjects } from "@/lib/projects";

/** Every page worth finding, for search engines; the projects come from the API (or its copy). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await getProjects();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${site.url}${path}`,
    changeFrequency: "monthly",
    priority,
  });
  return [
    page("/", 1),
    page("/resume", 0.9),
    page("/projects", 0.8),
    ...projects.map((project) => ({
      ...page(`/projects/${project.slug}`, 0.7),
      lastModified: project.publishedAt,
    })),
    page("/contact", 0.6),
    page("/credits", 0.2),
  ];
}
