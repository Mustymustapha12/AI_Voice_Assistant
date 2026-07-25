# Local Development Setup

## Supported environment

| Tool           | Minimum |                      Recommended |
| -------------- | ------: | -------------------------------: |
| Node.js        |   22.14 |      Version pinned in Docker/CI |
| pnpm           |      10 | Version in root `packageManager` |
| Docker Engine  |      25 |                   Current stable |
| Docker Compose |    2.24 |                   Current stable |

Use an LTS Node runtime. The local machine's Node version may be newer, but CI and runtime images
are the compatibility authority.

## First-time setup

```bash
corepack enable
cp .env.example .env
pnpm install
pnpm db:generate
docker compose up -d postgres redis
pnpm validate
```

The default `.env` values are for local development only. Never reuse them in shared or production
environments.

## Start the platform

Run all application processes locally:

```bash
pnpm dev
```

Or run them independently:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:worker
```

PostgreSQL and Redis remain in Docker. Stop them with:

```bash
docker compose down
```

Preserve local data by default. To deliberately delete local volumes:

```bash
docker compose down --volumes
```

This command destroys the local PostgreSQL and Redis data volumes.

## Run the complete container stack

```bash
docker compose --profile application up --build
```

Application images use production builds and non-root runtime users. The admin UI is available on
port 3000 and the API on port 3001.

## Database workflow

Generate the Prisma client after installation or schema changes:

```bash
pnpm db:generate
```

Once a bounded context introduces a reviewed model, create a development migration:

```bash
pnpm db:migrate
```

Apply committed migrations in non-development environments:

```bash
pnpm db:deploy
```

Do not use `prisma db push` for shared environments. Migrations must be reviewed, forward-compatible,
and owned by a bounded context.

## Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm validate` runs the complete sequence. A commit hook formats and lints staged files, while CI
is the final enforcement point.

## Health and API documentation

```bash
curl http://localhost:3001/api/v1/health/live
curl http://localhost:3001/api/v1/health/ready
```

OpenAPI UI is at `http://localhost:3001/docs`; JSON is at
`http://localhost:3001/docs/openapi.json`. Set `CONTROL_API_SWAGGER_ENABLED=false` to disable it.

## Environment troubleshooting

### API fails with invalid configuration

Compare `.env` with `.env.example`. `DATABASE_URL` must be a PostgreSQL URL, ports must be valid
integers, and booleans must be `true` or `false`.

### Readiness reports PostgreSQL or Redis unavailable

```bash
docker compose ps
docker compose logs postgres
docker compose logs redis
```

Wait for both dependencies to become healthy. Confirm that local processes use `localhost` while
Compose application services use the service names `postgres` and `redis`.

### Prisma client is missing

```bash
pnpm db:generate
```

### Workspace dependency resolution is stale

```bash
pnpm install --frozen-lockfile
```

Avoid deleting lockfiles as a first response. Dependency updates should be intentional and reviewed.
