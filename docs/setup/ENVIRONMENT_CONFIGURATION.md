# Environment Configuration

## Configuration policy

The repository root `.env` is the local-development configuration source. It is ignored by Git.
`.env.example` is a copy-ready development template and contains no private or production
credentials. The API and worker development commands load the root file explicitly; Docker Compose
interpolates the same file and replaces hostnames with service-local addresses where required.

Production environments must inject secrets through the deployment platform's secret manager. Do
not deploy `.env.example`, store production secrets in source control, or reuse its public
development JWT value.

Requirements in the tables mean:

- **Required**: the process cannot safely provide the capability without an explicitly injected
  value.
- **Conditional**: required only when the named service or capability is enabled.
- **No**: validated default or optional value exists. Explicit production configuration may still
  be recommended.
- **Reserved**: documented provider contract for a future phase; no Phase 2B code consumes it.

## Core, API, and frontend

| Variable                      | Consumer               | Development | Production | Purpose and guidance                                                                                                       |
| ----------------------------- | ---------------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                    | API, worker, web, seed | No          | Required   | Runtime mode: `development`, `test`, or `production`. Controls secure cookies and seed safeguards.                         |
| `APP_VERSION`                 | API, worker            | No          | Required   | Release identifier exposed in logs, health responses, and OpenAPI metadata. Use the immutable build version in production. |
| `LOG_LEVEL`                   | API, worker            | No          | No         | Structured-log threshold. Defaults to `info`; `debug` is useful locally.                                                   |
| `CONTROL_API_HOST`            | API                    | No          | No         | Bind address; defaults to `0.0.0.0`.                                                                                       |
| `CONTROL_API_PORT`            | API                    | No          | No         | API listener port; defaults to `3001`.                                                                                     |
| `CONTROL_API_CORS_ORIGINS`    | API                    | No          | Required   | Comma-separated browser origins. Use explicit trusted HTTPS origins in production.                                         |
| `CONTROL_API_SWAGGER_ENABLED` | API                    | No          | No         | Enables `/docs` and `/docs/openapi.json`; default is `true`. Disable externally in production unless access is controlled. |
| `ADMIN_WEB_PORT`              | Local convention       | No          | No         | Documents the local web port. Next.js uses its command-line/default port.                                                  |
| `NEXT_PUBLIC_CONTROL_API_URL` | Admin web              | No          | Required   | Browser-visible, versioned API base URL. This is embedded during the frontend build and is not a secret.                   |
| `EVENT_WORKER_CONCURRENCY`    | Worker                 | No          | No         | BullMQ worker concurrency, from `1` through `100`; defaults to `5`.                                                        |

## PostgreSQL and Redis

| Variable            | Consumer            | Development | Production  | Purpose and guidance                                                                                                                                    |
| ------------------- | ------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_DB`       | Docker Compose      | No          | Conditional | Database created by the Compose PostgreSQL image. The local default is `voice_commerce`. Managed production databases normally provide this externally. |
| `POSTGRES_USER`     | Docker Compose      | No          | Conditional | Compose database owner. Use a least-privilege application principal outside local development.                                                          |
| `POSTGRES_PASSWORD` | Docker Compose      | No          | Conditional | Compose database password. The public local default must never be used in production.                                                                   |
| `DATABASE_URL`      | API, worker, Prisma | Required    | Required    | PostgreSQL connection URL. Production credentials should come from a secret manager and enforce provider-appropriate TLS.                               |
| `REDIS_HOST`        | API, worker         | No          | Required    | Redis hostname; defaults to `localhost`. Compose applications use `redis`.                                                                              |
| `REDIS_PORT`        | API, worker         | No          | No          | Redis port; defaults to `6379`.                                                                                                                         |
| `REDIS_PASSWORD`    | API, worker         | No          | Conditional | Redis authentication secret. Required when the production Redis service requires authentication.                                                        |
| `REDIS_TLS`         | API, worker         | No          | No          | Enables TLS transport. Usually `true` for production managed Redis.                                                                                     |
| `REDIS_DB`          | API, worker         | No          | No          | Logical Redis database, default `0`. Prefer dedicated instances or namespaces for strong production isolation.                                          |

## Authentication and email

| Variable                                | Consumer            | Development | Production  | Purpose and guidance                                                                                                                                    |
| --------------------------------------- | ------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_JWT_SECRET`                       | API identity module | Required    | Required    | Base64-encoded secret containing at least 32 random bytes. Generate with `openssl rand -base64 48`; rotate through a controlled key-rotation procedure. |
| `AUTH_JWT_ISSUER`                       | API identity module | No          | Required    | Expected JWT issuer; defaults to `ai-voice-commerce`. Make it environment-specific in production.                                                       |
| `AUTH_JWT_AUDIENCE`                     | API identity module | No          | Required    | Expected JWT audience; defaults to `ai-voice-commerce-admin`.                                                                                           |
| `AUTH_ACCESS_TOKEN_TTL_SECONDS`         | API identity module | No          | No          | Access-token lifetime, 60–3600 seconds; default `900`.                                                                                                  |
| `AUTH_REFRESH_TOKEN_TTL_DAYS`           | API identity module | No          | No          | Refresh-session lifetime, 1–90 days; default `30`.                                                                                                      |
| `AUTH_VERIFICATION_TOKEN_TTL_HOURS`     | API identity module | No          | No          | Email-verification token lifetime, 1–168 hours; default `24`.                                                                                           |
| `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES` | API identity module | No          | No          | Password-reset token lifetime, 5–120 minutes; default `30`.                                                                                             |
| `AUTH_FRONTEND_URL`                     | API identity module | No          | Required    | Trusted frontend base URL used to construct verification and reset links.                                                                               |
| `SMTP_HOST`                             | SMTP adapter        | No          | Required    | SMTP server. If absent locally, email delivery is intentionally disabled and messages are logged without secrets.                                       |
| `SMTP_PORT`                             | SMTP adapter        | No          | No          | SMTP port, default `587`.                                                                                                                               |
| `SMTP_SECURE`                           | SMTP adapter        | No          | No          | Use implicit TLS, normally `true` for port `465`; STARTTLS providers commonly use `false` on `587`.                                                     |
| `SMTP_USER`                             | SMTP adapter        | No          | Conditional | SMTP username when the provider requires authentication.                                                                                                |
| `SMTP_PASSWORD`                         | SMTP adapter        | No          | Conditional | SMTP credential; always source from a secret manager in production.                                                                                     |
| `SMTP_FROM`                             | SMTP adapter        | No          | Required    | Verified sender mailbox or RFC 5322 sender identity.                                                                                                    |

