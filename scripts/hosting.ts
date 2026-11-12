/**
 * Hosting automation for the deploy workflow (Neon and Vercel REST APIs). Idempotent: every
 * command can run on every deploy.
 *
 *   tsx scripts/hosting.ts neon-branch <production|preview>
 *       production: the project's default branch.
 *       preview:    a "preview" branch, created from production or reset to it, so every
 *                   preview starts from a copy of the live data.
 *       Writes direct_url (migrations) and pooled_url (serverless runtime) to $GITHUB_OUTPUT,
 *       masked in the logs.
 *
 *   tsx scripts/hosting.ts vercel-project <name> <web|api>
 *       Creates the project if needed and applies its settings.
 *
 *   tsx scripts/hosting.ts vercel-env <project> <production|preview> <KEY>
 *       Stores the value of the environment variable KEY as an encrypted project variable.
 *
 * Needs NEON_API_KEY and NEON_PROJECT_ID, or VERCEL_TOKEN (and VERCEL_TEAM_ID for a team scope).
 */
import { appendFile } from "node:fs/promises";

const NEON_API = "https://console.neon.tech/api/v2";
const VERCEL_API = "https://api.vercel.com";

function env(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`${name} is not set`);
  return value;
}

/** Hides a value in GitHub Actions logs. */
function mask(value: string): void {
  if (process.env.GITHUB_ACTIONS === "true") console.info(`::add-mask::${value}`);
}

async function output(name: string, value: string): Promise<void> {
  const file = process.env.GITHUB_OUTPUT;
  if (file === undefined) console.info(`${name}=${value}`);
  else await appendFile(file, `${name}=${value}\n`);
}

async function request<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
  });
  if (!response.ok) {
    // Status and API message only: request bodies may hold secrets.
    const detail = (await response.text()).slice(0, 300);
    throw new HttpError(response.status, `${init.method ?? "GET"} ${url}: ${detail}`);
  }
  return (await response.json()) as T;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(`${status} ${message}`);
  }
}

// ---------------------------------------------------------------- Neon

interface NeonBranch {
  id: string;
  name: string;
  parent_id?: string;
  default?: boolean;
}
interface NeonOperation {
  id: string;
  status: string;
}

async function neon<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(
    `${NEON_API}/projects/${env("NEON_PROJECT_ID")}${path}`,
    env("NEON_API_KEY"),
    init,
  );
}

