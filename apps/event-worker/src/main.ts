import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  const logger = application.get(Logger);
  application.useLogger(logger);
  application.enableShutdownHooks();

  logger.log('Event worker infrastructure initialized; no business processors are registered.');
}

void bootstrap();
