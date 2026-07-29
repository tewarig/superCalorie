# superCalorie backend — self-hostable API and web UI.
#
# Build from the repository root, not from apps/web: the build needs the
# workspace root for the lockfile and the shared packages.
#
#   docker build -t supercalorie .
#   docker run -p 3000:3000 -v supercalorie-data:/data \
#     -e SESSION_SECRET=$(openssl rand -hex 32) supercalorie

# Node 22.5+ is the floor: the database driver is node:sqlite, which does not
# exist before it. Pinned to a digest-stable minor rather than 22-alpine so a
# rebuild months from now produces the same runtime.
FROM node:22.20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---------------------------------------------------------------------------
# Dependencies. Only manifests are copied first, so this layer is reused for
# every build where the dependency set hasn't changed.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
# --frozen-lockfile fails rather than silently resolving something new, which
# is what makes the image reproducible.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--experimental-sqlite
RUN pnpm --filter web exec next build

# ---------------------------------------------------------------------------
# Runtime — only the standalone output, no package manager, no sources.
# ---------------------------------------------------------------------------
FROM node:22.20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# node:sqlite is still behind a flag on Node 22; unnecessary from Node 24.
ENV NODE_OPTIONS=--experimental-sqlite
# Database and photos live on a volume, never in the image layer, or a
# redeploy would wipe every account.
ENV DATABASE_PATH=/data/supercalorie.db
ENV PHOTO_DIR=/data/photos

# --ingroup matters: without it BusyBox adduser drops the user into `nogroup`,
# and every chown to nextjs:nodejs below silently grants nothing.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir -p /data && chown -R nextjs:nodejs /data

# The standalone server, then the two directories it does not bundle itself.
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Standalone mirrors the workspace layout, so the server sits under apps/web.
CMD ["node", "apps/web/server.js"]