async function waitForOperations(operations: NeonOperation[]): Promise<void> {
  for (const { id } of operations) {
    for (let attempt = 0; ; attempt++) {
      const { operation } = await neon<{ operation: NeonOperation }>(`/operations/${id}`);
      if (operation.status === "finished" || operation.status === "skipped") break;
      if (["failed", "error", "cancelled"].includes(operation.status)) {
        throw new Error(`Neon operation ${id} ${operation.status}`);
      }
      if (attempt > 60) throw new Error(`Neon operation ${id} still ${operation.status}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function neonBranch(kind: string): Promise<void> {
  const { branches } = await neon<{ branches: NeonBranch[] }>("/branches");
  const production = branches.find((branch) => branch.default === true);
  if (production === undefined) throw new Error("The Neon project has no default branch");

  let branch = production;
  if (kind === "preview") {
    const existing = branches.find((b) => b.name === "preview");
    if (existing === undefined) {
      const created = await neon<{ branch: NeonBranch; operations: NeonOperation[] }>("/branches", {
        method: "POST",
        body: JSON.stringify({
          branch: { name: "preview", parent_id: production.id },
          endpoints: [{ type: "read_write" }],
        }),
      });
      await waitForOperations(created.operations);
      branch = created.branch;
      console.info("Created Neon branch: preview");
    } else {
      const reset = await neon<{ operations: NeonOperation[] }>(
        `/branches/${existing.id}/restore`,
        { method: "POST", body: JSON.stringify({ source_branch_id: production.id }) },
      );
      await waitForOperations(reset.operations);
      branch = existing;
      console.info("Reset Neon branch preview to production");
    }
  } else if (kind !== "production") {
    throw new Error(`Unknown branch kind: ${kind}`);
  }

  const { databases } = await neon<{ databases: { name: string; owner_name: string }[] }>(
    `/branches/${branch.id}/databases`,
  );
  const database = databases[0];
  if (database === undefined) throw new Error(`Neon branch ${branch.name} has no database`);

  for (const pooled of [false, true]) {
    const query = new URLSearchParams({
      branch_id: branch.id,
      database_name: database.name,
      role_name: database.owner_name,
      pooled: String(pooled),
    });
    const { uri } = await neon<{ uri: string }>(`/connection_uri?${query.toString()}`);
    // TLS is configured by DATABASE_SSL; drop driver-specific query options.
    const url = new URL(uri);
    url.search = "";
    mask(url.password);
    mask(url.toString());
    await output(pooled ? "pooled_url" : "direct_url", url.toString());
  }
  console.info(`Connection details ready for Neon branch ${branch.name}`);
}

// ---------------------------------------------------------------- Vercel

interface VercelProject {
  id: string;
  name: string;
}

function vercelUrl(path: string): string {
  const team = process.env.VERCEL_TEAM_ID;
  if (team === undefined || team === "") return `${VERCEL_API}${path}`;
  return `${VERCEL_API}${path}${path.includes("?") ? "&" : "?"}teamId=${team}`;
}

async function vercel<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(vercelUrl(path), env("VERCEL_TOKEN"), init);
}

const PROJECT_SETTINGS: Record<string, Record<string, unknown>> = {
  web: {
    framework: "nextjs",
    rootDirectory: "apps/web",
    // The web app imports the shared workspace package.
    sourceFilesOutsideRootDirectory: true,
    // Install from the repository root, exactly as locked (as CI does). A plain `npm install`
    // inside apps/web skips the root's dev tools, and the root's `prepare` script then fails.
    installCommand:
      "cd ../.. && npm ci --no-audit --no-fund --workspace @starsagitarian/web --include-workspace-root",
  },
  // Deployed prebuilt from CI (Build Output API), so no framework or build settings.
  api: { framework: null },
};

async function vercelProject(name: string, kind: string): Promise<void> {
  const settings = PROJECT_SETTINGS[kind];
  if (settings === undefined) throw new Error(`Unknown project kind: ${kind}`);

  let project: VercelProject;
  try {
    project = await vercel<VercelProject>(`/v9/projects/${name}`);
  } catch (error) {
    if (!(error instanceof HttpError && error.status === 404)) throw error;
    // Create with the name only: the create endpoint accepts fewer settings than the update
    // below, which applies all of them.
    project = await vercel<VercelProject>("/v11/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    console.info(`Created Vercel project ${name}`);
  }

  await vercel(`/v9/projects/${project.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...settings,
      nodeVersion: "24.x",
      // Public previews: this is a public portfolio, and CI smoke-tests every deployment.
      ssoProtection: null,
    }),
  });
  console.info(`Vercel project ${name} is configured`);
}

async function vercelEnv(project: string, target: string, key: string): Promise<void> {
  if (target !== "production" && target !== "preview") throw new Error(`Bad target: ${target}`);
  const value = env(key);
  await vercel(`/v10/projects/${project}/env?upsert=true`, {
    method: "POST",
    body: JSON.stringify({ key, value, type: "encrypted", target: [target] }),
  });
  console.info(`Set ${key} for ${project} (${target})`);
}

// ---------------------------------------------------------------- CLI

const [command, ...args] = process.argv.slice(2);
const [first = "", second = "", third = ""] = args;

switch (command) {
  case "neon-branch":
    await neonBranch(first);
    break;
  case "vercel-project":
    await vercelProject(first, second);
    break;
  case "vercel-env":
    await vercelEnv(first, second, third);
    break;
  default:
    console.error("Usage: hosting.ts <neon-branch|vercel-project|vercel-env> ...");
    process.exitCode = 1;
}
