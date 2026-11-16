import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight, Star } from "lucide-react";
import type { ProjectSummary } from "@starsagitarian/shared";
import { ProjectArt } from "./ProjectArt";
import { TileGrid, type ProjectItem } from "./TileGrid";

/** The name a project's drawing carries from its tile to the top of its own page. */
export const artTransitionName = (slug: string) => `project-art-${slug}`;

/**
 * One project in the list: its drawing, who it was for, what it is, and its tags, on a pane of
 * glass. The whole tile is one link (the title's, stretched), so there is a single tab stop.
 */
export function ProjectTile({ project }: { project: ProjectSummary }) {
  return (
    <article className="project-tile">
      <ViewTransition name={artTransitionName(project.slug)} share="morph" default="none">
        <ProjectArt slug={project.slug} tags={project.tags} variant="tile" />
      </ViewTransition>
      {project.featured && (
        <span className="tile-badge">
          <Star aria-hidden="true" size={13} strokeWidth={2.5} />
          Featured
        </span>
      )}
      <div className="tile-body">
        <p className="tile-org">{project.organisation ?? "Personal project"}</p>
        <h2 className="tile-title">
          <Link href={`/projects/${project.slug}`} className="tile-link">
            {project.title}
          </Link>
        </h2>
        <p className="tile-summary">{project.summary}</p>
        <div className="tile-foot">
          <ul className="tile-tags" aria-label="Tags">
            {project.tags.map((tag) => (
              <li key={tag.slug}>{tag.label}</li>
            ))}
          </ul>
          <ArrowRight aria-hidden="true" className="tile-arrow" size={20} />
        </div>
      </div>
    </article>
  );
}

/** The projects as the grid takes them: each tile drawn here, on the server. */
export function projectItems(projects: ProjectSummary[]): ProjectItem[] {
  return projects.map((project) => ({
    slug: project.slug,
    tags: project.tags.map((tag) => tag.slug),
    tile: <ProjectTile project={project} />,
  }));
}

/** Every project, unfiltered (until the filter is known, and without JavaScript). */
export function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  return <TileGrid items={projectItems(projects)} />;
}
