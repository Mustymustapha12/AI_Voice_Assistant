import type { CacheService } from '@avc/cache';
import type { PrismaService } from '@avc/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadinessService } from '../src/modules/health/application/readiness.service.js';

describe('ReadinessService', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/database';
    process.env.APP_VERSION = 'test-version';
  });

  it('reports healthy dependencies', async () => {
    const database = { ping: vi.fn().mockResolvedValue(undefined) };
    const cache = { ping: vi.fn().mockResolvedValue(undefined) };
    const service = new ReadinessService(
      database as unknown as PrismaService,
      cache as unknown as CacheService,
    );

    const result = await service.readiness();

    expect(result.status).toBe('ok');
    expect(result.version).toBe('test-version');
    expect(result.components?.database?.status).toBe('ok');
    expect(result.components?.redis?.status).toBe('ok');
  });

  it('reports an unavailable dependency without leaking its error', async () => {
    const database = { ping: vi.fn().mockRejectedValue(new Error('secret database detail')) };
    const cache = { ping: vi.fn().mockResolvedValue(undefined) };
    const service = new ReadinessService(
      database as unknown as PrismaService,
      cache as unknown as CacheService,
    );

    const result = await service.readiness();

    expect(result.status).toBe('error');
    expect(result.components?.database?.status).toBe('error');
  });
});
