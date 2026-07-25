# Phase 2A QA Report

- Date: 2026-07-25
- Scope: database migration, deterministic identity seed, first-login password rotation, and
  authentication regression
- Result: **Passed**
- Phase 3 gate: **Phase 2A validation complete**

## Applied migrations

The following migrations were applied to the running PostgreSQL 17 container with
`pnpm db:migrate`:

1. `20260725120000_identity_access_foundation`
2. `20260725180000_require_first_login_password_change`

PostgreSQL and Redis were healthy in Docker Compose. The seed ran twice. The first run created two
users; the second reconciled the same normalized-email records without duplicates or password
replacement.

## Default local credentials

These accounts are for local development and QA only. Never deploy them to a shared or production
environment.

| Role        | Name                 | Email                    | Password         | First-login action       |
| ----------- | -------------------- | ------------------------ | ---------------- | ------------------------ |
| Super Admin | System Administrator | `superadmin@example.com` | `SuperAdmin@123` | Password change required |
| Admin       | Test Admin           | `admin@example.com`      | `Admin@123`      | None                     |

The seed is blocked when `NODE_ENV=production` unless an operator explicitly sets
`ALLOW_DEFAULT_IDENTITY_SEED=true`. Existing user passwords are never overwritten by subsequent
seed runs.

## Service URLs

| Service        | URL                                       |
| -------------- | ----------------------------------------- |
| Admin frontend | `http://localhost:3000`                   |
| Login          | `http://localhost:3000/login`             |
| Control API    | `http://localhost:3001`                   |
| API base       | `http://localhost:3001/api/v1`            |
| Swagger UI     | `http://localhost:3001/docs`              |
| OpenAPI JSON   | `http://localhost:3001/docs/openapi.json` |
| Prisma Studio  | `http://localhost:5555`                   |
| PostgreSQL     | `localhost:5432`                          |
| Redis          | `localhost:6379`                          |

Start Prisma Studio with `pnpm db:studio`. It was verified to return HTTP 200 on port 5555.

## Login procedure

1. Start PostgreSQL and Redis with `docker compose up -d postgres redis`.
2. Run `pnpm db:migrate` and `pnpm db:seed`.
3. Configure a Base64-encoded `AUTH_JWT_SECRET`, then start the API and frontend.
4. Open `http://localhost:3000/login`.
5. Sign in with one of the local accounts above.
6. The seeded Super Admin is redirected to `/change-password` and cannot access other protected
   operations until a compliant replacement password is saved.
7. Admin enters the dashboard directly and cannot create/remove Admins, read security logs, manage
   another user's sessions, or modify global configuration.

## Frontend routes

| Route                 | Access              | Purpose                            |
| --------------------- | ------------------- | ---------------------------------- |
| `/`                   | Public              | Platform landing page              |
| `/login`              | Public              | Administrator sign-in              |
| `/forgot-password`    | Public              | Password recovery request          |
| `/reset-password`     | Public token        | Password reset completion          |
| `/verify-email`       | Public token        | Invitation/email verification      |
| `/change-password`    | Authenticated       | Required/voluntary password change |
| `/dashboard`          | Authenticated       | Platform overview                  |
| `/dashboard/sessions` | Authenticated       | Current-user session management    |
| `/dashboard/admins`   | Super Admin UI only | Admin invitation and removal       |

## Backend endpoints

| Method   | Endpoint                           | Protection                       |
| -------- | ---------------------------------- | -------------------------------- |
| `GET`    | `/api/v1/health/live`              | Public                           |
| `GET`    | `/api/v1/health/ready`             | Public                           |
| `POST`   | `/api/v1/auth/login`               | Public                           |
| `POST`   | `/api/v1/auth/refresh`             | Refresh cookie                   |
| `POST`   | `/api/v1/auth/forgot-password`     | Public                           |
| `POST`   | `/api/v1/auth/reset-password`      | Public, single-use token         |
| `POST`   | `/api/v1/auth/verify-email`        | Public, single-use token         |
| `GET`    | `/api/v1/auth/me`                  | Access JWT                       |
| `POST`   | `/api/v1/auth/change-password`     | Access JWT                       |
| `POST`   | `/api/v1/auth/logout`              | Access JWT                       |
| `GET`    | `/api/v1/auth/sessions`            | Access JWT                       |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | Access JWT, owner or permission  |
| `GET`    | `/api/v1/platform/admins`          | Access JWT + users read          |
| `POST`   | `/api/v1/platform/admins`          | Super Admin + admins manage      |
| `DELETE` | `/api/v1/platform/admins/:userId`  | Super Admin + admins manage      |
| `GET`    | `/api/v1/platform/audit-logs`      | Super Admin + audit read         |
| `GET`    | `/api/v1/platform/login-history`   | Super Admin + login-history read |