Refresh tokens are opaque, cryptographically random values stored only as SHA-256 hashes, so
`AUTH_REFRESH_TOKEN_SECRET` is not used. The refresh cookie stores that opaque token and is validated
against server-side session state, so `COOKIE_SECRET` is not used. Phase 2B stores no reversible
sensitive application payload, so `ENCRYPTION_KEY` is not used. Adding unused secrets would create
false operational assurance; these variables will be introduced only with a documented consumer
and rotation model.

## Bootstrap, QA, and reserved providers

| Variable                      | Consumer                 | Development | Production  | Purpose and guidance                                                                                                                                       |
| ----------------------------- | ------------------------ | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN_EMAIL`           | Bootstrap command        | No          | Conditional | One-time Super Admin bootstrap identity. Remove after provisioning.                                                                                        |
| `SUPER_ADMIN_DISPLAY_NAME`    | Bootstrap command        | No          | Conditional | One-time bootstrap display name.                                                                                                                           |
| `SUPER_ADMIN_PASSWORD`        | Bootstrap command        | No          | Conditional | One-time bootstrap password. Inject temporarily and remove immediately after use.                                                                          |
| `ALLOW_DEFAULT_IDENTITY_SEED` | Prisma seed              | No          | Conditional | Explicit break-glass flag required to run deterministic default-account seeding with `NODE_ENV=production`. Never enable in a real production environment. |
| `QA_API_BASE_URL`             | Authentication QA script | No          | No          | API base used by `pnpm qa:auth`; defaults to the local versioned API URL.                                                                                  |
| `PAYSTACK_PUBLIC_KEY`         | Future payment adapter   | Reserved    | Reserved    | Paystack public/test key. Not consumed in Phase 2B.                                                                                                        |
| `PAYSTACK_SECRET_KEY`         | Future payment adapter   | Reserved    | Reserved    | Paystack server secret. It will be secret-manager backed when payments are implemented.                                                                    |
| `PAYSTACK_WEBHOOK_SECRET`     | Future payment adapter   | Reserved    | Reserved    | Webhook verification secret for the future adapter.                                                                                                        |
| `PAYSTACK_BASE_URL`           | Future payment adapter   | Reserved    | Reserved    | Provider endpoint, expected to default to `https://api.paystack.co`.                                                                                       |

## Secret generation and rotation

Create a unique development JWT secret:

```bash
openssl rand -base64 48
```

Assign the output only in the ignored `.env`. In production, generate it in the secret-management
system, restrict read access to the API workload, audit retrieval, and rotate using an overlap
strategy before invalidating the previous signing key. Never log secret values or expose them via
`NEXT_PUBLIC_*` variables.

## Local endpoints

| Capability    | URL                                       |
| ------------- | ----------------------------------------- |
| Admin web     | `http://localhost:3000`                   |
| API base      | `http://localhost:3001/api/v1`            |
| Swagger UI    | `http://localhost:3001/docs`              |
| OpenAPI JSON  | `http://localhost:3001/docs/openapi.json` |
| Prisma Studio | `http://localhost:5555`                   |
