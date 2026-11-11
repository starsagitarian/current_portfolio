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
