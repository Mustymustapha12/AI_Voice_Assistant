import { parseBackendEnvironment } from '@avc/config';
import { PrismaService } from '@avc/database';
import { Module } from '@nestjs/common';

import { IdentityApplicationService } from './application/identity.service.js';
import {
  ACCESS_TOKEN_SERVICE,
  IDENTITY_STORE,
  PASSWORD_HASHER,
  TRANSACTIONAL_EMAIL,
  type AccessTokenService,
  type IdentityStore,
  type PasswordHasher,
  type TransactionalEmail,
} from './application/ports.js';
import { PrismaIdentityStore } from './infrastructure/prisma-identity.store.js';
import {
  ArgonPasswordHasher,
  JoseAccessTokenService,
  SmtpTransactionalEmail,
} from './infrastructure/security.adapters.js';
import { AccessTokenGuard } from './interface/access.guard.js';
import { AdminController } from './interface/admin.controller.js';
import { AuthController, COOKIE_CONFIGURATION } from './interface/auth.controller.js';

const environment = parseBackendEnvironment();

@Module({
  controllers: [AuthController, AdminController],
  providers: [
    {
      provide: IDENTITY_STORE,
      inject: [PrismaService],
      useFactory: (database: PrismaService): IdentityStore => new PrismaIdentityStore(database),
    },
    {
      provide: PASSWORD_HASHER,
      useFactory: (): PasswordHasher => new ArgonPasswordHasher(),
    },
    {
      provide: ACCESS_TOKEN_SERVICE,
      useFactory: (): AccessTokenService => {
        if (environment.AUTH_JWT_SECRET === undefined) {
          throw new Error(
            'AUTH_JWT_SECRET is required. Generate at least 32 random bytes and encode them as base64.',
          );
        }
        return new JoseAccessTokenService({
          audience: environment.AUTH_JWT_AUDIENCE,
          issuer: environment.AUTH_JWT_ISSUER,
          secret: environment.AUTH_JWT_SECRET,
          ttlSeconds: environment.AUTH_ACCESS_TOKEN_TTL_SECONDS,
        });
      },
    },
    {
      provide: TRANSACTIONAL_EMAIL,
      useFactory: (): TransactionalEmail =>
        new SmtpTransactionalEmail({
          from: environment.SMTP_FROM,
          host: environment.SMTP_HOST,
          password: environment.SMTP_PASSWORD,
          port: environment.SMTP_PORT,
          secure: environment.SMTP_SECURE,
          user: environment.SMTP_USER,
        }),
    },
    {
      provide: IdentityApplicationService,
      inject: [IDENTITY_STORE, PASSWORD_HASHER, ACCESS_TOKEN_SERVICE, TRANSACTIONAL_EMAIL],
      useFactory: (
        store: IdentityStore,
        passwordHasher: PasswordHasher,
        accessTokens: AccessTokenService,
        email: TransactionalEmail,
      ): IdentityApplicationService =>
        new IdentityApplicationService(store, passwordHasher, accessTokens, email, {
          accessTokenTtlSeconds: environment.AUTH_ACCESS_TOKEN_TTL_SECONDS,
          frontendUrl: environment.AUTH_FRONTEND_URL,
          passwordResetTokenTtlMinutes: environment.AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES,
          refreshTokenTtlDays: environment.AUTH_REFRESH_TOKEN_TTL_DAYS,
          verificationTokenTtlHours: environment.AUTH_VERIFICATION_TOKEN_TTL_HOURS,
        }),
    },
    {
      provide: COOKIE_CONFIGURATION,
      useValue: {
        secure: environment.NODE_ENV === 'production',
        ttlDays: environment.AUTH_REFRESH_TOKEN_TTL_DAYS,
      },
    },
    AccessTokenGuard,
  ],
  exports: [IdentityApplicationService],
})
export class IdentityAccessModule {}
