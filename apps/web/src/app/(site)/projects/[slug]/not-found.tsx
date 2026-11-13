import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageIntro } from "@/components/page/PageIntro";

/** A project link that leads nowhere: say so, and offer the list. */
export default function ProjectNotFound() {
  return (
    <PageIntro
      title="Project not found"
      lede="That project isn't here, or has moved. The rest are a tap away."
    >
      <Link href="/projects" className="button button-gold">
        <ArrowLeft aria-hidden="true" size={20} />
        All projects
      </Link>
    </PageIntro>
  );
}
