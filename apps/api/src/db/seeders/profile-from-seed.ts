import { site, type Profile } from "@starsagitarian/shared";
import * as content from "./content";

const toMonth = (date: string) => date.slice(0, 7);

/**
 * The seed content in the shape GET /v1/profile publishes. The web app keeps a copy as its
 * fallback for when the API cannot be reached (see scripts/profile-snapshot.ts), and tests check
 * that the API serves exactly this from a freshly seeded database.
 */
export function profileFromSeed(): Profile {
  return {
    ...content.profile,
    links: { website: site.url, ...site.links },
    experience: content.experiences.map((item) => ({
      organisation: item.organisation,
      role: item.role,
      location: item.location,
      start: toMonth(item.startDate),
      end: toMonth(item.endDate),
      highlights: item.highlights,
    })),
    skills: Object.entries(content.skills).map(([category, skills]) => ({ category, skills })),
    certifications: content.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      issued: toMonth(item.issuedOn),
      credentialUrl: null,
    })),
    education: content.education.map((item) => ({ ...item })),
  };
}
