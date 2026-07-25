import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { IdentityApplicationService, type PublicUser } from '../application/identity.service.js';
import type { AuditView, LoginHistoryView } from '../application/ports.js';
import { PERMISSIONS } from '../domain/model.js';

import { AccessTokenGuard, requirePrincipal } from './access.guard.js';
import {
  createAdminSchema,
  parseInput,
  requestMetadata,
  RequirePermissions,
  type AuthenticatedRequest,
} from './http.js';

@ApiTags('platform administration')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller({ path: 'platform', version: '1' })
export class AdminController {
  public constructor(private readonly identity: IdentityApplicationService) {}

  @Get('admins')
  public listAdmins(@Req() request: AuthenticatedRequest): Promise<readonly PublicUser[]> {
    return this.identity.listAdmins(requirePrincipal(request));
  }

  @Post('admins')
  @RequirePermissions(PERMISSIONS.ADMINS_MANAGE)
  public createAdmin(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<PublicUser> {
    const input = parseInput(createAdminSchema, body);
    return this.identity.createAdmin(requirePrincipal(request), input, requestMetadata(request));
  }

  @Delete('admins/:userId')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.ADMINS_MANAGE)
  public removeAdmin(
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.identity.removeAdmin(requirePrincipal(request), userId, requestMetadata(request));
  }

  @Get('audit-logs')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  public auditLogs(
    @Query('limit') limit: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<readonly AuditView[]> {
    return this.identity.listAuditLogs(requirePrincipal(request), this.parseLimit(limit));
  }

  @Get('login-history')
  @RequirePermissions(PERMISSIONS.LOGIN_HISTORY_READ)
  public loginHistory(
    @Query('limit') limit: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<readonly LoginHistoryView[]> {
    return this.identity.listLoginHistory(requirePrincipal(request), this.parseLimit(limit));
  }

  private parseLimit(value: string | undefined): number {
    const parsed = Number(value ?? '50');
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 200 ? parsed : 50;
  }
}
