import { site } from "@starsagitarian/shared";
import { ScenePlates } from "@/components/scene/ScenePlates";

const link =
  "rounded-full bg-accent px-5 py-2 font-semibold text-accent-ink shadow-sm transition hover:-translate-y-0.5";

// Placeholder until the home page proper (SP-14): the painted London scene in the light of the
// window width, with a card that follows the same light.
export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <ScenePlates />
      <div className="surface relative flex max-w-lg flex-col items-center gap-5 rounded-3xl px-8 py-10 text-center">
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
            GitHub
          </a>
          <a className={link} href={site.links.linkedin} rel="me noopener">
            LinkedIn
          </a>
        </nav>
      </div>
    </main>
  );
}
