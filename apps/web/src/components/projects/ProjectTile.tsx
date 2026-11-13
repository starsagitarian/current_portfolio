import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight, Star } from "lucide-react";
import type { ProjectSummary } from "@starsagitarian/shared";
import { ProjectArt } from "./ProjectArt";

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

/** The tiles in a grid; each one keeps its identity as the filter adds and removes others. */
export function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="project-grid">
      {projects.map((project) => (
        <ViewTransition
          key={project.slug}
          name={`project-tile-${project.slug}`}
          enter={{ filter: "tile-in", default: "none" }}
          exit={{ filter: "tile-out", default: "none" }}
          update={{ filter: "tile-move", default: "none" }}
          share={{ filter: "tile-move", default: "none" }}
          default="none"
        >
          <li className="project-cell">
            <ProjectTile project={project} />
          </li>
        </ViewTransition>
      ))}
    </ul>
  );
}
