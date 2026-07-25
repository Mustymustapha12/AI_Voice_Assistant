import {
  Global,
  Injectable,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/* eslint-disable @typescript-eslint/no-unsafe-call -- Prisma's generated runtime methods are isolated to this infrastructure adapter. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  public async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-call */

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
