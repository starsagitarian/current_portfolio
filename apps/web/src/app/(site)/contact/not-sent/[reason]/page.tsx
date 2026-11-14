import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CONTACT_FAILURES, site, type ContactFailure } from "@starsagitarian/shared";
import { PageIntro } from "@/components/page/PageIntro";
import { LinkedInIcon } from "@/components/shell/BrandIcons";

export const metadata: Metadata = {
  title: "Message not sent",
  robots: { index: false },
};

/** Where a form sent without JavaScript lands when the message did not go through: why. */
const EXPLANATIONS: Record<ContactFailure, string> = {
  invalid:
    "Something in the form wasn’t quite right: a name, an email address that works, and a message are all needed.",
  "bot-check": "The spam check didn’t pass. Please try again, ideally with JavaScript turned on.",
  limited: "You’ve sent several messages in the last hour. Please try again a little later.",
  busy: "Messages sent without JavaScript are limited each day, and today’s are used up. Please turn on JavaScript, or try again tomorrow.",
  unavailable: "The form couldn’t send your message just now. Please try again in a few minutes.",
};

export function generateStaticParams() {
  return CONTACT_FAILURES.map((reason) => ({ reason }));
}

const isFailure = (value: string): value is ContactFailure =>
  (CONTACT_FAILURES as readonly string[]).includes(value);

export default async function MessageNotSentPage({
  params,
}: PageProps<"/contact/not-sent/[reason]">) {
  const { reason } = await params;
  if (!isFailure(reason)) notFound();
  return (
    <PageIntro
      title="Not sent yet"
      lede={
        <>
          {EXPLANATIONS[reason]} Your browser&apos;s Back button should bring back what you wrote.
        </>
      }
    >
      <Link href="/contact" className="button button-gold">
        <ArrowLeft aria-hidden="true" size={20} />
        Back to the form
      </Link>
      <a href={site.links.linkedin} className="button veil" rel="me noopener">
        <LinkedInIcon size={18} />
        LinkedIn
      </a>
    </PageIntro>
  );
}
