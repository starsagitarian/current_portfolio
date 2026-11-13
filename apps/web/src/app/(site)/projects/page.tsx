import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projects" };

// Placeholder: the projects arrive in SP-16.
export default function ProjectsPage() {
  return (
    <section className="m-auto flex w-full max-w-lg flex-col gap-4 rounded-3xl px-8 py-10 surface">
      <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
      <p className="text-ink-muted">
        The projects are on their way: what I built, for whom, and with what.
      </p>
    </section>
  );
}
