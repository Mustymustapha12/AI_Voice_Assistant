import { z } from 'zod';

const publicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_CONTROL_API_URL: z.url().default('http://localhost:3001/api/v1'),
  })
  .readonly();

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_CONTROL_API_URL: process.env.NEXT_PUBLIC_CONTROL_API_URL,
});
