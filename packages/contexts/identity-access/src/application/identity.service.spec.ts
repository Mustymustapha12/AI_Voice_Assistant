import { describe, expect, it, vi } from 'vitest';

import { permissionsForRole, type AuthenticatedPrincipal } from '../domain/model.js';

import { IdentityApplicationService } from './identity.service.js';
import type {
  AccessTokenService,
  IdentityStore,
  PasswordHasher,
  TransactionalEmail,
} from './ports.js';

function createService(overrides: Partial<IdentityStore> = {}): IdentityApplicationService {
  const store = {
    findUserByEmail: vi.fn().mockResolvedValue(null),
    recordAudit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IdentityStore;
  const hasher = {
    hash: vi.fn().mockResolvedValue('hash'),
    verify: vi.fn().mockResolvedValue(false),
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
  permissions: permissionsForRole('ADMIN'),
  role: 'ADMIN',
  sessionId: 'session',
  userId: 'user',
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
});
