import { type PrismaService } from '@avc/database';
import { type User as PrismaUser } from '@prisma/client';

import type {
  AuditView,
  IdentityStore,
  LoginHistoryView,
  NewSession,
  SessionView,
  StoredSession,
} from '../application/ports.js';
import type { IdentityUser, PlatformRole } from '../domain/model.js';

function mapUser(user: PrismaUser): IdentityUser {
  return {
    createdAt: user.createdAt,
    displayName: user.displayName,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    id: user.id,
    lastLoginAt: user.lastLoginAt,
    mustChangePassword: user.mustChangePassword,
    normalizedEmail: user.normalizedEmail,
    passwordHash: user.passwordHash,
    role: user.role,
    status: user.status,
  };
}

export class PrismaIdentityStore implements IdentityStore {
  public constructor(private readonly database: PrismaService) {}

  public async changePassword(input: {
    readonly changedAt: Date;
    readonly passwordHash: string;
    readonly userId: string;
  }): Promise<void> {
    await this.database.user.update({
      data: {
        mustChangePassword: false,
        passwordChangedAt: input.changedAt,
        passwordHash: input.passwordHash,
        version: { increment: 1 },
      },
      where: { id: input.userId },
    });
  }

  public async createAdmin(input: {
    readonly displayName: string;
    readonly email: string;
    readonly normalizedEmail: string;
  }): Promise<IdentityUser> {
    return mapUser(
      await this.database.user.create({
        data: {
          displayName: input.displayName,
          email: input.email,
          normalizedEmail: input.normalizedEmail,
          role: 'ADMIN',
        },
      }),
    );
  }

  public async deleteAdmin(userId: string): Promise<boolean> {
    const result = await this.database.user.deleteMany({
      where: { id: userId, role: 'ADMIN' },
    });
    return result.count === 1;
  }

