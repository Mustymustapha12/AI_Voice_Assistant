import { BullModule } from '@nestjs/bullmq';
import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { ConnectionOptions } from 'bullmq';

export const INFRASTRUCTURE_QUEUE = 'infrastructure' as const;

export interface RedisConnectionConfiguration {
  readonly db: number;
  readonly host: string;
  readonly password: string | undefined;
  readonly port: number;
  readonly tls: boolean;
}

export function createRedisConnectionOptions(
  configuration: RedisConnectionConfiguration,
): ConnectionOptions {
  return {
    db: configuration.db,
    host: configuration.host,
    maxRetriesPerRequest: null,
    password: configuration.password,
    port: configuration.port,
    ...(configuration.tls ? { tls: {} } : {}),
  };
}

@Global()
@Module({})
export class QueueModule {
  public static forRoot(configuration: RedisConnectionConfiguration): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        BullModule.forRoot({
          connection: createRedisConnectionOptions(configuration),
          defaultJobOptions: {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 1_000,
            },
            removeOnComplete: {
              age: 86_400,
              count: 1_000,
            },
            removeOnFail: {
              age: 604_800,
              count: 5_000,
            },
          },
          prefix: 'avc',
        }),
      ],
      exports: [BullModule],
    };
  }
}
