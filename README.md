# AI Voice Commerce Platform

Production-grade enterprise SaaS foundation for configurable multilingual AI voice commerce.

> **Current phase:** Phase 2 enterprise authentication. Tenant business behavior,
> catalog, AI, telephony, payments, and messaging are intentionally not implemented.

## Repository structure

```text
apps/
  admin-web/       Next.js administration shell
  control-api/     NestJS/Fastify control-plane API shell
  event-worker/    NestJS standalone BullMQ worker shell
packages/
  config/          Runtime environment validation
  contracts/       Transport-neutral API contracts
  shared-kernel/   Reserved stable domain primitives
  testing/         Shared test utilities
  platform/
    cache/         Redis lifecycle and connectivity
    database/      Prisma/PostgreSQL lifecycle
    http/          Centralized errors and HTTP concerns
    observability/ Structured, redacted logging
    queue/         BullMQ infrastructure
```

## Prerequisites

- Node.js 22.14 or newer
- pnpm 10 or newer through Corepack
- Docker Engine with Docker Compose v2

## Quick start

```bash
corepack enable
cp .env.example .env
pnpm install
pnpm db:generate
docker compose up -d postgres redis
pnpm dev
```

Services:

| Service     | Address                                     |
| ----------- | ------------------------------------------- |
| Admin web   | `http://localhost:3000`                     |
| Control API | `http://localhost:3001/api/v1`              |
| OpenAPI UI  | `http://localhost:3001/docs`                |
| Liveness    | `http://localhost:3001/api/v1/health/live`  |
| Readiness   | `http://localhost:3001/api/v1/health/ready` |

See [Local setup](docs/setup/LOCAL_DEVELOPMENT.md) for complete instructions and troubleshooting.

## Common commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm validate
pnpm db:generate
pnpm db:migrate
docker compose --profile application up --build
```

## Architectural guardrails

- TypeScript strict mode and additional safety flags are mandatory.
- Applications compose packages; packages never depend on applications.
- Domain packages must remain independent of NestJS, Prisma, Redis, BullMQ, and providers.
- External providers will be introduced only behind platform-owned ports.
- Redis/BullMQ jobs are not durable domain events. A Kafka-compatible broker remains planned for
  integration events.
- Every future tenant-owned persistence model must carry explicit tenant ownership and isolation.
- Public contracts are imported only through package entry points.

## Documentation

- [Software Architecture Document](docs/architecture/SOFTWARE_ARCHITECTURE.md)
- [Phase 1 foundation architecture](docs/architecture/PHASE_1_FOUNDATION.md)
- [Phase 2 enterprise authentication](docs/architecture/PHASE_2_ENTERPRISE_AUTHENTICATION.md)
- [Phase 2A QA report and local credentials](docs/qa/PHASE_2A_QA_REPORT.md)
- [Architecture decisions](docs/architecture/decisions/)
- [Local development](docs/setup/LOCAL_DEVELOPMENT.md)

## Security

Do not commit secrets or production data. Local `.env` files are ignored. Report vulnerabilities
privately to the repository owners rather than opening a public issue.

## License

Proprietary and confidential. All rights reserved.
