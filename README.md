# starsagitarian

Portfolio of **Baiju Joseph**, software and cloud engineer in London.

An illustrated London riverside whose light follows the width of your screen: daylight on a phone,
dusk on a tablet, blue hour on a desktop. Behind it sits a small, production-style backend: a
TypeScript REST API over PostgreSQL.

> Status: under construction. The live site will be at **https://starsagitarian.vercel.app**.

## Architecture

| Part              | What it is                                                 |
| ----------------- | ---------------------------------------------------------- |
| `apps/web`        | Next.js (App Router), React, Tailwind CSS                  |
| `apps/api`        | Express 5 REST API in TypeScript, Sequelize, PostgreSQL 17 |
| `packages/shared` | Zod schemas and types used by both apps                    |
| `tests/e2e`       | Playwright tests at phone, tablet and desktop widths       |

Pages are pre-rendered and served from a CDN; the API owns all data and answers in JSON, with
errors in the RFC 9457 `application/problem+json` format.

### Database

Schema changes are versioned migrations (Umzug), each applied in its own transaction and fully
reversible. Portfolio content is loaded by a separate seeder, so it can be reloaded without touching
the schema or visitor messages.

| Table                                                  | Holds                                         |
| ------------------------------------------------------ | --------------------------------------------- |
| `profiles`                                             | Name, title, summary (exactly one row)        |
| `projects`                                             | Case studies, with a weighted full-text index |
| `tags`, `project_tags`                                 | Web / Cloud / Data filters                    |
| `technologies`, `project_technologies`                 | Tech-stack chips, in display order            |
| `experiences`, `skills`, `certifications`, `education` | The résumé                                    |
| `contact_messages`                                     | Messages from the contact form                |

Rules live in the database as well as the code: slug formats, date order, one profile row,
case-insensitive technology names and message length are all `CHECK` constraints or unique indexes.

## Run it with Docker

Requirements: Docker with Compose v2. One command builds both images and starts the stack:

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:4000/health?deep=1

Compose starts PostgreSQL 17, waits for it to be healthy, runs a one-off `migrate` job (migrations
and seed content, safe to re-run), then the API, then the web app. Both app images run as a non-root
user on plain Alpine with only the Node.js binary added (about 60 MB to download each). The API
container has a read-only filesystem, and every app container drops all Linux capabilities.

| Variable                                            | Default     | Use                        |
| --------------------------------------------------- | ----------- | -------------------------- |
| `WEB_PORT` / `API_PORT`                             | 3000 / 4000 | Host ports, if those clash |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `portfolio` | Local database credentials |

`docker compose down` stops everything and keeps the data; add `-v` to delete it as well.

Published images (built by CI from `main`):

```bash
docker pull ghcr.io/starsagitarian/starsagitarian-api:latest
docker pull ghcr.io/starsagitarian/starsagitarian-web:latest
```

## Continuous integration

GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) runs on every pull request and on `main`:

| Job        | Does                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| checks     | Prettier, ESLint, TypeScript and unit tests                                                                                    |
| database   | Migration, seed and health tests against PostgreSQL 17 (Testcontainers)                                                        |
| stack      | Builds both images, fails if either passes 200 MB, starts the Compose stack, then runs Playwright against the production build |
| publish    | On `main` only, after all three pass: pushes both images to GitHub Container Registry, tagged `latest` and `sha-<commit>`      |
| preview    | On pull requests, after all three pass: deploys a preview of the site and API (see Hosting)                                    |
| production | On `main`, after all three pass: migrates the live database, then deploys the API and the site                                 |

Actions are pinned to full commit SHAs, and the workflow token is read-only except in the publish job.

## Hosting

Free tiers only, with no payment card on any account.

| Part     | Where                                                            |
| -------- | ---------------------------------------------------------------- |
| Web      | https://starsagitarian.vercel.app (Vercel, Next.js)              |
| API      | https://starsagitarian-api.vercel.app (Vercel Function, London)  |
| Database | Neon PostgreSQL 17 (London): `production` and `preview` branches |

[`deploy.yml`](.github/workflows/deploy.yml) runs after CI passes, in this order:

1. **Database.** Production uses Neon's default branch. Each preview first resets the `preview`
   branch to a copy of production. Pending migrations and seeds are then applied, so migrations
   must stay compatible with the code that is still live (add first, remove later).
2. **API.** Built in CI and packaged as a Vercel Build Output
   ([`vercel-output.ts`](apps/api/scripts/vercel-output.ts)): one Node.js 24 function in London, next
   to the database, with production dependencies installed from the lockfile.
3. **Web.** Built by Vercel from the source listed in [`.vercelignore`](.vercelignore).
4. **Smoke test.** The API's deep health check must report the database as up, and the site must answer.

[`scripts/hosting.ts`](scripts/hosting.ts) keeps the setup in code: it creates the Neon `preview` branch
and both Vercel projects if they are missing, and stores the connection strings as encrypted Vercel
environment variables. The repository needs:

| Name              | Kind     | Holds                                          |
| ----------------- | -------- | ---------------------------------------------- |
| `VERCEL_TOKEN`    | Secret   | Vercel access token                            |
| `NEON_API_KEY`    | Secret   | Neon API key                                   |
| `NEON_PROJECT_ID` | Variable | Neon project ID; deploys are skipped until set |
| `VERCEL_TEAM_ID`  | Variable | Optional: a Vercel team to deploy into         |

## Getting started (development)

Requirements: Node.js 24 (see `.nvmrc`), npm 11 and Docker.

```bash
npm install
cp .env.example .env
docker run -d --name portfolio-db -p 5432:5432 \
  -e POSTGRES_USER=portfolio -e POSTGRES_PASSWORD=portfolio -e POSTGRES_DB=portfolio \
  postgres:17-alpine
npm run db:migrate && npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health (add `?deep=1` to check the database too)

If port 5432 is already taken by a local PostgreSQL, publish the container on another port
(`-p 5433:5432`) and change the port in `DATABASE_URL` in `.env` to match.

## Scripts

| Command               | Does                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Runs the web app and the API together, reloading on change       |
| `npm run build`       | Builds every package                                             |
| `npm run lint`        | ESLint (strict, type-aware) across the repo                      |
| `npm run typecheck`   | TypeScript in strict mode across the repo                        |
| `npm test`            | All Vitest tests, including database tests (needs Docker)        |
| `npm run test:unit`   | Unit and API tests only, no Docker needed                        |
| `npm run test:db`     | Database tests against PostgreSQL 17 started by Testcontainers   |
| `npm run test:e2e`    | Browser tests (Playwright); run `npx playwright install` once    |
| `npm run db:migrate`  | Applies pending migrations                                       |
| `npm run db:rollback` | Undoes the latest migration (`-- --all` for every one)           |
| `npm run db:status`   | Lists applied and pending migrations and seeders                 |
| `npm run db:seed`     | Loads portfolio content                                          |
| `npm run db:reset`    | Rebuilds the local database from scratch (refused in production) |
| `npm run format`      | Formats with Prettier                                            |
| `npm run check`       | Format check, lint, type-check and tests in one go               |

Git hooks format staged files on commit, and run lint, type-check and unit tests before each push.

## Licence

Code: [MIT](LICENSE). Artwork, logo and character illustrations: © Baiju Joseph, all rights
reserved.
