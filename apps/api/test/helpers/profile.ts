import { site, type Profile } from "@starsagitarian/shared";
import * as content from "../../src/db/seeders/content";

const toMonth = (date: string) => date.slice(0, 7);

/** The seeded profile in its published shape, for tests that need no database. */
export function seedProfile(): Profile {
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

/*
 * What the CV must never contain: a phone number, an email address or a postal address.
 * Dates such as "2017 – 2019" are not phone numbers, so a match needs nine or more digits.
 */
export const PRIVATE_DETAILS: [string, RegExp][] = [
  ["phone number", /(?:\+?\d[\s().-]*){9,}/],
  ["email address", /[\w.+-]+@[\w-]+\.[\w.]+/],
  ["UK postcode", /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/],
  ["street address", /\b\d+\s+\w+\s+(Road|Street|Avenue|Lane|Close|Drive|Way|Court|Place)\b/i],
];
