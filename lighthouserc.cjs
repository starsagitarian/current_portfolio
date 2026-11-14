/*
 * Lighthouse CI: the quality budgets from the plan (section 5, as revised in the change log),
 * asserted on the production build in CI, on a mid-range phone (4x slower CPU) on 4G (9 Mbps,
 * 170 ms round trips). Reports stay on disk (no upload to a public server).
 *
 *   LHCI_BASE_URL=http://localhost:3000 npx lhci autorun --config=lighthouserc.cjs
 *
 * Interaction to Next Paint needs a real visitor, so its lab stand-in is Total Blocking Time.
 * First-load JavaScript is checked by tests/e2e/budgets.spec.ts (Lighthouse would also count the
 * pages prefetched in the background). lighthouserc.slow4g.cjs reports the harsher slow-4G view.
 */
const base = (process.env.LHCI_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PAGES = ["/", "/resume", "/projects", "/projects/lightning-observation", "/contact"];
const median = { aggregationMethod: "median-run" };

module.exports = {
  PAGES,
  base,
  ci: {
    collect: {
      url: PAGES.map((path) => `${base}${path}`),
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        throttlingMethod: "simulate",
        throttling: { rttMs: 170, throughputKbps: 9000, cpuSlowdownMultiplier: 4 },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95, ...median }],
        "categories:accessibility": ["error", { minScore: 0.95, ...median }],
        "categories:best-practices": ["error", { minScore: 0.95, ...median }],
        "categories:seo": ["error", { minScore: 0.95, ...median }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500, ...median }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05, ...median }],
        "total-blocking-time": ["error", { maxNumericValue: 150, ...median }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/4g" },
  },
};
