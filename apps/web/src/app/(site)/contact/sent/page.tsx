import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/page/PageIntro";

export const metadata: Metadata = {
  title: "Message sent",
  robots: { index: false },
};

/** Where a form sent without JavaScript lands when the message went through. */
export default function MessageSentPage() {
  return (
    <PageIntro
      title="Thank you"
      lede="Your message is on its way, and I’ll reply soon. In the meantime, have a look around."
    >
      <Link href="/projects" className="button button-gold">
        See my projects
        <ArrowRight aria-hidden="true" size={20} />
      </Link>
      <Link href="/resume" className="button veil">
        Read my résumé
      </Link>
    </PageIntro>
  );
}
