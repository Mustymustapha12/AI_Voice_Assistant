import {
  Global,
  Inject,
  Injectable,
  Module,
  type DynamicModule,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Redis, type RedisOptions } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export interface CacheModuleOptions {
  readonly db: number;
  readonly host: string;
  readonly password: string | undefined;
  readonly port: number;
  readonly tls: boolean;
}

export function createRedisOptions(options: CacheModuleOptions): RedisOptions {
  return {
    db: options.db,
    enableOfflineQueue: false,
    host: options.host,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    password: options.password,
    port: options.port,
    retryStrategy: (attempt) => Math.min(attempt * 100, 2_000),
    ...(options.tls ? { tls: {} } : {}),
  };
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  public constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  public async ping(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    await this.client.ping();
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}

@Global()
@Module({})
export class CacheModule {
  public static forRoot(options: CacheModuleOptions): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        {
          provide: REDIS_CLIENT,
          useFactory: () => new Redis(createRedisOptions(options)),
        },
        CacheService,
      ],
      exports: [REDIS_CLIENT, CacheService],
    };
  }
}
