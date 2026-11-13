/**
 * Writes the web app's fallback copy of the profile (apps/web/src/content/profile.snapshot.json)
 * from the seed content. The site shows it whenever the API cannot be reached, so the résumé is
 * never empty. A test fails if the copy falls out of date.
 *
 *   npm run snapshot -w @starsagitarian/api
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { profileFromSeed } from "../src/db/seeders/profile-from-seed";

export const SNAPSHOT_PATH = path.resolve(
  import.meta.dirname,
  "../../web/src/content/profile.snapshot.json",
);

await writeFile(SNAPSHOT_PATH, `${JSON.stringify(profileFromSeed(), null, 2)}\n`);
console.info(`Wrote ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
