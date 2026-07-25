# syntax=docker/dockerfile:1.7
FROM node:22.17.1-alpine3.22 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /workspace

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter @avc/event-worker... build
RUN pnpm --filter @avc/event-worker deploy --prod --legacy /runtime

FROM node:22.17.1-alpine3.22 AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 --ingroup app app
COPY --from=build --chown=app:app /runtime ./

USER app
CMD ["node", "dist/main.js"]
