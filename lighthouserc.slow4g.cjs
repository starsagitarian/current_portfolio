/*
 * The same pages on Lighthouse's default, harsher network (slow 4G: 1.6 Mbps, 150 ms round
 * trips), once each. Reported in CI for information; it fails nothing.
 */
// Lighthouse CI loads its configuration as CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PAGES, base } = require("./lighthouserc.cjs");

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((path) => `${base}${path}`),
      numberOfRuns: 1,
      settings: { chromeFlags: "--no-sandbox --headless=new" },
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
