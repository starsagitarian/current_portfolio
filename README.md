# starsagitarian

Portfolio of **Baiju Joseph**, software and cloud engineer in London.

An illustrated London riverside whose light follows the width of your screen: daylight on a phone,
dusk on a tablet, blue hour on a desktop. Behind it sits a small, production-style backend: a
TypeScript REST API over PostgreSQL.

> Status: under construction. The live site will be at **https://starsagitarian.vercel.app**.

## Architecture

| Part              | What it is                                                         |
| ----------------- | ------------------------------------------------------------------ |
| `apps/web`        | Next.js (App Router), React, Tailwind CSS                          |
| `apps/api`        | Express 5 REST API in TypeScript; Sequelize and PostgreSQL to come |
| `packages/shared` | Zod schemas and types used by both apps                            |
| `tests/e2e`       | Playwright tests at phone, tablet and desktop widths               |

Pages are pre-rendered and served from a CDN; the API owns all data and answers in JSON, with
errors in the RFC 9457 `application/problem+json` format.

## Getting started

Requirements: Node.js 24 (see `.nvmrc`) and npm 11.

```bash
npm install
cp .env.example .env
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health

## Scripts

| Command             | Does                                                          |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Runs the web app and the API together, reloading on change    |
| `npm run build`     | Builds every package                                          |
| `npm run lint`      | ESLint (strict, type-aware) across the repo                   |
| `npm run typecheck` | TypeScript in strict mode across the repo                     |
| `npm test`          | Unit and API tests (Vitest, Supertest)                        |
| `npm run test:e2e`  | Browser tests (Playwright); run `npx playwright install` once |
| `npm run format`    | Formats with Prettier                                         |
| `npm run check`     | Format check, lint, type-check and tests in one go            |

Git hooks format staged files on commit, and run lint, type-check and tests before each push.

## Licence

Code: [MIT](LICENSE). Artwork, logo and character illustrations: © Baiju Joseph, all rights
reserved.
