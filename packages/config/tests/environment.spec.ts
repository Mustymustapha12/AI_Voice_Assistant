import { describe, expect, it } from 'vitest';

import { parseBackendEnvironment, parseCorsOrigins } from '../src/index.js';

describe('environment configuration', () => {
  it('coerces validated infrastructure values', () => {
    const environment = parseBackendEnvironment({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      CONTROL_API_PORT: '4100',
      REDIS_TLS: 'true',
    });

    expect(environment.CONTROL_API_PORT).toBe(4100);
    expect(environment.REDIS_TLS).toBe(true);
  });

  it('rejects an invalid database URL', () => {
    expect(() => parseBackendEnvironment({ DATABASE_URL: 'invalid' })).toThrow(
      'Invalid backend environment configuration',
    );
  });

  it('normalizes comma-separated CORS origins', () => {
    expect(parseCorsOrigins('https://one.test, https://two.test')).toEqual([
      'https://one.test',
      'https://two.test',
    ]);
  });
});
