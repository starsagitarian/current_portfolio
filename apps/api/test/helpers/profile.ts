import type { Profile } from "@starsagitarian/shared";
import { profileFromSeed } from "../../src/db/seeders/profile-from-seed";

/** The seeded profile in its published shape, for tests that need no database. */
export function seedProfile(): Profile {
  return profileFromSeed();
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
