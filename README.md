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
4. **Smoke test.** The API's deep health check must report the database as up, the content API must
   list projects and serve the CV PDF, the contact form must be switched on (an empty message gets a
   400), and the site must answer.

[`scripts/hosting.ts`](scripts/hosting.ts) keeps the setup in code: it creates the Neon `preview` branch
and both Vercel projects if they are missing, and stores the connection strings as encrypted Vercel
environment variables. The repository needs:

| Name                   | Kind               | Holds                                                                           |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`         | Secret             | Vercel access token (expires 12 Nov 2027: replace it before then)               |
| `NEON_API_KEY`         | Secret             | Neon API key                                                                    |
| `NEON_PROJECT_ID`      | Variable           | Neon project ID; deploys are skipped until set                                  |
| `VERCEL_TEAM_ID`       | Secret or variable | The Vercel team to deploy into (`team_…`)                                       |
| `TURNSTILE_SECRET_KEY` | Secret             | Cloudflare Turnstile secret for production (previews use Cloudflare's test key) |
| `RESEND_API_KEY`       | Secret             | Resend API key for contact alerts                                               |
| `CONTACT_ALERT_EMAIL`  | Secret             | Where contact alerts go; never in the repository or on the site                 |

`IP_HASH_SALT` and `CRON_SECRET` are created at random on the first deploy and kept in Vercel.

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

## API

| Endpoint                                   | Returns                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `GET /v1/projects?tag=&q=&page=&pageSize=` | Published projects: filter by tag slug, full-text search, pagination |
| `GET /v1/projects/:slug`                   | One project with its full write-up                                   |
| `GET /v1/profile`                          | The résumé: headline, experience, skills, certifications, education  |
| `GET /v1/profile/cv.pdf`                   | The same résumé as a downloadable A4 PDF                             |
| `POST /v1/contact`                         | A message from the contact form                                      |
| `GET /health`                              | Liveness; `?deep=1` also checks the database                         |
| `GET /docs`                                | Interactive documentation, where every endpoint can be tried         |
| `GET /openapi.json`                        | The OpenAPI 3.1 document                                             |

Each route reads through a service, which reads through a repository, so HTTP, shaping and SQL each
live in one place ([`apps/api/src`](apps/api/src)). Response shapes are Zod schemas in
[`packages/shared`](packages/shared/src/content.ts), shared with the web app.

- **Caching.** Content responses carry `s-maxage=3600, stale-while-revalidate=86400`, so the CDN
  asks the database at most about once an hour per URL. ETags allow `304 Not Modified`. Errors are
  never cached.
- **Errors.** Every error is `application/problem+json` (RFC 9457). Bad query parameters get a 400
  that names them; a database outage gets a 503 that reveals nothing about the database.
- **Rate limit.** `RATE_LIMIT_PER_MINUTE` requests per client per minute on `/v1` (default 60), with
  standard `RateLimit` headers and `Retry-After` on a 429.
- **Logs.** One JSON line per request with its id, method, URL and status: no headers, cookies or IPs.
- **Contract.** The OpenAPI document is built from the same Zod schemas the routes validate with,
  and committed as [`apps/api/openapi.json`](apps/api/openapi.json) so contract changes show in
  review. Tests check every response (status, content type, headers and body) against it, fail if
  any documented response is never produced, and fail if the committed file is out of date
  (`npm run openapi -w @starsagitarian/api` regenerates it).
- **Contact form.** A message is validated, dropped silently if the hidden honeypot field is
  filled in, checked with Cloudflare Turnstile, limited to `CONTACT_LIMIT_PER_HOUR` (5) per sender
  (counted in PostgreSQL under a lock, so it holds across serverless instances), stored, then
  emailed to the owner through Resend. IP addresses are stored only as an HMAC keyed with
  `IP_HASH_SALT`. Only the site and its previews may post from a browser (`CORS_ORIGINS`); public
  reads allow any origin. Logs carry the message id, never its content or the sender's details.
- **Retention.** Vercel Cron calls `GET /cron/purge-contact-messages` daily with `CRON_SECRET`,
  deleting messages older than 12 months. Preview databases are copies of production, so deploys
  clear their contact messages.
- **CV PDF.** Drawn by a small built-in PDF writer using the standard Helvetica fonts, so it needs no
  extra packages and comes to about 6 KB. It shows no phone number, email or postal address.

## The light

The whole site follows one number, `--sky`, set on `<html>` from the window width: 0 is daylight
(phones, up to 560 px), 1 is dusk (768–1100 px) and 2 is blue hour (1280 px and wider), with
smooth blends in between ([`apps/web/src/sky`](apps/web/src/sky)).

- **No flash.** A small inline script in `<head>` sets it before first paint. Without JavaScript,
  media queries give the three pure lights.
- **Smooth resizing.** One update per animation frame, changing only that variable: sweeping
  from daylight to blue hour holds 60 frames a second.
- **Tokens.** Every colour in [`tokens.css`](apps/web/src/sky/tokens.css) is blended in OKLCH. Cards
  ease from cream to navy glass while text flips from dark to light halfway through the evening,
  so nothing passes through grey on grey. A browser test measures WCAG contrast at every 10 px
  from 320 to 1920 px, with each card laid over both black and white.
- **The scene.** Three aligned paintings fade into one another with the light, and each screen
  downloads only the one it shows (at most about 260 KB on a phone, tablet or desktop).
- **Ambient motion.** Three layers of cloud drift at different speeds, light slides across the
  river, and after dark the bridge's towers glow and its strings of lights ripple, with the lamps
  and stars. Every loop animates `transform` or `opacity` only, so it runs on the compositor;
  nothing loops for visitors who prefer reduced motion, and everything pauses while the tab is
  hidden ([`apps/web/src/motion`](apps/web/src/motion)). Browser tests check all three.
- **The character.** Standing on Home, waving on Menu and Contact, and an avatar on the résumé
  ([`apps/web/src/components/character`](apps/web/src/components/character)). His eyes are SVG
  drawn in the artwork's own pixels, so they stay on the face at every width; he breathes, blinks,
  glances and rolls his eyes, follows the mouse on a desktop, and glides between his phone, tablet
  and desktop places as the light changes.
- **Résumé.** Built from `GET /v1/profile`, cached for an hour, with a copy of the seed content
  bundled as a fallback ([`apps/web/src/content`](apps/web/src/content)), so the page renders even
  when the API is down; a test keeps the copy in step (`npm run snapshot -w @starsagitarian/api`).
  The CV downloads from the site's own `/resume/cv.pdf`, which fetches it from the API. Set
  `API_URL` to where the web server reaches the API (compose and the deploy workflow do).
- **Projects.** Built from `GET /v1/projects`, cached for an hour with the same bundled fallback,
  so the site builds and serves with the API switched off. Each project has a glass tile with its
  own SVG drawing in the scene's colours, and a page of its own (`/projects/<slug>`, built ahead).
  The filter lives in the address (`?tag=web`): the server renders the filtered list, so a shared
  link or a refresh is right from the first paint, and choosing a filter after that updates the
  address and the grid at once, with no trip to the server; back and forward step through it.
  React's `<ViewTransition>` morphs a project's drawing from its tile to its page, and the tiles
  glide as the filter changes. Without JavaScript, every project is still listed and linked.
- **Layout.** Every page sits in one shell ([`apps/web/src/components/shell`](apps/web/src/components/shell)):
  a skip link, the painted scene, a header and the content. Phones and tablets get a menu (a modal
  dialog, so focus stays in it and Escape closes it) and a tab bar; desktops get the sections in
  the header. The current section is marked for screen readers and shown in a gold pill. Page
  content slides in on each change while the scene stays put. Browser tests walk every section by
  mouse, touch and keyboard.

## Scripts

| Command                                  | Does                                                             |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                            | Runs the web app and the API together, reloading on change       |
| `npm run build`                          | Builds every package                                             |
| `npm run lint`                           | ESLint (strict, type-aware) across the repo                      |
| `npm run typecheck`                      | TypeScript in strict mode across the repo                        |
| `npm test`                               | All Vitest tests, including database tests (needs Docker)        |
| `npm run test:unit`                      | Unit and API tests only, no Docker needed                        |
| `npm run test:db`                        | Database tests against PostgreSQL 17 started by Testcontainers   |
| `npm run test:e2e`                       | Browser tests (Playwright); run `npx playwright install` once    |
| `npm run openapi -w @starsagitarian/api` | Regenerates the committed OpenAPI document                       |
| `npm run db:migrate`                     | Applies pending migrations                                       |
| `npm run db:rollback`                    | Undoes the latest migration (`-- --all` for every one)           |
| `npm run db:status`                      | Lists applied and pending migrations and seeders                 |
| `npm run db:seed`                        | Loads portfolio content                                          |
| `npm run db:reset`                       | Rebuilds the local database from scratch (refused in production) |
| `npm run format`                         | Formats with Prettier                                            |
| `npm run check`                          | Format check, lint, type-check and tests in one go               |

Git hooks format staged files on commit, and run lint, type-check and unit tests before each push.

## Licence

Code: [MIT](LICENSE). Artwork, logo and character illustrations: © Baiju Joseph, all rights
reserved.
