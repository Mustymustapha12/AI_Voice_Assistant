import { z } from 'zod';

const falseFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const trueFromString = z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true');

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);

export const backendEnvironmentSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema.default('development'),
    APP_VERSION: z.string().min(1).default('0.1.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CONTROL_API_HOST: z.string().min(1).default('0.0.0.0'),
    CONTROL_API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    CONTROL_API_CORS_ORIGINS: z.string().default('http://localhost:3000'),
    CONTROL_API_SWAGGER_ENABLED: trueFromString,
    DATABASE_URL: z.url().startsWith('postgresql://'),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().min(1).max(65_535).default(6379),
    REDIS_PASSWORD: optionalSecret,
    REDIS_TLS: falseFromString,
    REDIS_DB: z.coerce.number().int().min(0).default(0),
    EVENT_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
    AUTH_JWT_SECRET: optionalSecret,
    AUTH_JWT_ISSUER: z.string().min(1).default('ai-voice-commerce'),
    AUTH_JWT_AUDIENCE: z.string().min(1).default('ai-voice-commerce-admin'),
    AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
    AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    AUTH_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
    AUTH_FRONTEND_URL: z.url().default('http://localhost:3000'),
    SMTP_HOST: optionalSecret,
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: falseFromString,
    SMTP_USER: optionalSecret,
    SMTP_PASSWORD: optionalSecret,
    SMTP_FROM: optionalSecret,
    SUPER_ADMIN_EMAIL: optionalSecret,
    SUPER_ADMIN_DISPLAY_NAME: optionalSecret,
    SUPER_ADMIN_PASSWORD: optionalSecret,
  })
  .readonly();

export type BackendEnvironment = z.infer<typeof backendEnvironmentSchema>;

export function parseBackendEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): BackendEnvironment {
  const result = backendEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid backend environment configuration: ${issues}`);
  }

  return result.data;
}

export function parseCorsOrigins(value: string): readonly string[] {
  return Object.freeze(
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  );
}
