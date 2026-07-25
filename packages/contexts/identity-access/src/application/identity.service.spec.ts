import { describe, expect, it, vi } from 'vitest';

import {
  permissionsForRole,
  type AuthenticatedPrincipal,
  type IdentityUser,
} from '../domain/model.js';

import { IdentityApplicationService } from './identity.service.js';
import type {
  AccessTokenService,
  IdentityStore,
  PasswordHasher,
  TransactionalEmail,
} from './ports.js';

function createService(
  overrides: Partial<IdentityStore> = {},
  passwordValid = false,
): IdentityApplicationService {
  const store = {
    findUserByEmail: vi.fn().mockResolvedValue(null),
    recordAudit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IdentityStore;
  const hasher = {
    hash: vi.fn().mockResolvedValue('hash'),
    verify: vi.fn().mockResolvedValue(passwordValid),
  } satisfies PasswordHasher;
  const accessTokens = {
    issue: vi.fn(),
    verify: vi.fn(),
  } as unknown as AccessTokenService;
  const email = {
    sendAdminInvitation: vi.fn(),
    sendPasswordReset: vi.fn(),
  } satisfies TransactionalEmail;
  return new IdentityApplicationService(store, hasher, accessTokens, email, {
    accessTokenTtlSeconds: 900,
    frontendUrl: 'https://admin.example.com',
    passwordResetTokenTtlMinutes: 30,
    refreshTokenTtlDays: 30,
    verificationTokenTtlHours: 24,
  });
}

const admin: AuthenticatedPrincipal = {
  email: 'admin@example.com',
  mustChangePassword: false,
  permissions: permissionsForRole('ADMIN'),
  role: 'ADMIN',
  sessionId: 'session',
  userId: 'user',
};

const activeAdmin: IdentityUser = {
  createdAt: new Date(),
  displayName: 'Test Admin',
  email: 'admin@example.com',
  emailVerifiedAt: new Date(),
  id: '8119e54d-c2ea-4265-98e6-77ec9af2bba5',
  lastLoginAt: null,
  mustChangePassword: true,
  normalizedEmail: 'admin@example.com',
  passwordHash: 'existing-hash',
  role: 'ADMIN',
  status: 'ACTIVE',
};

describe('IdentityApplicationService authorization', () => {
  it('denies Admin attempts to create another Admin', async () => {
    const service = createService();
    await expect(
      service.createAdmin(
        admin,
        { displayName: 'Another Admin', email: 'another@example.com' },
        {},
      ),
    ).rejects.toMatchObject({ code: 'AUTH_FORBIDDEN', status: 403 });
  });

  it('returns normally for unknown password recovery accounts', async () => {
    const service = createService();
    await expect(service.forgotPassword('unknown@example.com', {})).resolves.toBeUndefined();
  });

  it('clears first-login state and revokes other sessions after password change', async () => {
    const changePassword = vi.fn().mockResolvedValue(undefined);
    const revokeOtherUserSessions = vi.fn().mockResolvedValue(undefined);
    const service = createService(
      {
        changePassword,
        findUserById: vi.fn().mockResolvedValue(activeAdmin),
        revokeOtherUserSessions,
      },
      true,
    );
    const actor = { ...admin, mustChangePassword: true, userId: activeAdmin.id };

    await service.changePassword(actor, 'Admin@123', 'NewAdmin@12345', {});

    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({ userId: activeAdmin.id }),
    );
    expect(revokeOtherUserSessions).toHaveBeenCalledWith(
      activeAdmin.id,
      actor.sessionId,
      'password_changed',
    );
  });
});
