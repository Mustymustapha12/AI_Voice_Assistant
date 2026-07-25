import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { ApplicationError } from '@avc/http';

import {
  normalizeEmail,
  permissionsForRole,
  PERMISSIONS,
  type AuthenticatedPrincipal,
  type IdentityUser,
  type Permission,
} from '../domain/model.js';

import type {
  AccessTokenService,
  AuditView,
  IdentityStore,
  LoginHistoryView,
  NewSession,
  PasswordHasher,
  RequestMetadata,
  SessionView,
  TransactionalEmail,
} from './ports.js';

const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const TOO_MANY_REQUESTS = 429;
const SERVICE_UNAVAILABLE = 503;

export interface IdentitySecurityConfiguration {
  readonly accessTokenTtlSeconds: number;
  readonly frontendUrl: string;
  readonly passwordResetTokenTtlMinutes: number;
  readonly refreshTokenTtlDays: number;
  readonly verificationTokenTtlHours: number;
}

export interface AuthenticationResult {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly user: PublicUser;
}

export interface PublicUser {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly mustChangePassword: boolean;
  readonly permissions: readonly string[];
  readonly role: 'SUPER_ADMIN' | 'ADMIN';
  readonly status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED';
}

function toPublicUser(user: IdentityUser): PublicUser {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    mustChangePassword: user.mustChangePassword,
    permissions: permissionsForRole(user.role),
    role: user.role,
    status: user.status,
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

function addMilliseconds(now: Date, milliseconds: number): Date {
  return new Date(now.getTime() + milliseconds);
}

export class IdentityApplicationService {
  public constructor(
    private readonly store: IdentityStore,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly email: TransactionalEmail,
    private readonly configuration: IdentitySecurityConfiguration,
  ) {}

  public async login(
    email: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const normalizedEmail = normalizeEmail(email);
    const now = new Date();
    const failedSince = addMilliseconds(now, -15 * 60 * 1_000);
    const failedAttempts = await this.store.countRecentFailedLogins(normalizedEmail, failedSince);

    if (failedAttempts >= 5) {
      await this.store.recordLogin({
        failureReason: 'too_many_failed_attempts',
        metadata,
        normalizedEmail,
        outcome: 'RATE_LIMITED',
      });
      throw new ApplicationError('Too many login attempts. Try again later.', {
        code: 'AUTH_RATE_LIMITED',
        status: TOO_MANY_REQUESTS,
      });
    }

    const user = await this.store.findUserByEmail(normalizedEmail);
    const passwordValid = await this.passwordHasher.verify(user?.passwordHash ?? null, password);

    if (!passwordValid || user === null) {
      await this.store.recordLogin({
        failureReason: 'invalid_credentials',
        metadata,
        normalizedEmail,
        outcome: 'INVALID_CREDENTIALS',
        ...(user === null ? {} : { userId: user.id }),
      });
      throw new ApplicationError('Invalid email or password.', {
        code: 'AUTH_INVALID_CREDENTIALS',
        status: UNAUTHORIZED,
      });
    }

    if (user.status === 'PENDING_VERIFICATION') {
      await this.store.recordLogin({
        failureReason: 'email_unverified',
        metadata,
        normalizedEmail,
        outcome: 'EMAIL_UNVERIFIED',
        userId: user.id,
      });
      throw new ApplicationError('Verify your email before signing in.', {
        code: 'AUTH_EMAIL_UNVERIFIED',
        status: FORBIDDEN,
      });
    }

    if (user.status !== 'ACTIVE') {
      await this.store.recordLogin({
        failureReason: 'account_disabled',
        metadata,
        normalizedEmail,
        outcome: 'ACCOUNT_DISABLED',
        userId: user.id,
      });
      throw new ApplicationError('This account is unavailable.', {
        code: 'AUTH_ACCOUNT_DISABLED',
        status: FORBIDDEN,
      });
    }

    const result = await this.createAuthenticationResult(user, metadata);
    await Promise.all([
      this.store.updateSuccessfulLogin(user.id, now),
      this.store.recordLogin({
        metadata,
        normalizedEmail,
        outcome: 'SUCCESS',
        userId: user.id,
      }),
      this.store.recordAudit({
        action: 'identity.login',
        actorUserId: user.id,
        metadata,
        outcome: 'SUCCESS',
        resourceId: user.id,
        resourceType: 'user',
      }),
    ]);
    return result;
  }

  public async refresh(
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const parsed = this.parseRefreshToken(refreshToken);
    const current = await this.store.findSession(parsed.sessionId);

    if (current === null || !tokenMatches(parsed.secret, current.tokenHash)) {
      throw new ApplicationError('Invalid refresh token.', {
        code: 'AUTH_INVALID_REFRESH_TOKEN',
        status: UNAUTHORIZED,
      });
    }

    if (current.revokedAt !== null) {
      await this.store.revokeSessionFamily(current.familyId, 'refresh_token_reuse_detected');
      await this.store.recordAudit({
        action: 'identity.refresh-token-reuse',
        actorUserId: current.user.id,
        metadata,
        outcome: 'FAILURE',
        resourceId: current.id,
        resourceType: 'session',
      });
      throw new ApplicationError('The session is no longer valid.', {
        code: 'AUTH_SESSION_REVOKED',
        status: UNAUTHORIZED,
      });
    }

    const now = new Date();
    if (current.expiresAt <= now || current.user.status !== 'ACTIVE') {
      await this.store.revokeSession(current.id, current.user.id, 'expired_or_inactive');
      throw new ApplicationError('The session has expired.', {
        code: 'AUTH_SESSION_EXPIRED',
        status: UNAUTHORIZED,
      });
    }

    const replacement = this.newSession(metadata, current.familyId);
    const rotated = await this.store.rotateSession({
      currentSessionId: current.id,
      now,
      replacement: replacement.session,
      userId: current.user.id,
    });
    if (!rotated) {
      await this.store.revokeSessionFamily(current.familyId, 'concurrent_refresh_detected');
      throw new ApplicationError('The session is no longer valid.', {
        code: 'AUTH_SESSION_REVOKED',
        status: UNAUTHORIZED,
      });
    }

    return {
      accessToken: await this.accessTokens.issue(current.user, replacement.session.id),
      expiresIn: this.configuration.accessTokenTtlSeconds,
      refreshToken: replacement.rawToken,
      user: toPublicUser(current.user),
    };
  }

  public async authenticateAccessToken(token: string): Promise<AuthenticatedPrincipal> {
    const claims = await this.accessTokens.verify(token);
    const [user, session] = await Promise.all([
      this.store.findUserById(claims.userId),
      this.store.findSession(claims.sessionId),
    ]);
    if (user === null || session === null) {
      throw new ApplicationError('Authentication is required.', {
        code: 'AUTH_UNAUTHORIZED',
        status: UNAUTHORIZED,
      });
    }
    if (
      user.status !== 'ACTIVE' ||
      session.user.id !== user.id ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date()
    ) {
      throw new ApplicationError('Authentication is required.', {
        code: 'AUTH_UNAUTHORIZED',
        status: UNAUTHORIZED,
      });
    }
    return {
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      permissions: permissionsForRole(user.role),
      role: user.role,
      sessionId: claims.sessionId,
      userId: user.id,
    };
  }

  public async currentUser(userId: string): Promise<PublicUser> {
    const user = await this.requireUser(userId);
    return toPublicUser(user);
  }

  public async changePassword(
    actor: AuthenticatedPrincipal,
    currentPassword: string,
    newPassword: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.requireUser(actor.userId);
    if (
      user.passwordHash === null ||
      !(await this.passwordHasher.verify(user.passwordHash, currentPassword))
    ) {
      throw new ApplicationError('The current password is incorrect.', {
        code: 'AUTH_INVALID_CURRENT_PASSWORD',
        status: UNAUTHORIZED,
      });
    }
    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.store.changePassword({
      passwordHash,
      userId: user.id,
      changedAt: new Date(),
    });
    await this.store.revokeOtherUserSessions(user.id, actor.sessionId, 'password_changed');
    await this.store.recordAudit({
      action: 'identity.password-changed',
      actorUserId: user.id,
      metadata,
      outcome: 'SUCCESS',
      resourceId: user.id,
      resourceType: 'user',
    });
  }

  public async logout(userId: string, sessionId: string, metadata: RequestMetadata): Promise<void> {
    await this.store.revokeSession(sessionId, userId, 'user_logout');
    await this.store.recordAudit({
      action: 'identity.logout',
      actorUserId: userId,
      metadata,
      outcome: 'SUCCESS',
      resourceId: sessionId,
      resourceType: 'session',
    });
  }

  public async forgotPassword(email: string, metadata: RequestMetadata): Promise<void> {
    const user = await this.store.findUserByEmail(normalizeEmail(email));
    if (user?.status !== 'ACTIVE') {
      return;
    }
    const token = createOpaqueToken();
    await this.store.createPasswordResetToken({
      expiresAt: addMilliseconds(
        new Date(),
        this.configuration.passwordResetTokenTtlMinutes * 60 * 1_000,
      ),
      tokenHash: hashToken(token),
      userId: user.id,
    });
    try {
      await this.email.sendPasswordReset({
        displayName: user.displayName,
        email: user.email,
        resetUrl: `${this.configuration.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
      });
    } catch (error) {
      await this.store.recordAudit({
        action: 'identity.password-reset-email',
        actorUserId: user.id,
        metadata,
        outcome: 'FAILURE',
        resourceId: user.id,
        resourceType: 'user',
        details: { deliveryError: error instanceof Error ? error.name : 'unknown' },
      });
      // Recovery responses remain indistinguishable to prevent account enumeration.
    }
  }

  public async resetPassword(
    token: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.store.consumePasswordResetToken({
      now: new Date(),
      passwordHash,
      tokenHash: hashToken(token),
    });
    if (user === null) {
      throw new ApplicationError('The reset token is invalid or expired.', {
        code: 'AUTH_INVALID_RESET_TOKEN',
        status: UNAUTHORIZED,
      });
    }
    await this.store.revokeAllUserSessions(user.id, 'password_reset');
    await this.store.recordAudit({
      action: 'identity.password-reset',
      actorUserId: user.id,
      metadata,
      outcome: 'SUCCESS',
      resourceId: user.id,
      resourceType: 'user',
    });
  }

  public async verifyEmail(
    token: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.store.consumeEmailVerificationToken({
      now: new Date(),
      passwordHash,
      tokenHash: hashToken(token),
    });
    if (user === null) {
      throw new ApplicationError('The verification token is invalid or expired.', {
        code: 'AUTH_INVALID_VERIFICATION_TOKEN',
        status: UNAUTHORIZED,
      });
    }
    await this.store.recordAudit({
      action: 'identity.email-verified',
      actorUserId: user.id,
      metadata,
      outcome: 'SUCCESS',
      resourceId: user.id,
      resourceType: 'user',
    });
  }

  public async createAdmin(
    actor: AuthenticatedPrincipal,
    input: { readonly displayName: string; readonly email: string },
    metadata: RequestMetadata,
  ): Promise<PublicUser> {
    this.requireSuperAdmin(actor);
    const normalizedEmail = normalizeEmail(input.email);
    if ((await this.store.findUserByEmail(normalizedEmail)) !== null) {
      throw new ApplicationError('A user with this email already exists.', {
        code: 'IDENTITY_EMAIL_EXISTS',
        status: CONFLICT,
      });
    }
    const user = await this.store.createAdmin({
      displayName: input.displayName.trim(),
      email: input.email.trim(),
      normalizedEmail,
    });
    const token = createOpaqueToken();
    await this.store.createEmailVerificationToken({
      expiresAt: addMilliseconds(
        new Date(),
        this.configuration.verificationTokenTtlHours * 60 * 60 * 1_000,
      ),
      tokenHash: hashToken(token),
      userId: user.id,
    });
    try {
      await this.email.sendAdminInvitation({
        displayName: user.displayName,
        email: user.email,
        verificationUrl: `${this.configuration.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`,
      });
    } catch (error) {
      await this.store.recordAudit({
        action: 'identity.admin-invitation-email',
        actorUserId: actor.userId,
        metadata,
        outcome: 'FAILURE',
        resourceId: user.id,
        resourceType: 'user',
      });
      throw new ApplicationError('The admin was created but invitation delivery failed.', {
        cause: error,
        code: 'EMAIL_DELIVERY_UNAVAILABLE',
        status: SERVICE_UNAVAILABLE,
      });
    }
    await this.store.recordAudit({
      action: 'identity.admin-created',
      actorUserId: actor.userId,
      metadata,
      outcome: 'SUCCESS',
      resourceId: user.id,
      resourceType: 'user',
    });
    return toPublicUser(user);
  }

  public async removeAdmin(
    actor: AuthenticatedPrincipal,
    userId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    this.requireSuperAdmin(actor);
    const target = await this.requireUser(userId);
    if (target.role !== 'ADMIN') {
      throw new ApplicationError('Only admin accounts can be removed by this operation.', {
        code: 'IDENTITY_INVALID_ROLE_TRANSITION',
        status: FORBIDDEN,
      });
    }
    await this.store.revokeAllUserSessions(userId, 'admin_removed');
    if (!(await this.store.deleteAdmin(userId))) {
      throw new ApplicationError('Admin not found.', {
        code: 'IDENTITY_USER_NOT_FOUND',
        status: NOT_FOUND,
      });
    }
    await this.store.recordAudit({
      action: 'identity.admin-removed',
      actorUserId: actor.userId,
      metadata,
      outcome: 'SUCCESS',
      resourceId: userId,
      resourceType: 'user',
    });
  }

  public async listAdmins(actor: AuthenticatedPrincipal): Promise<readonly PublicUser[]> {
    this.requirePermission(actor, PERMISSIONS.USERS_READ);
    return (await this.store.listAdmins()).map(toPublicUser);
  }

  public async listSessions(
    actor: AuthenticatedPrincipal,
    requestedUserId?: string,
  ): Promise<readonly SessionView[]> {
    const userId = requestedUserId ?? actor.userId;
    if (userId !== actor.userId) {
      this.requirePermission(actor, PERMISSIONS.SESSIONS_MANAGE);
    }
    return this.store.listSessions(userId);
  }

  public async revokeManagedSession(
    actor: AuthenticatedPrincipal,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const session = await this.store.findSession(sessionId);
    if (session === null) {
      throw new ApplicationError('Session not found.', {
        code: 'IDENTITY_SESSION_NOT_FOUND',
        status: NOT_FOUND,
      });
    }
    if (session.user.id !== actor.userId) {
      this.requirePermission(actor, PERMISSIONS.SESSIONS_MANAGE);
    }
    await this.store.revokeSession(session.id, session.user.id, 'administrative_revocation');
    await this.store.recordAudit({
      action: 'identity.session-revoked',
      actorUserId: actor.userId,
      metadata,
      outcome: 'SUCCESS',
      resourceId: session.id,
      resourceType: 'session',
    });
  }

  public async listAuditLogs(
    actor: AuthenticatedPrincipal,
    limit: number,
  ): Promise<readonly AuditView[]> {
    this.requirePermission(actor, PERMISSIONS.AUDIT_READ);
    return this.store.listAuditLogs(limit);
  }

  public async listLoginHistory(
    actor: AuthenticatedPrincipal,
    limit: number,
  ): Promise<readonly LoginHistoryView[]> {
    this.requirePermission(actor, PERMISSIONS.LOGIN_HISTORY_READ);
    return this.store.listLoginHistory(limit);
  }

  private async createAuthenticationResult(
    user: IdentityUser,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const created = this.newSession(metadata, randomUUID());
    await this.store.createSession(user.id, created.session);
    return {
      accessToken: await this.accessTokens.issue(user, created.session.id),
      expiresIn: this.configuration.accessTokenTtlSeconds,
      refreshToken: created.rawToken,
      user: toPublicUser(user),
    };
  }

  private newSession(
    metadata: RequestMetadata,
    familyId: string,
  ): { readonly rawToken: string; readonly session: NewSession } {
    const id = randomUUID();
    const secret = createOpaqueToken();
    return {
      rawToken: `${id}.${secret}`,
      session: {
        expiresAt: addMilliseconds(
          new Date(),
          this.configuration.refreshTokenTtlDays * 24 * 60 * 60 * 1_000,
        ),
        familyId,
        id,
        tokenHash: hashToken(secret),
        ...(metadata.ipAddress === undefined ? {} : { ipAddress: metadata.ipAddress }),
        ...(metadata.userAgent === undefined ? {} : { userAgent: metadata.userAgent }),
      },
    };
  }

  private parseRefreshToken(token: string): {
    readonly secret: string;
    readonly sessionId: string;
  } {
    const separator = token.indexOf('.');
    if (separator <= 0 || separator === token.length - 1) {
      throw new ApplicationError('Invalid refresh token.', {
        code: 'AUTH_INVALID_REFRESH_TOKEN',
        status: UNAUTHORIZED,
      });
    }
    return {
      secret: token.slice(separator + 1),
      sessionId: token.slice(0, separator),
    };
  }

  private async requireUser(userId: string): Promise<IdentityUser> {
    const user = await this.store.findUserById(userId);
    if (user === null) {
      throw new ApplicationError('User not found.', {
        code: 'IDENTITY_USER_NOT_FOUND',
        status: NOT_FOUND,
      });
    }
    return user;
  }

  private requireSuperAdmin(actor: AuthenticatedPrincipal): void {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ApplicationError('Only a super admin may manage admins.', {
        code: 'AUTH_FORBIDDEN',
        status: FORBIDDEN,
      });
    }
  }

  private requirePermission(actor: AuthenticatedPrincipal, permission: Permission): void {
    if (!actor.permissions.includes(permission)) {
      throw new ApplicationError('You do not have permission for this operation.', {
        code: 'AUTH_FORBIDDEN',
        status: FORBIDDEN,
      });
    }
  }
}
