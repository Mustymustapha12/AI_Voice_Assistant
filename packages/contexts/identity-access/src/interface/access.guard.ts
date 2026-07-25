import { ApplicationError } from '@avc/http';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IdentityApplicationService } from '../application/identity.service.js';
import type { AuthenticatedPrincipal, Permission } from '../domain/model.js';

import { REQUIRED_PERMISSIONS, type AuthenticatedRequest } from './http.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  public constructor(
    private readonly identity: IdentityApplicationService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new ApplicationError('Authentication is required.', {
        code: 'AUTH_UNAUTHORIZED',
        status: 401,
      });
    }
    const principal = await this.identity
      .authenticateAccessToken(authorization.slice(7))
      .catch(() => {
        throw new ApplicationError('Authentication is required.', {
          code: 'AUTH_UNAUTHORIZED',
          status: 401,
        });
      });
    request.principal = principal;
    const permissions =
      this.reflector.getAllAndOverride<readonly Permission[] | undefined>(REQUIRED_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (!permissions.every((permission) => principal.permissions.includes(permission))) {
      throw new ApplicationError('You do not have permission for this operation.', {
        code: 'AUTH_FORBIDDEN',
        status: 403,
      });
    }
    return true;
  }
}

export function requirePrincipal(request: AuthenticatedRequest): AuthenticatedPrincipal {
  if (request.principal === undefined) {
    throw new ApplicationError('Authentication is required.', {
      code: 'AUTH_UNAUTHORIZED',
      status: 401,
    });
  }
  return request.principal;
}
