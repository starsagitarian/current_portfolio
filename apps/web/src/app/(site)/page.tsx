import { site } from "@starsagitarian/shared";
import { GitHubIcon, LinkedInIcon } from "@/components/shell/BrandIcons";

const link =
  "inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-semibold text-accent-ink shadow-sm transition hover:-translate-y-0.5";

// Placeholder until the home page proper (SP-14).
export default function Home() {
  return (
    <section className="m-auto flex w-full max-w-lg flex-col items-center gap-5 rounded-3xl px-8 py-10 text-center surface">
      <p className="text-xs font-semibold tracking-[0.3em] text-ink-muted uppercase">
        {site.brand}
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{site.name}</h1>
      <p className="text-lg sm:text-2xl">{site.title}</p>
      <p className="max-w-md text-base text-ink-muted">
        A new portfolio is on its way: an illustrated London, from daylight to blue hour.
      </p>
      <nav aria-label="Profiles" className="flex gap-3">
        <a className={link} href={site.links.github} rel="me noopener">
          <GitHubIcon size={18} />
          GitHub
        </a>
        <a className={link} href={site.links.linkedin} rel="me noopener">
          <LinkedInIcon size={18} />
          LinkedIn
        </a>
      </nav>
    </section>
  );
}
