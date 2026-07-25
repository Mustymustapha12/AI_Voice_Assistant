import 'reflect-metadata';

import { parseBackendEnvironment } from '@avc/config';
import { Logger } from 'nestjs-pino';

import { createApplication } from './bootstrap.js';

async function bootstrap(): Promise<void> {
  const environment = parseBackendEnvironment();
  const application = await createApplication();
  const logger = application.get(Logger);

  await application.listen({
    host: environment.CONTROL_API_HOST,
    port: environment.CONTROL_API_PORT,
  });

  logger.log(
    `Control API listening on ${environment.CONTROL_API_HOST}:${environment.CONTROL_API_PORT}`,
  );
}

void bootstrap();
