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
