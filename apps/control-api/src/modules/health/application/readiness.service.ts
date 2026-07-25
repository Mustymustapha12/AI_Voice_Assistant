import { CacheService } from '@avc/cache';
import { parseBackendEnvironment } from '@avc/config';
import type { HealthComponent, HealthResponse } from '@avc/contracts';
import { PrismaService } from '@avc/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReadinessService {
  public constructor(
    private readonly database: PrismaService,
    private readonly cache: CacheService,
  ) {}

  public liveness(): HealthResponse {
    const environment = parseBackendEnvironment();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: environment.APP_VERSION,
    };
  }

  public async readiness(): Promise<HealthResponse> {
    const environment = parseBackendEnvironment();
    const [database, redis] = await Promise.all([
      this.measure(() => this.database.ping()),
      this.measure(() => this.cache.ping()),
    ]);
    const components = { database, redis } as const;
    const status = Object.values(components).every((component) => component.status === 'ok')
      ? 'ok'
      : 'error';

    return {
      components,
      status,
      timestamp: new Date().toISOString(),
      version: environment.APP_VERSION,
    };
  }

  private async measure(check: () => Promise<void>): Promise<HealthComponent> {
    const startedAt = performance.now();
    try {
      await check();
      return {
        latencyMs: Math.round(performance.now() - startedAt),
        status: 'ok',
      };
    } catch {
      return {
        latencyMs: Math.round(performance.now() - startedAt),
        status: 'error',
      };
    }
  }
}
