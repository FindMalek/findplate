# Build context is the repo root: docker build -f docs/Dockerfile -t findplate-docs .
FROM node:24-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY docs/package.json docs/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN pnpm install --frozen-lockfile --filter findplate-docs...
COPY docs docs
COPY template/findplate.json template/findplate.json
COPY template/.ruler/skills template/.ruler/skills
COPY presets presets
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter findplate-docs build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/docs/.next/standalone ./
COPY --from=builder --chown=node:node /app/docs/.next/static ./docs/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "docs/server.js"]