All endpoints from `/auth/me` through `/auth/sessions/:sessionId` and every `/platform/*` endpoint
are protected. When `mustChangePassword=true`, only `/auth/me`, `/auth/change-password`, and
`/auth/logout` are permitted.

## Environment variables

| Variable                                | Requirement / default                           |
| --------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                              | Optional; `development`                         |
| `APP_VERSION`                           | Optional; `0.1.0`                               |
| `LOG_LEVEL`                             | Optional; `info`                                |
| `CONTROL_API_HOST`                      | Optional; `0.0.0.0`                             |
| `CONTROL_API_PORT`                      | Optional; `3001`                                |
| `CONTROL_API_CORS_ORIGINS`              | Optional; `http://localhost:3000`               |
| `CONTROL_API_SWAGGER_ENABLED`           | Optional; `true`                                |
| `DATABASE_URL`                          | Required by API and database tooling            |
| `POSTGRES_DB`                           | Compose; `voice_commerce`                       |
| `POSTGRES_USER`                         | Compose; `voice_commerce`                       |
| `POSTGRES_PASSWORD`                     | Compose local default; replace outside local    |
| `REDIS_HOST`                            | Optional; `localhost`                           |
| `REDIS_PORT`                            | Optional; `6379`                                |
| `REDIS_PASSWORD`                        | Optional                                        |
| `REDIS_TLS`                             | Optional; `false`                               |
| `REDIS_DB`                              | Optional; `0`                                   |
| `EVENT_WORKER_CONCURRENCY`              | Optional; `5`                                   |
| `AUTH_JWT_SECRET`                       | Required by Control API; Base64, ≥32 bytes      |
| `AUTH_JWT_ISSUER`                       | Optional; `ai-voice-commerce`                   |
| `AUTH_JWT_AUDIENCE`                     | Optional; `ai-voice-commerce-admin`             |
| `AUTH_ACCESS_TOKEN_TTL_SECONDS`         | Optional; `900`                                 |
| `AUTH_REFRESH_TOKEN_TTL_DAYS`           | Optional; `30`                                  |
| `AUTH_VERIFICATION_TOKEN_TTL_HOURS`     | Optional; `24`                                  |
| `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES` | Optional; `30`                                  |
| `AUTH_FRONTEND_URL`                     | Optional; `http://localhost:3000`               |
| `SMTP_HOST`                             | Required for actual email delivery              |
| `SMTP_PORT`                             | Optional; `587`                                 |
| `SMTP_SECURE`                           | Optional; `false`                               |
| `SMTP_USER`                             | Provider-dependent                              |
| `SMTP_PASSWORD`                         | Provider-dependent                              |
| `SMTP_FROM`                             | Required for actual email delivery              |
| `NEXT_PUBLIC_CONTROL_API_URL`           | Frontend; `http://localhost:3001/api/v1`        |
| `ADMIN_WEB_PORT`                        | Local convention; `3000`                        |
| `SUPER_ADMIN_EMAIL`                     | Legacy one-time CLI bootstrap only              |
| `SUPER_ADMIN_DISPLAY_NAME`              | Legacy one-time CLI bootstrap only              |
| `SUPER_ADMIN_PASSWORD`                  | Legacy one-time CLI bootstrap only              |
| `ALLOW_DEFAULT_IDENTITY_SEED`           | Production-only explicit seed authorization     |
| `QA_API_BASE_URL`                       | Optional QA override; local API base by default |

## Executed validation

The repeatable `pnpm qa:auth` harness exercised the compiled API and live database, then restored
the requested seed credentials and first-login state.

| Validation                                        | Result |
| ------------------------------------------------- | ------ |
| Super Admin login and role                        | Passed |
| Required first-login password change enforcement  | Passed |
| Admin login and role                              | Passed |
| JWT structure and issuance                        | Passed |
| Refresh cookie and refresh-token rotation         | Passed |
| Admin forbidden from Admin creation/security logs | Passed |
| Super Admin management/read permissions           | Passed |
| Session persistence and listing                   | Passed |
| Forgot-password non-enumerating response          | Passed |
| Password reset and post-reset login               | Passed |
| Email verification and post-verification login    | Passed |
| Audit logs and login history                      | Passed |
| Logout and immediate access-token invalidation    | Passed |
| Seed second-run idempotency                       | Passed |
| Prisma Studio HTTP availability                   | Passed |
