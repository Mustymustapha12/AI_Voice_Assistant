import { ApplicationError } from '@avc/http';
import { SetMetadata } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z, type ZodType } from 'zod';

import type { RequestMetadata } from '../application/ports.js';
import type { AuthenticatedPrincipal, Permission } from '../domain/model.js';

export const REQUIRED_PERMISSIONS = Symbol('REQUIRED_PERMISSIONS');

export const RequirePermissions = (...permissions: readonly Permission[]): MethodDecorator =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

export interface AuthenticatedRequest extends FastifyRequest {
  principal?: AuthenticatedPrincipal;
}

export function requestMetadata(request: FastifyRequest): RequestMetadata {
  const correlation = request.headers['x-correlation-id'];
  const userAgent = request.headers['user-agent'];
  return {
    correlationId: typeof correlation === 'string' ? correlation : request.id,
    ipAddress: request.ip,
    ...(userAgent === undefined ? {} : { userAgent: userAgent.slice(0, 512) }),
  };
}

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApplicationError('Request validation failed.', {
      code: 'REQUEST_VALIDATION_FAILED',
      details: result.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.join('.'),
      })),
      status: 400,
    });
  }
  return result.data;
}

const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/u, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/u, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/u, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/u, 'Password must contain a special character.');

export const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
});

export const tokenAndPasswordSchema = z.object({
  password: passwordSchema,
  token: z.string().min(32).max(512),
});

export const forgotPasswordSchema = z.object({
  email: z.email().max(320),
});

export const createAdminSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.email().max(320),
});
