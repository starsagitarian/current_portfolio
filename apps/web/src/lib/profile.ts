import { cacheLife } from "next/cache";
import { ProfileSchema, type Profile } from "@starsagitarian/shared";
import snapshot from "../content/profile.snapshot.json";
import { apiUrl } from "./api";

export interface LoadedProfile {
  profile: Profile;
  /** False when the API could not be reached and the bundled copy is shown instead. */
  live: boolean;
}

/**
 * Fetches the profile from the API, falling back to the copy bundled with the site, so the
 * résumé always renders: at build time with no API, during an outage, or on a bad response.
 */
export async function loadProfile(
  fetcher: (url: string) => Promise<Response>,
  base: string,
): Promise<LoadedProfile> {
  try {
    const res = await fetcher(`${base}/v1/profile`);
    if (!res.ok) throw new Error(`the API answered ${res.status}`);
    return { profile: ProfileSchema.parse(await res.json()), live: true };
  } catch (error) {
    console.warn(`Résumé: showing the bundled profile (${String(error)}).`);
    return { profile: ProfileSchema.parse(snapshot), live: false };
  }
}

/**
 * The profile for the résumé page, cached for an hour: the CDN serves the page and the database
 * is asked at most about once an hour, which keeps Neon asleep.
 */
export async function getProfile(): Promise<LoadedProfile> {
  "use cache";
  cacheLife("hours");
  return loadProfile((url) => fetch(url, { signal: AbortSignal.timeout(5000) }), apiUrl());
}
