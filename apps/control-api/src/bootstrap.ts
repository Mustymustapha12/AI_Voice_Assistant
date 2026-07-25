import { parseBackendEnvironment, parseCorsOrigins } from '@avc/config';
import { API_GLOBAL_PREFIX, API_VERSION } from '@avc/contracts';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';

export async function createApplication(): Promise<NestFastifyApplication> {
  const environment = parseBackendEnvironment();
  const application = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1_048_576,
      trustProxy: true,
    }),
    {
      bufferLogs: true,
    },
  );

  application.useLogger(application.get(Logger));
  application.enableShutdownHooks();
  application.setGlobalPrefix(API_GLOBAL_PREFIX);
  application.enableVersioning({
    defaultVersion: API_VERSION,
    type: VersioningType.URI,
  });
  application.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  await application.register(import('@fastify/helmet'), {
    contentSecurityPolicy: environment.NODE_ENV === 'production',
  });
  await application.register(import('@fastify/cors'), {
    credentials: true,
    origin: [...parseCorsOrigins(environment.CONTROL_API_CORS_ORIGINS)],
  });

  if (environment.CONTROL_API_SWAGGER_ENABLED) {
    const swaggerConfiguration = new DocumentBuilder()
      .setTitle('AI Voice Commerce Control API')
      .setDescription('Control-plane API for the AI Voice Commerce Platform.')
      .setVersion(environment.APP_VERSION)
      .addServer(`/${API_GLOBAL_PREFIX}/v${API_VERSION}`)
      .build();
    const document = SwaggerModule.createDocument(application, swaggerConfiguration);
    SwaggerModule.setup('docs', application, document, {
      jsonDocumentUrl: 'docs/openapi.json',
      swaggerOptions: {
        displayRequestDuration: true,
        persistAuthorization: false,
      },
    });
  }

  return application;
}
