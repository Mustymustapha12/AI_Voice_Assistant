import { parseBackendEnvironment } from '@avc/config';
import { DatabaseModule } from '@avc/database';
import { ObservabilityModule } from '@avc/observability';
import { INFRASTRUCTURE_QUEUE, QueueModule } from '@avc/queue';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

const environment = parseBackendEnvironment();

@Module({
  imports: [
    ObservabilityModule.forRoot({
      environment: environment.NODE_ENV,
      level: environment.LOG_LEVEL,
      serviceName: 'event-worker',
      serviceVersion: environment.APP_VERSION,
    }),
    DatabaseModule,
    QueueModule.forRoot({
      db: environment.REDIS_DB,
      host: environment.REDIS_HOST,
      password: environment.REDIS_PASSWORD,
      port: environment.REDIS_PORT,
      tls: environment.REDIS_TLS,
    }),
    BullModule.registerQueue({
      name: INFRASTRUCTURE_QUEUE,
    }),
  ],
})
export class AppModule {}
