import { cacheLife } from "next/cache";
import {
  ProjectDetailSchema,
  ProjectListSchema,
  PROJECTS_PAGE_SIZE,
  ProjectSummarySchema,
  type ProjectDetail,
  type ProjectSummary,
  type Tag,
} from "@starsagitarian/shared";
import snapshot from "../content/projects.snapshot.json";
import { apiUrl } from "./api";

type Fetcher = (url: string) => Promise<Response>;

/** The copy bundled with the site, for when the API cannot be reached. */
const bundled = (): ProjectDetail[] => ProjectDetailSchema.array().parse(snapshot);

/** A project without its write-up, as the list has it. */
const summaryOf = (project: ProjectDetail): ProjectSummary => ProjectSummarySchema.parse(project);

export interface LoadedProjects {
  projects: ProjectSummary[];
  /** False when the API could not be reached and the bundled copy is shown instead. */
  live: boolean;
}

/**
 * Every published project, in the curated order, from the API, or from the copy bundled with
 * the site when the API is down, answers badly or is not running at build time.
 */
export async function loadProjects(fetcher: Fetcher, base: string): Promise<LoadedProjects> {
  try {
    const res = await fetcher(`${base}/v1/projects?pageSize=${PROJECTS_PAGE_SIZE.max}`);
    if (!res.ok) throw new Error(`the API answered ${res.status}`);
    return { projects: ProjectListSchema.parse(await res.json()).items, live: true };
  } catch (error) {
    console.warn(`Projects: showing the bundled list (${String(error)}).`);
    return { projects: bundled().map(summaryOf), live: false };
  }
}

/**
 * One project with its write-up. Null when the API says there is no such project; the bundled
 * copy when the API cannot answer.
 */
export async function loadProject(
  fetcher: Fetcher,
  base: string,
  slug: string,
): Promise<ProjectDetail | null> {
  try {
    const res = await fetcher(`${base}/v1/projects/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`the API answered ${res.status}`);
    return ProjectDetailSchema.parse(await res.json());
  } catch (error) {
    console.warn(`Project ${slug}: showing the bundled copy (${String(error)}).`);
    return bundled().find((project) => project.slug === slug) ?? null;
  }
}

/** The tags in use, A to Z, with how many projects carry each. */
export function tagsInUse(projects: ProjectSummary[]): (Tag & { count: number })[] {
  const counts = new Map<string, Tag & { count: number }>();
  for (const tag of projects.flatMap((project) => project.tags)) {
    const entry = counts.get(tag.slug) ?? { ...tag, count: 0 };
    entry.count += 1;
    counts.set(tag.slug, entry);
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Gives up after five seconds, so a sleeping database cannot hold a page back for long. */
const timedFetch: Fetcher = (url) => fetch(url, { signal: AbortSignal.timeout(5_000) });

/**
 * The projects, cached for an hour like the résumé: the CDN serves the pages and the database is
 * asked about once an hour at most.
 */
export async function getProjects(): Promise<LoadedProjects> {
  "use cache";
  cacheLife("hours");
  return loadProjects(timedFetch, apiUrl());
}

export async function getProject(slug: string): Promise<ProjectDetail | null> {
  "use cache";
  cacheLife("hours");
  return loadProject(timedFetch, apiUrl(), slug);
}
