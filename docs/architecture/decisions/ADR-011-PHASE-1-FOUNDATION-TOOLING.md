# ADR-011: Phase 1 Foundation Tooling and Queue Boundary

- **Status:** Accepted
- **Date:** 2026-07-25
- **Decision owners:** Architecture and platform engineering

## Context

Phase 0 selected TypeScript, NestJS/Fastify, Next.js, PostgreSQL, Prisma, Redis, a durable
Kafka-compatible event broker, containers, and a pnpm/Nx monorepo. Phase 1 also requires BullMQ,
but using Redis jobs as if they were durable domain events would weaken the approved replay and
delivery architecture.

The foundation must compile and deploy before any bounded-context business behavior exists.

## Decision

1. Use pnpm workspaces with Nx task scheduling and caching.
2. Use Node.js 22 LTS as the minimum supported runtime.
3. Create three deployable shells: `control-api`, `admin-web`, and `event-worker`.
4. Place framework and vendor dependencies in `packages/platform/*`.
5. Keep `packages/shared-kernel` intentionally minimal.
6. Use Zod for process-boundary configuration validation and future request/form schemas.
7. Use BullMQ only for operational jobs and directed asynchronous commands.
8. Retain a Kafka-compatible broker as the future integration-event backbone.
9. Leave Prisma without domain models until owning bounded contexts are implemented.
10. Use shadcn/ui as source-owned components with Tailwind CSS and CSS-variable theming.

## Consequences

### Positive

- Business code can remain independent from frameworks and providers.
- Applications can scale and deploy independently.
- Local infrastructure is straightforward without misrepresenting its durability.
- Future domain migrations have an explicit owner.
- Frontend primitives are accessible, reviewable, and themeable.

### Negative

- More packages and composition code exist before features.
- A future durable broker adds another operated component.
- Package build order and runtime exports require disciplined workspace tooling.
- Empty infrastructure shells have short-term overhead.

## Alternatives rejected

- **Single application package:** weakens extraction seams and independent scaling.
- **Redis/BullMQ for all events:** lacks the long-term replay, partitioning, and durability model
  approved in Phase 0.
- **Prisma models for hypothetical entities:** would encode business assumptions before their
  implementation phase.
- **Provider SDKs in applications:** would make replacement and testing expensive.
- **Prebuilt UI component runtime:** reduces source control and customization of foundational UI.

## Compliance

CI must validate strict TypeScript, architecture imports, formatting, tests, builds, Prisma client
generation, and Docker Compose configuration. Any exception requires a superseding ADR.
