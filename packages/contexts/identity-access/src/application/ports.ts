import type { IdentityUser, PlatformRole } from '../domain/model.js';

export interface RequestMetadata {
  readonly correlationId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export interface NewSession {
  readonly expiresAt: Date;
  readonly familyId: string;
  readonly id: string;
  readonly ipAddress?: string;
  readonly tokenHash: string;
  readonly userAgent?: string;
}

export interface StoredSession {
  readonly expiresAt: Date;
  readonly familyId: string;
  readonly id: string;
  readonly revokedAt: Date | null;
  readonly tokenHash: string;
  readonly user: IdentityUser;
}

export interface SessionView {
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly id: string;
  readonly ipAddress: string | null;
  readonly lastUsedAt: Date;
  readonly revokedAt: Date | null;
  readonly userAgent: string | null;
}

export interface AuditView {
  readonly action: string;
  readonly actorUserId: string | null;
  readonly id: string;
  readonly outcome: 'SUCCESS' | 'FAILURE';
  readonly occurredAt: Date;
  readonly resourceId: string | null;
  readonly resourceType: string;
}

export interface LoginHistoryView {
  readonly failureReason: string | null;
  readonly id: string;
  readonly ipAddress: string | null;
  readonly occurredAt: Date;
  readonly outcome: string;
  readonly userAgent: string | null;
}

export interface IdentityStore {
  changePassword(input: {
    readonly changedAt: Date;
    readonly passwordHash: string;
    readonly userId: string;
  }): Promise<void>;
  createAdmin(input: {
    readonly displayName: string;
    readonly email: string;
    readonly normalizedEmail: string;
  }): Promise<IdentityUser>;
  deleteAdmin(userId: string): Promise<boolean>;
  findUserByEmail(normalizedEmail: string): Promise<IdentityUser | null>;
  findUserById(userId: string): Promise<IdentityUser | null>;
  listAdmins(): Promise<readonly IdentityUser[]>;
  createEmailVerificationToken(input: {
    readonly expiresAt: Date;
    readonly tokenHash: string;
    readonly userId: string;
  }): Promise<void>;
  consumeEmailVerificationToken(input: {
    readonly now: Date;
    readonly passwordHash: string;
    readonly tokenHash: string;
  }): Promise<IdentityUser | null>;
  createPasswordResetToken(input: {
    readonly expiresAt: Date;
    readonly tokenHash: string;
    readonly userId: string;
  }): Promise<void>;
  consumePasswordResetToken(input: {
    readonly now: Date;
    readonly passwordHash: string;
    readonly tokenHash: string;
  }): Promise<IdentityUser | null>;
  createSession(userId: string, session: NewSession): Promise<void>;
  findSession(sessionId: string): Promise<StoredSession | null>;
  rotateSession(input: {
    readonly currentSessionId: string;
    readonly now: Date;
    readonly replacement: NewSession;
    readonly userId: string;
  }): Promise<boolean>;
  revokeSession(sessionId: string, userId: string, reason: string): Promise<boolean>;
  revokeSessionFamily(familyId: string, reason: string): Promise<void>;
  revokeAllUserSessions(userId: string, reason: string): Promise<void>;
  revokeOtherUserSessions(userId: string, retainedSessionId: string, reason: string): Promise<void>;
  listSessions(userId: string): Promise<readonly SessionView[]>;
  updateSuccessfulLogin(userId: string, occurredAt: Date): Promise<void>;
  countRecentFailedLogins(normalizedEmail: string, since: Date): Promise<number>;
  recordLogin(input: {
    readonly failureReason?: string;
    readonly metadata: RequestMetadata;
    readonly normalizedEmail: string;
    readonly outcome:
      'SUCCESS' | 'INVALID_CREDENTIALS' | 'EMAIL_UNVERIFIED' | 'ACCOUNT_DISABLED' | 'RATE_LIMITED';
    readonly userId?: string;
  }): Promise<void>;
  recordAudit(input: {
    readonly action: string;
    readonly actorUserId?: string;
    readonly details?: Readonly<Record<string, string | number | boolean | null>>;
    readonly metadata: RequestMetadata;
    readonly outcome: 'SUCCESS' | 'FAILURE';
    readonly resourceId?: string;
    readonly resourceType: string;
  }): Promise<void>;
  listAuditLogs(limit: number): Promise<readonly AuditView[]>;
  listLoginHistory(limit: number): Promise<readonly LoginHistoryView[]>;
  bootstrapSuperAdmin(input: {
    readonly displayName: string;
    readonly email: string;
    readonly normalizedEmail: string;
    readonly passwordHash: string;
  }): Promise<IdentityUser>;
  countUsersByRole(role: PlatformRole): Promise<number>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string | null, password: string): Promise<boolean>;
}

export interface AccessTokenService {
  issue(user: IdentityUser, sessionId: string): Promise<string>;
  verify(token: string): Promise<{
    readonly sessionId: string;
    readonly userId: string;
  }>;
}

export interface TransactionalEmail {
  sendAdminInvitation(input: {
    readonly displayName: string;
    readonly email: string;
    readonly verificationUrl: string;
  }): Promise<void>;
  sendPasswordReset(input: {
    readonly displayName: string;
    readonly email: string;
    readonly resetUrl: string;
  }): Promise<void>;
}

export const IDENTITY_STORE = Symbol('IDENTITY_STORE');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const ACCESS_TOKEN_SERVICE = Symbol('ACCESS_TOKEN_SERVICE');
export const TRANSACTIONAL_EMAIL = Symbol('TRANSACTIONAL_EMAIL');
