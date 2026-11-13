import type { Metadata } from "next";

export const metadata: Metadata = { title: "Résumé" };

// Placeholder: the résumé arrives in SP-15.
export default function ResumePage() {
  return (
    <section className="m-auto flex w-full max-w-lg flex-col gap-4 rounded-3xl px-8 py-10 surface">
      <h1 className="text-4xl font-bold tracking-tight">Résumé</h1>
      <p className="text-ink-muted">
        My résumé is on its way: experience, skills and certifications, with a CV to download.
      </p>
    </section>
  );
}
