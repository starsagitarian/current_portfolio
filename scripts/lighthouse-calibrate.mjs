/**
 * Prints the CPU slowdown that makes this machine behave like the budgets' mid-range phone.
 *
 * Lighthouse imitates a slower phone by multiplying the time the page's work takes on the machine
 * it runs on, so the same multiplier means a different phone on a fast laptop and on a busy CI
 * runner. Lighthouse measures the machine first (its benchmark index); the multiplier here is
 * chosen so the result is the same phone everywhere: the one a fast laptop imitates at the usual
 * 4x (benchmark index about 3,200, so a phone of about 800). It only ever eases the slowdown, on
 * slower machines: never above Lighthouse's standard 4x, because the benchmark is a raw script
 * test, and on a fast runner busy with the whole stack the page's own work does not speed up in
 * proportion (a runner scoring 3,580 at 4.5x measured far worse than the same page at 4x).
 *
 *   node scripts/lighthouse-calibrate.mjs http://localhost:3000
 */
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const PHONE_BENCHMARK = 800;
const url = process.argv[2] ?? "http://localhost:3000";
const lighthouse = createRequire(import.meta.url).resolve("lighthouse/cli/index.js");
const out = path.join(mkdtempSync(path.join(tmpdir(), "lh-")), "report.json");

// three short runs, as the machine's speed varies from moment to moment; the middle one counts
const indexes = [];
for (let i = 0; i < 3; i++) {
  execFileSync(
    process.execPath,
    [
      lighthouse,
      url,
      "--quiet",
      "--only-audits=first-contentful-paint",
      "--chrome-flags=--headless=new --no-sandbox",
      "--output=json",
      `--output-path=${out}`,
    ],
    { stdio: "ignore" },
  );
  indexes.push(JSON.parse(readFileSync(out, "utf8")).environment.benchmarkIndex);
}
const index = indexes.sort((a, b) => a - b)[1];
const multiplier = Math.min(4, Math.max(1, Math.round((index / PHONE_BENCHMARK) * 2) / 2));
console.error(
  `benchmark index ${Math.round(index)} (${indexes.map(Math.round).join(", ")}): CPU slowdown ${multiplier}x`,
);
console.log(multiplier);
