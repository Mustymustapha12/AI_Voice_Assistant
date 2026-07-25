# syntax=docker/dockerfile:1.7
FROM node:22.17.1-alpine3.22 AS build

ARG NEXT_PUBLIC_CONTROL_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_CONTROL_API_URL=$NEXT_PUBLIC_CONTROL_API_URL
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /workspace

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @avc/admin-web... build

FROM node:22.17.1-alpine3.22 AS runtime

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /workspace/apps/admin-web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /workspace/apps/admin-web/.next/static ./apps/admin-web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/admin-web/server.js"]
