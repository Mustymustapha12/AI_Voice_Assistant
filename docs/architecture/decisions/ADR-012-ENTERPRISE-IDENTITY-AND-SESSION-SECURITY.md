# ADR-012: Enterprise Identity, RBAC, and Session Security

- Status: Accepted
- Date: 2026-07-25
- Owners: Architecture and Security

## Context

The first identity boundary precedes tenant and company configuration. It requires secure
administrator onboarding, credential recovery, revocable sessions, RBAC, and security evidence
without coupling policy to NestJS, Prisma, SMTP, or a JWT library.

## Decision

Identity is the independent `@avc/identity-access` bounded context. Its application layer depends on
ports for persistence, password hashing, access tokens, and transactional email.

- There is no public registration endpoint. A controlled, one-time CLI operation bootstraps the
  first Super Admin.
- Only a Super Admin can invite or remove an Admin. No API can create or remove a Super Admin.
- Admin does not receive `identity.admins.manage`, `identity.sessions.manage`,
  `identity.audit.read`, or `platform.configuration.manage`.
- Invitations, password-reset tokens, and refresh credentials are random, hashed at rest,
  single-use or rotating, and expiring.
- Passwords use Argon2id. Password reset revokes all existing sessions.
- Access JWTs are short lived and session-bound. Opaque refresh credentials use Secure/HttpOnly
  cookies; replay revokes the token family.
- Recovery responses never disclose account existence or email delivery outcome.
- Login history and audit logs retain actor, action, target, outcome, correlation, IP, and user-agent
  evidence.

## Consequences

Authenticated calls validate live user and session state, enabling immediate revocation at the cost
of a database read. A Redis revocation cache may later optimize this without changing policy.

Roles are global only for this phase. Future tenant memberships and tenant-scoped role assignments
will be separate models; no company model is introduced now. SMTP is merely the first adapter and
can be replaced without application changes. A transactional outbox is planned with the notification
context.

## Security invariants

1. Admin cannot create/remove Admins or mutate future global configuration.
2. Admin can revoke only its own sessions.
3. Secrets and recovery credentials are never persisted in plaintext.
4. Refresh replay revokes its complete session family.
5. Password reset invalidates all active sessions.
6. Authentication failures are bounded, generic, and recorded.
