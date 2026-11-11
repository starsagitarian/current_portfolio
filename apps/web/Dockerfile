# syntax=docker/dockerfile:1
# Web image (Next.js standalone server). Build from the repository root:
#   docker build -f apps/web/Dockerfile -t starsagitarian-web .

# Keep the two Alpine versions in step: the node binary is built for that release.
ARG NODE_IMAGE=node:24-alpine3.24
ARG ALPINE_IMAGE=alpine:3.24

FROM ${NODE_IMAGE} AS build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
# Manifests first, so the install layer stays cached until dependencies change.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund \
      --workspace @starsagitarian/web --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @starsagitarian/web

# Runtime: plain Alpine plus the node binary. The official Node image also carries npm, Yarn
# and Corepack, which a running server never needs (about 40 MB).
FROM ${NODE_IMAGE} AS node
FROM ${ALPINE_IMAGE} AS runtime
RUN apk add --no-cache libstdc++ \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /sbin/nologin -D node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone output: a minimal server plus only the node_modules files it traced.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
# Next.js writes its render cache under .next; that folder alone belongs to the runtime user.
RUN chown -R node:node /app/apps/web/.next
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "apps/web/server.js"]
