import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SceneFigure } from "@/components/character/SceneFigure";
import { PageIntro } from "@/components/page/PageIntro";
import { ProjectBrowser } from "@/components/projects/ProjectBrowser";
import { ProjectGrid } from "@/components/projects/ProjectTile";
import { getProjects, tagsInUse } from "@/lib/projects";
import "@/components/projects/projects.css";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Things Baiju Joseph has built: cloud pipelines, data services and websites for publishers, a weather service and this site.",
};

/**
 * The list with its filter, rendered for each request so the HTML already holds the filtered
 * list (?tag=web): no flash of the wrong projects on a refresh or a shared link. The projects
 * themselves come from the hour-long cache.
 */
async function FilteredProjects() {
  await connection();
  const { projects } = await getProjects();
  return <ProjectBrowser projects={projects} tags={tagsInUse(projects)} />;
}

/** Until the filter is known (and without JavaScript), every project, unfiltered. */
async function AllProjects() {
  const { projects } = await getProjects();
  return <ProjectGrid projects={projects} />;
}

export default function ProjectsPage() {
  return (
    <div className="projects">
      {/* on wide screens, Baiju stands on the promenade in the clear space right of the grid */}
      <SceneFigure media="(min-width: 1600px)" className="page-figure" />
      <PageIntro
        title="Projects"
        lede="What I've built, who it was for, and what it was built with."
      />
      <Suspense fallback={<AllProjects />}>
        <FilteredProjects />
      </Suspense>
    </div>
  );
}
