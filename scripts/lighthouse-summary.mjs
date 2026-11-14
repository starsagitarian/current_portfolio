/**
 * Turns Lighthouse CI's reports into a Markdown table (one row per page, median run): the
 * category scores and the timings the budgets cover. Used for the CI run's summary.
 *
 *   node scripts/lighthouse-summary.mjs .lighthouseci/4g "4G phone"
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const [dir = ".lighthouseci/4g", title = "Lighthouse"] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
const pct = (score) => (score === null || score === undefined ? "–" : Math.round(score * 100));

const rows = [];
for (const run of manifest.filter((entry) => entry.isRepresentativeRun)) {
  const report = JSON.parse(await readFile(run.jsonPath, "utf8"));
  const { categories: c, audits: a } = report;
  rows.push(
    `| ${new URL(run.url).pathname} | ${pct(c.performance.score)} | ${pct(c.accessibility.score)} | ${pct(c["best-practices"].score)} | ${pct(c.seo.score)} | ${a["largest-contentful-paint"].displayValue} | ${a["total-blocking-time"].displayValue} | ${a["cumulative-layout-shift"].displayValue} |`,
  );
}
console.log(
  [
    `### ${title}`,
    "| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n"),
);
