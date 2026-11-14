import type { Metadata } from "next";
import { site } from "@starsagitarian/shared";
import { connection } from "next/server";
import { Suspense } from "react";
import { SceneFigure } from "@/components/character/SceneFigure";
import { PageIntro } from "@/components/page/PageIntro";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { ProjectBrowser } from "@/components/projects/ProjectBrowser";
import { ProjectGrid } from "@/components/projects/ProjectTile";
import { getProjects, tagsInUse } from "@/lib/projects";
import { JsonLd } from "@/seo/JsonLd";
import { pageMetadata } from "@/seo/metadata";
import { PERSON_ID } from "@/seo/schema";
import "@/components/projects/projects.css";

export const metadata: Metadata = pageMetadata({
  title: "Projects",
  description:
    "Things Baiju Joseph has built: cloud pipelines, data services and websites for publishers, a weather service and this site.",
  path: "/projects",
});

/** The list for search engines: a collection page naming each project. */
async function ProjectsJsonLd() {
  const { projects } = await getProjects();
  return (
    <JsonLd
      data={{
        "@type": "CollectionPage",
        name: "Projects",
        url: `${site.url}/projects`,
        author: { "@id": PERSON_ID },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: projects.map((project, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${site.url}/projects/${project.slug}`,
            name: project.title,
          })),
        },
      }}
    />
  );
}

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
      <ProjectsJsonLd />
      {/* on wide screens, Baiju stands on the promenade in the clear space right of the grid */}
      <SceneFigure media="(min-width: 1600px)" className="page-figure" />
      <PageIntro
        title="Projects"
        lede="What I've built, who it was for, and what it was built with."
      />
      <Suspense fallback={<AllProjects />}>
        <FilteredProjects />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
