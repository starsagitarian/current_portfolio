import { site } from "@starsagitarian/shared";
import { getProject, getProjects } from "@/lib/projects";
import { SHARE_SIZE, SHARE_TYPE, shareCard } from "@/seo/share-card";

export const alt = `A project by ${site.name}`;
export const size = SHARE_SIZE;
export const contentType = SHARE_TYPE;

export async function generateStaticParams() {
  const { projects } = await getProjects();
  return projects.map(({ slug }) => ({ slug }));
}

/** Each project's own preview: who it was for, its title and its summary. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProject((await params).slug);
  if (project === null)
    return shareCard({ kicker: "Projects", title: "Project not found", lede: site.tagline });
  return shareCard({
    kicker: project.organisation ?? "Personal project",
    title: project.title,
    lede: project.summary,
  });
}
