import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';

import {
  IdentityApplicationService,
  type AuthenticationResult,
  type PublicUser,
} from '../application/identity.service.js';
import type { SessionView } from '../application/ports.js';

import { AccessTokenGuard, requirePrincipal } from './access.guard.js';
import {
  forgotPasswordSchema,
  loginSchema,
  parseInput,
  requestMetadata,
  tokenAndPasswordSchema,
  type AuthenticatedRequest,
} from './http.js';

const REFRESH_COOKIE = 'avc_refresh';
export const COOKIE_CONFIGURATION = Symbol('COOKIE_CONFIGURATION');

export interface CookieConfiguration {
  readonly secure: boolean;
  readonly ttlDays: number;
}

@ApiTags('authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  public constructor(
    private readonly identity: IdentityApplicationService,
    @Inject(COOKIE_CONFIGURATION)
    private readonly cookies: CookieConfiguration,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({ schema: { required: ['email', 'password'], type: 'object' } })
  public async login(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<Omit<AuthenticationResult, 'refreshToken'>> {
    const input = parseInput(loginSchema, body);
    const result = await this.identity.login(input.email, input.password, requestMetadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new access token' })
  public async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<Omit<AuthenticationResult, 'refreshToken'>> {
    const refreshToken = request.cookies[REFRESH_COOKIE];
    const result = await this.identity.refresh(refreshToken ?? '', requestMetadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Post('forgot-password')
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a password reset without revealing account existence' })
  public async forgotPassword(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ): Promise<{ readonly accepted: true }> {
    const input = parseInput(forgotPasswordSchema, body);
    await this.identity.forgotPassword(input.email, requestMetadata(request));
    return { accepted: true };
  }

  @Post('reset-password')
  @HttpCode(204)
  public async resetPassword(@Body() body: unknown, @Req() request: FastifyRequest): Promise<void> {
    const input = parseInput(tokenAndPasswordSchema, body);
    await this.identity.resetPassword(input.token, input.password, requestMetadata(request));
  }

  @Post('verify-email')
  @HttpCode(204)
  public async verifyEmail(@Body() body: unknown, @Req() request: FastifyRequest): Promise<void> {
    const input = parseInput(tokenAndPasswordSchema, body);
    await this.identity.verifyEmail(input.token, input.password, requestMetadata(request));
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Current authenticated user.' })
  public currentUser(@Req() request: AuthenticatedRequest): Promise<PublicUser> {
    return this.identity.currentUser(requirePrincipal(request).userId);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  public async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<void> {
    const principal = requirePrincipal(request);
    await this.identity.logout(principal.userId, principal.sessionId, requestMetadata(request));
    response.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  public sessions(@Req() request: AuthenticatedRequest): Promise<readonly SessionView[]> {
    return this.identity.listSessions(requirePrincipal(request));
  }

  @Delete('sessions/:sessionId')
  @HttpCode(204)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  public revokeSession(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.identity.revokeManagedSession(
      requirePrincipal(request),
      sessionId,
      requestMetadata(request),
    );
  }

  private setRefreshCookie(response: FastifyReply, token: string): void {
    response.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      maxAge: this.cookies.ttlDays * 24 * 60 * 60,
      path: '/',
      sameSite: 'strict',
      secure: this.cookies.secure,
    });
  }

  private withoutRefreshToken(
    result: AuthenticationResult,
  ): Omit<AuthenticationResult, 'refreshToken'> {
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }
}