  public async findUserByEmail(normalizedEmail: string): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({ where: { normalizedEmail } });
    return user === null ? null : mapUser(user);
  }

  public async findUserById(userId: string): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({ where: { id: userId } });
    return user === null ? null : mapUser(user);
  }

  public async listAdmins(): Promise<readonly IdentityUser[]> {
    return (
      await this.database.user.findMany({
        orderBy: { createdAt: 'desc' },
        where: { role: 'ADMIN' },
      })
    ).map(mapUser);
  }

  public async createEmailVerificationToken(input: {
    readonly expiresAt: Date;
    readonly tokenHash: string;
    readonly userId: string;
  }): Promise<void> {
    await this.database.$transaction([
      this.database.emailVerificationToken.deleteMany({ where: { userId: input.userId } }),
      this.database.emailVerificationToken.create({ data: input }),
    ]);
  }

  public async consumeEmailVerificationToken(input: {
    readonly now: Date;
    readonly passwordHash: string;
    readonly tokenHash: string;
  }): Promise<IdentityUser | null> {
    return this.database.$transaction(async (transaction) => {
      const token = await transaction.emailVerificationToken.findFirst({
        where: {
          expiresAt: { gt: input.now },
          tokenHash: input.tokenHash,
          usedAt: null,
        },
      });
      if (token === null) {
        return null;
      }
      const consumed = await transaction.emailVerificationToken.updateMany({
        data: { usedAt: input.now },
        where: { id: token.id, usedAt: null },
      });
      if (consumed.count !== 1) {
        return null;
      }
      const user = await transaction.user.update({
        data: {
          emailVerifiedAt: input.now,
          passwordChangedAt: input.now,
          passwordHash: input.passwordHash,
          status: 'ACTIVE',
          version: { increment: 1 },
        },
        where: { id: token.userId },
      });
      await transaction.emailVerificationToken.deleteMany({
        where: { userId: token.userId, id: { not: token.id } },
      });
      return mapUser(user);
    });
  }

  public async createPasswordResetToken(input: {
    readonly expiresAt: Date;
    readonly tokenHash: string;
    readonly userId: string;
  }): Promise<void> {
    await this.database.$transaction([
      this.database.passwordResetToken.deleteMany({ where: { userId: input.userId } }),
      this.database.passwordResetToken.create({ data: input }),
    ]);
  }

  public async consumePasswordResetToken(input: {
    readonly now: Date;
    readonly passwordHash: string;
    readonly tokenHash: string;
  }): Promise<IdentityUser | null> {
    return this.database.$transaction(async (transaction) => {
      const token = await transaction.passwordResetToken.findFirst({
        where: {
          expiresAt: { gt: input.now },
          tokenHash: input.tokenHash,
          usedAt: null,
        },
      });
      if (token === null) {
        return null;
      }
      const consumed = await transaction.passwordResetToken.updateMany({
        data: { usedAt: input.now },
        where: { id: token.id, usedAt: null },
      });
      if (consumed.count !== 1) {
        return null;
      }
      const user = await transaction.user.update({
        data: {
          passwordChangedAt: input.now,
          passwordHash: input.passwordHash,
          version: { increment: 1 },
        },
        where: { id: token.userId },
      });
      await transaction.passwordResetToken.deleteMany({
        where: { userId: token.userId, id: { not: token.id } },
      });
      return mapUser(user);
    });
  }

  public async createSession(userId: string, session: NewSession): Promise<void> {
    await this.database.session.create({
      data: {
        ...session,
        userId,
      },
    });
  }

  public async findSession(sessionId: string): Promise<StoredSession | null> {
    const session = await this.database.session.findUnique({
      include: { user: true },
      where: { id: sessionId },
    });
    return session === null
      ? null
      : {
          expiresAt: session.expiresAt,
          familyId: session.familyId,
          id: session.id,
          revokedAt: session.revokedAt,
          tokenHash: session.tokenHash,
          user: mapUser(session.user),
        };
  }

  public async rotateSession(input: {
    readonly currentSessionId: string;
    readonly now: Date;
    readonly replacement: NewSession;
    readonly userId: string;
  }): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const updated = await transaction.session.updateMany({
        data: {
          lastUsedAt: input.now,
          replacedBySessionId: input.replacement.id,
          revocationReason: 'rotated',
          revokedAt: input.now,
        },
        where: {
          expiresAt: { gt: input.now },
          id: input.currentSessionId,
          revokedAt: null,
          userId: input.userId,
        },
      });
      if (updated.count !== 1) {
        return false;
      }
      await transaction.session.create({
        data: {
          ...input.replacement,
          userId: input.userId,
        },
      });
      return true;
    });
  }

  public async revokeSession(sessionId: string, userId: string, reason: string): Promise<boolean> {
    const result = await this.database.session.updateMany({
      data: { revocationReason: reason, revokedAt: new Date() },
      where: { id: sessionId, revokedAt: null, userId },
    });
    return result.count === 1;
  }

  public async revokeSessionFamily(familyId: string, reason: string): Promise<void> {
    await this.database.session.updateMany({
      data: { revocationReason: reason, revokedAt: new Date() },
      where: { familyId, revokedAt: null },
    });
  }

  public async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    await this.database.session.updateMany({
      data: { revocationReason: reason, revokedAt: new Date() },
      where: { revokedAt: null, userId },
    });
  }

  public async revokeOtherUserSessions(
    userId: string,
    retainedSessionId: string,
    reason: string,
  ): Promise<void> {
    await this.database.session.updateMany({
      data: { revocationReason: reason, revokedAt: new Date() },
      where: { id: { not: retainedSessionId }, revokedAt: null, userId },
    });
  }

  public async listSessions(userId: string): Promise<readonly SessionView[]> {
    return this.database.session.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        expiresAt: true,
        id: true,
        ipAddress: true,
        lastUsedAt: true,
        revokedAt: true,
        userAgent: true,
      },
      where: { userId },
    });
  }

  public async updateSuccessfulLogin(userId: string, occurredAt: Date): Promise<void> {
    await this.database.user.update({
      data: { lastLoginAt: occurredAt },
      where: { id: userId },
    });
  }

  public countRecentFailedLogins(normalizedEmail: string, since: Date): Promise<number> {
    return this.database.loginHistory.count({
      where: {
        normalizedEmail,
        occurredAt: { gte: since },
        outcome: { not: 'SUCCESS' },
      },
    });
  }

  public async recordLogin(input: {
    readonly failureReason?: string;
    readonly metadata: {
      readonly ipAddress?: string;
      readonly userAgent?: string;
    };
    readonly normalizedEmail: string;
    readonly outcome:
      'SUCCESS' | 'INVALID_CREDENTIALS' | 'EMAIL_UNVERIFIED' | 'ACCOUNT_DISABLED' | 'RATE_LIMITED';
    readonly userId?: string;
  }): Promise<void> {
    await this.database.loginHistory.create({
      data: {
        normalizedEmail: input.normalizedEmail,
        outcome: input.outcome,
        ...(input.failureReason === undefined ? {} : { failureReason: input.failureReason }),
        ...(input.metadata.ipAddress === undefined ? {} : { ipAddress: input.metadata.ipAddress }),
        ...(input.metadata.userAgent === undefined ? {} : { userAgent: input.metadata.userAgent }),
        ...(input.userId === undefined ? {} : { userId: input.userId }),
      },
    });
  }

  public async recordAudit(input: {
    readonly action: string;
    readonly actorUserId?: string;
    readonly details?: Readonly<Record<string, string | number | boolean | null>>;
    readonly metadata: {
      readonly correlationId?: string;
      readonly ipAddress?: string;
      readonly userAgent?: string;
    };
    readonly outcome: 'SUCCESS' | 'FAILURE';
    readonly resourceId?: string;
    readonly resourceType: string;
  }): Promise<void> {
    await this.database.auditLog.create({
      data: {
        action: input.action,
        outcome: input.outcome,
        resourceType: input.resourceType,
        ...(input.details === undefined ? {} : { metadata: input.details }),
        ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
        ...(input.metadata.correlationId === undefined
          ? {}
          : { correlationId: input.metadata.correlationId }),
        ...(input.metadata.ipAddress === undefined ? {} : { ipAddress: input.metadata.ipAddress }),
        ...(input.metadata.userAgent === undefined ? {} : { userAgent: input.metadata.userAgent }),
        ...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
      },
    });
  }

  public listAuditLogs(limit: number): Promise<readonly AuditView[]> {
    return this.database.auditLog.findMany({
      orderBy: { occurredAt: 'desc' },
      select: {
        action: true,
        actorUserId: true,
        id: true,
        occurredAt: true,
        outcome: true,
        resourceId: true,
        resourceType: true,
      },
      take: limit,
    });
  }

  public listLoginHistory(limit: number): Promise<readonly LoginHistoryView[]> {
    return this.database.loginHistory.findMany({
      orderBy: { occurredAt: 'desc' },
      select: {
        failureReason: true,
        id: true,
        ipAddress: true,
        occurredAt: true,
        outcome: true,
        userAgent: true,
      },
      take: limit,
    });
  }

  public async bootstrapSuperAdmin(input: {
    readonly displayName: string;
    readonly email: string;
    readonly normalizedEmail: string;
    readonly passwordHash: string;
  }): Promise<IdentityUser> {
    if ((await this.countUsersByRole('SUPER_ADMIN')) > 0) {
      throw new Error('A super admin already exists.');
    }
    return mapUser(
      await this.database.user.create({
        data: {
          displayName: input.displayName,
          email: input.email,
          emailVerifiedAt: new Date(),
          normalizedEmail: input.normalizedEmail,
          passwordChangedAt: new Date(),
          passwordHash: input.passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      }),
    );
  }

  public countUsersByRole(role: PlatformRole): Promise<number> {
    return this.database.user.count({ where: { role } });
  }
}
