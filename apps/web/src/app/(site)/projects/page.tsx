import type { Metadata } from "next";
import { PageIntro } from "@/components/page/PageIntro";

export const metadata: Metadata = { title: "Projects" };

// Placeholder: the projects arrive in SP-16.
export default function ProjectsPage() {
  return (
    <PageIntro
      title="Projects"
      lede="A few things I've built are on their way: what, for whom, and with what."
    />
  );
}
