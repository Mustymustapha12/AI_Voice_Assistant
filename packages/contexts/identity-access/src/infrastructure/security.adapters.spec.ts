import { describe, expect, it } from 'vitest';

import type { IdentityUser } from '../domain/model.js';

import { ArgonPasswordHasher, JoseAccessTokenService } from './security.adapters.js';

const user: IdentityUser = {
  createdAt: new Date(),
  displayName: 'Security Test',
  email: 'security@example.com',
  emailVerifiedAt: new Date(),
  id: '68b7d48e-eed0-49fb-a807-e7212290d314',
  lastLoginAt: null,
  normalizedEmail: 'security@example.com',
  passwordHash: null,
  role: 'ADMIN',
  status: 'ACTIVE',
};

describe('identity security adapters', () => {
  it('hashes passwords with Argon2id and rejects a different password', async () => {
    const hasher = new ArgonPasswordHasher();
    const hash = await hasher.hash('Enterprise!Password123');
    expect(hash).toContain('$argon2id$');
    await expect(hasher.verify(hash, 'Enterprise!Password123')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('issues signed, expiring access tokens with session binding', async () => {
    const tokens = new JoseAccessTokenService({
      audience: 'test-audience',
      issuer: 'test-issuer',
      secret: Buffer.alloc(32, 7).toString('base64'),
      ttlSeconds: 60,
    });
    const token = await tokens.issue(user, '1126ff81-16cf-4f8c-b11a-41bf17b1c059');
    await expect(tokens.verify(token)).resolves.toEqual({
      sessionId: '1126ff81-16cf-4f8c-b11a-41bf17b1c059',
      userId: user.id,
    });
  });
});
