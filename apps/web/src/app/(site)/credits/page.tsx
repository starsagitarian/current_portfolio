import type { ReactNode } from "react";
import { site } from "@starsagitarian/shared";
import { PageIntro } from "@/components/page/PageIntro";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { pageMetadata } from "@/seo/metadata";
import "@/components/page/page.css";
import "./credits.css";

export const metadata = pageMetadata({
  title: "Credits",
  description: `The artwork, typeface, icons, software and services behind ${site.name}'s portfolio, and their licences.`,
  path: "/credits",
});

interface Credit {
  what: string;
  who: ReactNode;
  licence: ReactNode;
}

const a = (href: string, text: string) => (
  <a href={href} rel="noopener">
    {text}
  </a>
);

const SECTIONS: { title: string; credits: Credit[] }[] = [
  {
    title: "Artwork",
    credits: [
      {
        what: "The London scene, in daylight, at dusk and at blue hour",
        who: site.name,
        licence: "All rights reserved",
      },
      {
        what: "The character (standing, waving and the résumé portrait)",
        who: site.name,
        licence: "All rights reserved",
      },
      {
        what: "The starsagitarian logo, and the icons and link previews made from it",
        who: site.name,
        licence: "All rights reserved",
      },
      {
        what: "The project drawings and the character’s eyes, drawn in code",
        who: "This site",
        licence: a("https://github.com/starsagitarian/current_portfolio/blob/main/LICENSE", "MIT"),
      },
    ],
  },
  {
    title: "Typeface",
    credits: [
      {
        what: "Lexend, by Bonnie Shaver-Troup, Thomas Jockin, Santiago Orozco, Héctor Gómez and Superunion",
        who: a("https://github.com/googlefonts/lexend", "The Lexend Project Authors"),
        licence: a("https://openfontlicense.org", "SIL Open Font License 1.1"),
      },
    ],
  },
  {
    title: "Icons",
    credits: [
      {
        what: "Interface icons (home, pages, folder, mail, arrows and more)",
        who: a("https://lucide.dev", "Lucide"),
        licence: a("https://lucide.dev/license", "ISC"),
      },
      {
        what: "GitHub mark",
        who: a("https://simpleicons.org", "Simple Icons"),
        licence: "CC0 1.0; the mark is GitHub’s trademark",
      },
      {
        what: "LinkedIn logo, used only to link to the profile",
        who: "LinkedIn",
        licence: a("https://brand.linkedin.com", "LinkedIn brand guidelines"),
      },
    ],
  },
  {
    title: "Software",
    credits: [
      { what: "Next.js and React", who: "Vercel and Meta", licence: "MIT" },
      { what: "Tailwind CSS", who: "Tailwind Labs", licence: "MIT" },
      {
        what: "Express, Sequelize, Zod, Pino and Umzug",
        who: "Their contributors",
        licence: "MIT",
      },
      {
        what: "PostgreSQL",
        who: "The PostgreSQL Global Development Group",
        licence: "PostgreSQL License",
      },
      { what: "Swagger UI (the API documentation page)", who: "SmartBear", licence: "Apache 2.0" },
      {
        what: "sharp (images), Vitest and Playwright (tests)",
        who: "Their contributors",
        licence: "Apache 2.0 and MIT",
      },
    ],
  },
  {
    title: "Services",
    credits: [
      { what: "Hosting", who: a("https://vercel.com", "Vercel"), licence: "Free plan" },
      { what: "Database", who: a("https://neon.com", "Neon"), licence: "Free plan" },
      {
        what: "Bot check on the contact form",
        who: a("https://www.cloudflare.com/products/turnstile/", "Cloudflare Turnstile"),
        licence: "Free",
      },
      {
        what: "Contact alerts by email",
        who: a("https://resend.com", "Resend"),
        licence: "Free plan",
      },
      {
        what: "Code, builds and container images",
        who: a("https://github.com", "GitHub"),
        licence: "Free for public code",
      },
    ],
  },
];

/** Every asset and service the site uses, who made it and under what licence. */
export default function CreditsPage() {
  return (
    <div className="credits">
      <PageIntro
        title="Credits"
        lede="What this site is made of, who made it, and under what licence."
      />
      <div className="dissolve credits-list">
        {SECTIONS.map((section) => (
          <section key={section.title} aria-labelledby={`credits-${section.title}`}>
            <h2 id={`credits-${section.title}`} className="credits-title reveal">
              {section.title}
            </h2>
            <dl>
              {section.credits.map((credit) => (
                <div key={credit.what} className="credit reveal">
                  <dt>{credit.what}</dt>
                  <dd>
                    {credit.who} <span className="credit-licence">· {credit.licence}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
