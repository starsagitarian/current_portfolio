# syntax=docker/dockerfile:1
# REST API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t starsagitarian-api .
# The same image runs the server (default) and the database CLI (`node dist/db-cli.js <command>`).

# Keep the two Alpine versions in step: the node binary is built for that release.
ARG NODE_IMAGE=node:24-alpine3.24
ARG ALPINE_IMAGE=alpine:3.24

# Manifests only, so dependency layers stay cached until a package.json or the lockfile changes.
# Every workspace manifest is copied because the lockfile lists them all.
FROM ${NODE_IMAGE} AS manifests
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# Compile with tsup; the shared package is bundled into the output.
FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund \
      --workspace @starsagitarian/api --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @starsagitarian/api

# Runtime dependencies only.
FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
      --workspace @starsagitarian/api

# Runtime: plain Alpine plus the node binary. The official Node image also carries npm, Yarn
# and Corepack, which a running server never needs (about 40 MB).
FROM ${NODE_IMAGE} AS node
FROM ${ALPINE_IMAGE} AS runtime
LABEL org.opencontainers.image.source="https://github.com/starsagitarian/current_portfolio" \
      org.opencontainers.image.description="Portfolio REST API: Express 5, TypeScript, Sequelize, PostgreSQL" \
      org.opencontainers.image.licenses="MIT"
RUN apk add --no-cache libstdc++ \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /sbin/nologin -D node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps \
    PORT=4000
WORKDIR /app
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
# Files stay owned by root, so the process cannot modify its own code.
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/server.js"]
