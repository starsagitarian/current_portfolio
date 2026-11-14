/*
 * The same pages on Lighthouse's default, harsher network (slow 4G: 1.6 Mbps, 150 ms round
 * trips), once each. Reported in CI for information; it fails nothing.
 */
// Lighthouse CI loads its configuration as CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PAGES, base, cpuSlowdownMultiplier } = require("./lighthouserc.cjs");

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((path) => `${base}${path}`),
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.95 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/slow4g" },
  },
};
