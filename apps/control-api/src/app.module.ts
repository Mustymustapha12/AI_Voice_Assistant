import { CacheModule } from '@avc/cache';
import { parseBackendEnvironment } from '@avc/config';
import { DatabaseModule } from '@avc/database';
import { GlobalExceptionFilter } from '@avc/http';
import { ObservabilityModule } from '@avc/observability';
import { QueueModule } from '@avc/queue';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { HealthModule } from './modules/health/health.module.js';

const environment = parseBackendEnvironment();
const redisConfiguration = {
  db: environment.REDIS_DB,
  host: environment.REDIS_HOST,
  password: environment.REDIS_PASSWORD,
  port: environment.REDIS_PORT,
  tls: environment.REDIS_TLS,
} as const;

@Module({
  imports: [
    ObservabilityModule.forRoot({
      environment: environment.NODE_ENV,
      level: environment.LOG_LEVEL,
      serviceName: 'control-api',
      serviceVersion: environment.APP_VERSION,
    }),
    DatabaseModule,
    CacheModule.forRoot(redisConfiguration),
    QueueModule.forRoot(redisConfiguration),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
