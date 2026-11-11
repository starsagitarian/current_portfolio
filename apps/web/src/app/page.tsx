import { site } from "@starsagitarian/shared";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-ink/70 uppercase">{site.brand}</p>
      <h1 className="text-5xl font-bold tracking-tight text-ink sm:text-7xl">{site.name}</h1>
      <p className="text-lg text-ink/80 sm:text-2xl">{site.title}</p>
      <p className="max-w-md text-base text-ink/70">
        A new portfolio is on its way: an illustrated London, from daylight to blue hour.
      </p>
      <nav aria-label="Profiles" className="flex gap-3">
        <a
          className="rounded-full bg-card px-5 py-2 font-medium text-ink shadow-sm transition hover:-translate-y-0.5"
          href={site.links.github}
          rel="me noopener"
        >
          GitHub
        </a>
        <a
          className="rounded-full bg-card px-5 py-2 font-medium text-ink shadow-sm transition hover:-translate-y-0.5"
          href={site.links.linkedin}
          rel="me noopener"
        >
          LinkedIn
        </a>
      </nav>
    </main>
  );
}
