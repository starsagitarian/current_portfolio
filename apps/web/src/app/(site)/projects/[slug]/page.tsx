import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { ProjectSummary } from "@starsagitarian/shared";
import { ProjectArt } from "@/components/projects/ProjectArt";
import { artTransitionName } from "@/components/projects/ProjectTile";
import { GitHubIcon } from "@/components/shell/BrandIcons";
import { getProject, getProjects } from "@/lib/projects";
import "@/components/page/page.css";
import "@/components/projects/projects.css";

/** A page for every project, built ahead; one added later is built on its first visit. */
export async function generateStaticParams() {
  const { projects } = await getProjects();
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (project === null) return { title: "Project not found" };
  return { title: project.title, description: project.summary };
}

/** The projects either side of this one, going round, for the links at the foot of the page. */
function neighbours(projects: ProjectSummary[], slug: string) {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1 || projects.length < 2) return { previous: undefined, next: undefined };
  const at = (i: number) => projects[(i + projects.length) % projects.length];
  return { previous: at(index - 1), next: at(index + 1) };
}

/**
 * One project: what it was, who it was for and what it was built with. The drawing arrives from
 * the tile that was clicked; the write-up sits on dissolving glass.
 */
export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const [project, { projects }] = await Promise.all([getProject(slug), getProjects()]);
  if (project === null) notFound();
  const { previous, next } = neighbours(projects, slug);
  const paragraphs = project.body.split(/\n\s*\n/);

  return (
    <article className="project-page">
      <Link href="/projects" className="back-link veil">
        <ArrowLeft aria-hidden="true" size={18} />
        All projects
      </Link>

      <header className="project-head">
        <div className="page-intro bare rise">
          <p className="project-kicker">{project.organisation ?? "Personal project"}</p>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-lede">{project.summary}</p>
          <ul className="project-tags" aria-label="Tags">
            {project.tags.map((tag) => (
              <li key={tag.slug}>
                <Link href={`/projects?tag=${tag.slug}`} className="veil">
                  {tag.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="project-hero">
          <ViewTransition name={artTransitionName(project.slug)} share="morph" default="none">
            <ProjectArt slug={project.slug} tags={project.tags} variant="hero" />
          </ViewTransition>
        </div>
      </header>

      <div className="project-detail">
        <section className="dissolve project-body" aria-labelledby="about-project">
          <h2 id="about-project" className="project-section-title reveal">
            About the project
          </h2>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="reveal">
              {paragraph}
            </p>
          ))}
        </section>

        <aside className="dissolve project-facts" aria-label="Project facts">
          <section aria-labelledby="built-with">
            <h2 id="built-with" className="project-section-title reveal">
              Built with
            </h2>
            <ul className="chips">
              {project.technologies.map((name) => (
                <li key={name} className="chip">
                  {name}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="see-it">
            <h2 id="see-it" className="project-section-title reveal">
              {project.repoUrl === null && project.liveUrl === null ? "Client work" : "See it"}
            </h2>
            {project.repoUrl === null && project.liveUrl === null ? (
              <p className="project-note reveal">
                This was client work, so the code and the running service stay with the client.
                I&apos;m happy to talk it through.
              </p>
            ) : (
              <div className="project-links">
                {project.liveUrl !== null && (
                  <a
                    className="button button-gold"
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink aria-hidden="true" size={18} />
                    Visit the site<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                {project.repoUrl !== null && (
                  <a
                    className={`button ${project.liveUrl === null ? "button-gold" : ""}`}
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <GitHubIcon size={18} />
                    View the code<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      {previous !== undefined && next !== undefined && (
        <nav className="project-pager" aria-label="More projects">
          <Link href={`/projects/${previous.slug}`} className="pager-link veil">
            <ArrowLeft aria-hidden="true" size={20} />
            <span>
              <span className="pager-label">Previous</span>
              <span className="pager-title">{previous.title}</span>
            </span>
          </Link>
          <Link href={`/projects/${next.slug}`} className="pager-link pager-next veil">
            <ArrowRight aria-hidden="true" size={20} />
            <span>
              <span className="pager-label">Next</span>
              <span className="pager-title">{next.title}</span>
            </span>
          </Link>
        </nav>
      )}
    </article>
  );
}
