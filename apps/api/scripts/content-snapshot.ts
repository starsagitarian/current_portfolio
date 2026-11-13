/**
 * Writes the web app's fallback copies of the content (apps/web/src/content/*.snapshot.json)
 * from the seed. The site shows them whenever the API cannot be reached, so the résumé and the
 * projects are never empty, and the site builds with the API switched off. A test fails if a
 * copy falls out of date.
 *
 *   npm run snapshot -w @starsagitarian/api
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { format, resolveConfig } from "prettier";
import { profileFromSeed } from "../src/db/seeders/profile-from-seed";
import { projectsFromSeed } from "../src/db/seeders/projects-from-seed";

const CONTENT_DIR = path.resolve(import.meta.dirname, "../../web/src/content");

const snapshots: [file: string, data: unknown][] = [
  ["profile.snapshot.json", profileFromSeed()],
  ["projects.snapshot.json", projectsFromSeed()],
];

for (const [file, data] of snapshots) {
  const target = path.join(CONTENT_DIR, file);
  // formatted as the repository formats JSON, so a fresh snapshot of unchanged content is no diff
  const options = { ...(await resolveConfig(target)), filepath: target };
  await writeFile(target, await format(JSON.stringify(data, null, 2), options));
  console.info(`Wrote ${path.relative(process.cwd(), target)}`);
}
