# Runbook

How to keep [starsagitarian.vercel.app](https://starsagitarian.vercel.app) up to date, and what
to do when something goes wrong. Everything here runs on free plans.

## What runs where

| Part               | Where                                                                              | Notes                                                                        |
| ------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Site               | Vercel project `starsagitarian`                                                    | Next.js; pages built at deploy, refreshed hourly                             |
| API                | Vercel project `starsagitarian-api` (starsagitarian-api.vercel.app)                | Express; `/health?deep=1` checks the database; documentation at `/docs`      |
| Database           | Neon, branch `production` (and `preview`, a copy, for pull requests)               | PostgreSQL 17                                                                |
| Builds and deploys | GitHub Actions (`.github/workflows`)                                               | Every pull request: tests, then a preview. Every merge to `main`: production |
| Contact form       | Cloudflare Turnstile (bot check), Resend (alert emails)                            | Messages are stored first, emailed second                                    |
| Old address        | GitHub Pages, repository `starsagitarian.github.io`                                | Redirects to the site, keeping the path (source: `deploy/github-pages`)      |
| Daily clean-up     | Vercel Cron, 03:17 UTC                                                             | Deletes contact messages older than 12 months                                |
| Visitor statistics | Vercel Web Analytics and Speed Insights (site project → Analytics, Speed Insights) | No cookies; switched on once in Vercel, loaded only on Vercel                |

Secrets live in two places only: the repository's GitHub secrets (used by the deploy workflow)
and the Vercel projects' environment variables. Never in the repository.

## Everyday changes

Every change goes the same way: a branch, a pull request (CI tests it and deploys a preview),
then a merge to `main`, which deploys production in about ten minutes.

### Update the projects or the résumé

All the content (profile, experience, skills, certifications, education, projects) is in
[`apps/api/src/db/seeders/content.ts`](apps/api/src/db/seeders/content.ts).

1. Edit `content.ts`.
2. Refresh the copy the site falls back on when the API is unreachable (a test fails if you
   forget): `npm run snapshot -w @starsagitarian/api`
3. Open a pull request. Check the preview link it posts.
4. Merge. The deploy makes the live database exactly match `content.ts`, in one transaction
   (`npm run db:sync-content`; contact messages are never touched), then rebuilds the site. The
   CV PDF comes from the same content, so it updates too.

A new project needs `slug`, `title`, `organisation` (or `null`), `summary`, `body` (paragraphs
separated by a blank line), `tags` (`web`, `cloud`, `data`), `technologies`, `featured` and
`repoUrl` (or `null`). It gets a drawing for its tag automatically; a drawing of its own goes in
[`ProjectArt.tsx`](apps/web/src/components/projects/ProjectArt.tsx).

LinkedIn keeps link previews for a while: after changing a page's title or summary, paste its
address into [LinkedIn's Post Inspector](https://www.linkedin.com/post-inspector/) to refresh it.

### Change the logo or the artwork

- Logo (`design/brand/starsagitarian-logo.png`): `npm run icons -w @starsagitarian/web` rebuilds
  the home-screen icons and the pictures the link previews are drawn with.
- Painting or character: replace the files in `apps/web/public/art`, keeping the names and sizes.

### When a page is meant to look different

CI compares the main pages with reference pictures. After an intended visual change, with a
production build running (`docker compose up --build`, or `next start`), remake them and commit
the new pictures with the change: `npm run test:visual:update`

## Checking it is well

- `https://starsagitarian-api.vercel.app/health?deep=1` should say `"database":"up"`.
- Each deploy ends with a smoke test of the live site; its summary (GitHub → Actions → the run)
  lists the addresses.
- Each pull request's CI summary shows Lighthouse scores and timings for the main pages.
- Visitors: Vercel → `starsagitarian` → **Analytics** (pages, where visitors come from, devices) and
  **Speed Insights** (real visitors' loading and responsiveness, Interaction to Next Paint
  included). Both start counting once switched on there (Enable), and count nothing locally.
- Logs: Vercel → project → Logs. The API logs a line per request, never message contents or
  visitors' details.

## When something goes wrong

### A deploy broke the site

1. Put the last good version back at once: Vercel → project → Deployments → the previous
   production deployment → Instant Rollback (do the same for the API project if it was the API).
2. Then fix it properly: revert the bad commit (`git revert <commit>`) in a pull request and merge.
   The next deploy replaces the rollback.

### The API or the database is down

The site keeps working: pages are built ahead, and if the API cannot be reached the site uses
the copy of the content it carries. Only the contact form stops (it says so). Check
`/health?deep=1`, the Neon console (a free database that has been idle starts again on the first
request, which takes a moment) and Vercel's logs for the API.

### The database is lost or damaged

- Neon can restore a branch to an earlier moment within its restore window (Neon console →
  the project → Branches → `production` → Restore). Check the window for the plan in use.
- Failing that, start again: create an empty database (or branch), point the deploy at it (the
  `NEON_PROJECT_ID` variable, or the branch), and run the deploy. It creates every table and
  loads all the content from the repository. Only contact messages would be lost, and each of
  those also reached your inbox.

### A secret leaked, or is about to expire

Replace it where it lives, then run the deploy: merge anything, or re-run the latest CI run on
`main` (GitHub → Actions → CI → the latest run on `main` → Re-run all jobs).

| Secret                                       | Where to make a new one                                                         | Where it goes                  |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| `VERCEL_TOKEN` (expires 12 Nov 2027)         | Vercel → Account settings → Tokens                                              | GitHub secret                  |
| `NEON_API_KEY`                               | Neon → Account settings → API keys                                              | GitHub secret                  |
| `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → the widget → Rotate                                    | GitHub secrets                 |
| `RESEND_API_KEY`                             | Resend → API keys                                                               | GitHub secret                  |
| `CONTACT_ALERT_EMAIL`                        | (your address; on Resend's free plan, the account's own)                        | GitHub secret                  |
| `IP_HASH_SALT`, `CRON_SECRET`                | Delete them in Vercel (`starsagitarian-api` → Settings → Environment Variables) | Made afresh by the next deploy |

Revoke the old key once the deploy is green.

### Contact alerts stopped arriving

Messages are stored before the email is sent, so none are lost. Check Resend's dashboard (Logs):
a 403 there usually means `CONTACT_ALERT_EMAIL` no longer matches the Resend account.

### A wave of spam

- Messages without JavaScript skip the bot check and are capped at 5 a day site-wide. To refuse
  them all, set `CONTACT_UNCHECKED_PER_DAY` to `0` on the API project in Vercel and redeploy.
- If spam passes the bot check itself, rotate the Turnstile keys and raise the widget's
  difficulty in Cloudflare.

### A returning visitor sees an old version

The service worker keeps pages for offline use, but each deploy installs a new one that clears
the old copies, and pages always come from the network first when it is there. A reload fixes
it; in the worst case, the browser's site settings → Clear data.

## Free plans: what to keep an eye on

| Service              | Limit worth knowing                                                  |
| -------------------- | -------------------------------------------------------------------- |
| Vercel Hobby         | Personal, non-commercial use; generous bandwidth and function limits |
| Neon Free            | Small storage and compute; the database sleeps when idle             |
| Resend Free          | 100 emails a day, sent to the account's own address                  |
| Cloudflare Turnstile | Free                                                                 |
| GitHub Actions       | Free for public repositories                                         |

## Running everything locally

`docker compose up --build` starts the database, the API and the site on this machine
(http://localhost:3000), with the content loaded and the bot check in test mode. See the README
for development without Docker.
