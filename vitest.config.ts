import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          root: "packages/shared",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "api",
          root: "apps/api",
          include: ["test/**/*.test.ts", "src/**/*.test.ts"],
          exclude: ["test/db/**"],
          environment: "node",
        },
      },
      {
        test: {
          name: "web",
          root: "apps/web",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // Integration tests against a real PostgreSQL 17, started in Docker by Testcontainers.
        test: {
          name: "api-db",
          root: "apps/api",
          include: ["test/db/**/*.test.ts"],
          environment: "node",
          globalSetup: ["test/db/global-setup.ts"],
          // Files share one database, so they run one at a time.
          fileParallelism: false,
          hookTimeout: 120_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
