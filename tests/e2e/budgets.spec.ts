import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

/*
 * First-load JavaScript, as a visitor's browser downloads it: every script each page's HTML
 * loads (not the old-browser polyfills, which modern browsers skip, and not the pages Next.js
 * prefetches in the background), gzipped. React and Next.js on their own come to about 116 KB,
 * so the budget is 160 KB in all, with the site's own code held to 45 KB of it.
 * Production builds only: a development server sends large, unminified scripts.
 */

const PAGES = [
  "/",
  "/resume",
  "/projects",
  "/projects/lightning-observation",
  "/contact",
  "/credits",
];
const KB = 1024;
const BUDGET = { total: 160 * KB, own: 45 * KB };

/** React's and Next.js's own chunks: React DOM, the router, Next's client code, the bundler runtime. */
const isFramework = (src: string, code: string) =>
  /\/turbopack-[^/]*\.js$/.test(src) ||
  ["react-dom", "next-router", "next/dist"].some((marker) => code.includes(marker));

test("first-load JavaScript stays within budget on every page", async ({ request }, info) => {
  test.skip(!process.env.E2E_BASE_URL, "measured on production builds");
  test.skip(info.project.name !== "desktop", "one browser covers it");

  const report: string[] = [];
  const failures: string[] = [];
  for (const page of PAGES) {
    const html = await (await request.get(page)).text();
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => !/\bnomodule\b/i.test(tag))
      .map((tag) => /\bsrc="([^"]+)"/.exec(tag)?.[1])
      .filter((src): src is string => src !== undefined);
    let total = 0;
    let own = 0;
    for (const src of new Set(scripts)) {
      const code = await (await request.get(src)).body();
      const size = gzipSync(code, { level: 9 }).length;
      total += size;
      if (!isFramework(src, code.toString("utf8"))) own += size;
    }
    report.push(`${page}: ${(total / KB).toFixed(1)} KB (own code ${(own / KB).toFixed(1)} KB)`);
    if (total > BUDGET.total) failures.push(`${page}: ${(total / KB).toFixed(1)} KB in all`);
    if (own > BUDGET.own) failures.push(`${page}: ${(own / KB).toFixed(1)} KB of own code`);
  }
  console.info(report.join("\n"));
  expect(failures, report.join("\n")).toEqual([]);
});
