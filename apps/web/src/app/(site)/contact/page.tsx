import type { Metadata } from "next";
import { site } from "@starsagitarian/shared";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageIntro } from "@/components/page/PageIntro";
import { GitHubIcon, LinkedInIcon } from "@/components/shell/BrandIcons";
import { contactEndpoint, turnstileSiteKey } from "@/lib/contact";
import { pageMetadata } from "@/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Write to Baiju Joseph about a role, a project or a question.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageIntro
        title="Let’s talk"
        lede="Have a role or project in mind? Write to me here: I read every message."
      />
      <section className="contact-card surface rise" aria-label="Send a message">
        <ContactForm endpoint={contactEndpoint()} siteKey={turnstileSiteKey()} />
        <noscript>
          <p className="contact-noscript">
            Your browser isn&apos;t running JavaScript, so the form skips its spam check. It still
            works, though at busy times it may ask you to try again later.
          </p>
        </noscript>
        <div className="contact-elsewhere">
          <span>Or find me on</span>
          <a href={site.links.github} rel="me noopener">
            <GitHubIcon size={18} />
            GitHub
          </a>
          <a href={site.links.linkedin} rel="me noopener">
            <LinkedInIcon size={18} />
            LinkedIn
          </a>
        </div>
        <details className="contact-privacy">
          <summary>What happens to your message</summary>
          <p>
            It&apos;s stored for 12 months so I can reply, then deleted. Your IP address is kept
            only as a one-way hash, to hold back spam, and Cloudflare Turnstile checks that
            you&apos;re not a bot. Nothing is shared or sold.
          </p>
        </details>
      </section>
    </>
  );
}
