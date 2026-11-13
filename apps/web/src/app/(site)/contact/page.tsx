import type { Metadata } from "next";
import { site } from "@starsagitarian/shared";
import { GitHubIcon, LinkedInIcon } from "@/components/shell/BrandIcons";

export const metadata: Metadata = { title: "Contact" };

const link =
  "inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-semibold text-accent-ink shadow-sm";

// Placeholder: the contact form arrives in SP-17.
export default function ContactPage() {
  return (
    <section className="m-auto flex w-full max-w-lg flex-col gap-4 rounded-3xl px-8 py-10 surface">
      <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
      <p className="text-ink-muted">
        A contact form is on its way. Until then, you can find me on GitHub and LinkedIn.
      </p>
      <p className="flex gap-3">
        <a className={link} href={site.links.github} rel="me noopener">
          <GitHubIcon size={18} />
          GitHub
        </a>
        <a className={link} href={site.links.linkedin} rel="me noopener">
          <LinkedInIcon size={18} />
          LinkedIn
        </a>
      </p>
    </section>
  );
}
