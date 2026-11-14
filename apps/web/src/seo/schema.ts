import { site } from "@starsagitarian/shared";

/** Baiju, as schema.org describes a person: the same everywhere, referred to by its @id. */
export const PERSON_ID = `${site.url}/#person`;

export function person(extra: Record<string, unknown> = {}) {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: site.name,
    jobTitle: site.title,
    url: site.url,
    image: `${site.url}/art/avatar-320.webp`,
    address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
    sameAs: [site.links.github, site.links.linkedin],
    ...extra,
  };
}
