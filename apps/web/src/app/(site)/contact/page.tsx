import type { Metadata } from "next";
import { site } from "@starsagitarian/shared";
import { PageIntro } from "@/components/page/PageIntro";
import { GitHubIcon, LinkedInIcon } from "@/components/shell/BrandIcons";

export const metadata: Metadata = { title: "Contact" };

// Placeholder: the contact form arrives in SP-17.
export default function ContactPage() {
  return (
    <PageIntro
      title="Let’s talk"
      lede="A contact form is on its way. Until then, you can find me on GitHub and LinkedIn."
    >
      <a className="button button-gold" href={site.links.github} rel="me noopener">
        <GitHubIcon size={18} />
        GitHub
      </a>
      <a className="button veil" href={site.links.linkedin} rel="me noopener">
        <LinkedInIcon size={18} />
        LinkedIn
      </a>
    </PageIntro>
  );
}
