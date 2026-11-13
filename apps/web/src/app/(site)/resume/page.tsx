import type { Metadata } from "next";
import { PageIntro } from "@/components/page/PageIntro";

export const metadata: Metadata = { title: "Résumé" };

// Placeholder: the résumé arrives in SP-15.
export default function ResumePage() {
  return (
    <PageIntro
      title="Résumé"
      lede="Experience, skills and certifications are on their way, with a CV to download."
    />
  );
}
