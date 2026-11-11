/**
 * Packages the built API as a Vercel Build Output (v3) for `vercel deploy --prebuilt`:
 *
 *   .vercel/output/config.json                every path routed to one function
 *   .vercel/output/functions/index.func/      dist + production node_modules + .vc-config.json
 *
 * Run after `npm run build`. Production dependencies are installed the same way as in the
 * container image: a clean `npm ci --omit=dev` from the lockfile, in a scratch directory.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const apiDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(apiDir, "../..");
const outputDir = path.join(apiDir, ".vercel/output");
const functionDir = path.join(outputDir, "functions/index.func");

/** Vercel region closest to the database (Neon, AWS eu-west-2 London). */
const REGION = "lhr1";

async function installProductionDependencies(target: string): Promise<void> {
  const scratch = await mkdtemp(path.join(tmpdir(), "api-deps-"));
  try {
    // Every workspace manifest is needed because the lockfile lists them all.
    for (const file of [
      "package.json",
      "package-lock.json",
      "apps/api/package.json",
      "apps/web/package.json",
      "packages/shared/package.json",
    ]) {
      await cp(path.join(repoRoot, file), path.join(scratch, file));
    }
    execFileSync(
      "npm",
      [
        "ci",
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--workspace",
        "@starsagitarian/api",
      ],
      { cwd: scratch, stdio: "inherit" },
    );
    // Workspace links point outside the function; the shared package is bundled into dist.
    await rm(path.join(scratch, "node_modules/@starsagitarian"), { recursive: true, force: true });
    await cp(path.join(scratch, "node_modules"), path.join(target, "node_modules"), {
      recursive: true,
      verbatimSymlinks: true,
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const dist = path.join(apiDir, "dist");
  const built = await readdir(dist).catch((): string[] => []);
  if (!built.includes("vercel.js")) {
    throw new Error("dist/vercel.js is missing: run `npm run build` first.");
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(functionDir, { recursive: true });

  await cp(dist, path.join(functionDir, "dist"), { recursive: true });
  await writeFile(
    path.join(functionDir, "package.json"),
    JSON.stringify({ type: "module", private: true }, null, 2),
  );
  await installProductionDependencies(functionDir);

  await writeFile(
    path.join(functionDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs24.x",
        handler: "dist/vercel.js",
        launcherType: "Nodejs",
        shouldAddHelpers: false,
        shouldAddSourcemapSupport: true,
        regions: [REGION],
        maxDuration: 10,
        // Non-secret settings. DATABASE_URL comes from the project's environment variables.
        environment: {
          NODE_ENV: "production",
          DATABASE_SSL: "true",
          DATABASE_POOL_MAX: "2",
          LOG_LEVEL: "info",
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(outputDir, "config.json"),
    JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/index" }] }, null, 2),
  );

  console.info(`Build output written to ${path.relative(repoRoot, outputDir)}`);
}

await main();
