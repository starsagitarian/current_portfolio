import path from "node:path";
import type { NextConfig } from "next";

// The repository root: the web app imports the shared workspace package.
const monorepoRoot = path.join(import.meta.dirname, "../..");

// Each build's own name for the service worker, so a deploy replaces the one before (and its
// caches): the commit on the hosting platform, the build time elsewhere.
const serviceWorkerVersion = (
  process.env.VERCEL_GIT_COMMIT_SHA ?? new Date().toISOString().replace(/\D/g, "")
).slice(0, 14);

const nextConfig: NextConfig = {
  // A self-contained server for the container image (the hosting platform ignores it).
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
  transpilePackages: ["@starsagitarian/shared"],
  env: { NEXT_PUBLIC_SW_VERSION: serviceWorkerVersion },
  headers() {
    return Promise.resolve([
      {
        // the service worker: always checked for a newer one, and allowed to run nothing else
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]);
  },
  turbopack: {
    root: monorepoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
