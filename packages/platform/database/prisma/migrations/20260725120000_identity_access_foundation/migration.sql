CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');
CREATE TYPE "LoginOutcome" AS ENUM ('SUCCESS', 'INVALID_CREDENTIALS', 'EMAIL_UNVERIFIED', 'ACCOUNT_DISABLED', 'RATE_LIMITED');
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

CREATE TABLE "identity_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(512),
    "role" "PlatformRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMPTZ(3),
    "password_changed_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "identity_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "replaced_by_session_id" UUID,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(120),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identity_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identity_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identity_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_login_history" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "normalized_email" VARCHAR(320) NOT NULL,
    "outcome" "LoginOutcome" NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "failure_reason" VARCHAR(120),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identity_login_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(160) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100),
    "outcome" "AuditOutcome" NOT NULL,
    "correlation_id" VARCHAR(128),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identity_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "identity_users_email_key" ON "identity_users"("email");
CREATE UNIQUE INDEX "identity_users_normalized_email_key" ON "identity_users"("normalized_email");
CREATE INDEX "identity_users_role_status_idx" ON "identity_users"("role", "status");
CREATE INDEX "identity_sessions_user_id_revoked_at_idx" ON "identity_sessions"("user_id", "revoked_at");
CREATE INDEX "identity_sessions_family_id_idx" ON "identity_sessions"("family_id");
CREATE INDEX "identity_sessions_expires_at_idx" ON "identity_sessions"("expires_at");
CREATE UNIQUE INDEX "identity_email_verification_tokens_token_hash_key" ON "identity_email_verification_tokens"("token_hash");
CREATE INDEX "identity_email_verification_tokens_user_id_expires_at_idx" ON "identity_email_verification_tokens"("user_id", "expires_at");
CREATE UNIQUE INDEX "identity_password_reset_tokens_token_hash_key" ON "identity_password_reset_tokens"("token_hash");
CREATE INDEX "identity_password_reset_tokens_user_id_expires_at_idx" ON "identity_password_reset_tokens"("user_id", "expires_at");
CREATE INDEX "identity_login_history_normalized_email_occurred_at_idx" ON "identity_login_history"("normalized_email", "occurred_at");
CREATE INDEX "identity_login_history_user_id_occurred_at_idx" ON "identity_login_history"("user_id", "occurred_at");
CREATE INDEX "identity_audit_logs_actor_user_id_occurred_at_idx" ON "identity_audit_logs"("actor_user_id", "occurred_at");
CREATE INDEX "identity_audit_logs_action_occurred_at_idx" ON "identity_audit_logs"("action", "occurred_at");
CREATE INDEX "identity_audit_logs_resource_type_resource_id_occurred_at_idx" ON "identity_audit_logs"("resource_type", "resource_id", "occurred_at");

ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_email_verification_tokens" ADD CONSTRAINT "identity_email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_password_reset_tokens" ADD CONSTRAINT "identity_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_login_history" ADD CONSTRAINT "identity_login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identity_audit_logs" ADD CONSTRAINT "identity_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "identity_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
