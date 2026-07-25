import { randomUUID } from 'node:crypto';

import { Module, type DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

export interface ObservabilityModuleOptions {
  readonly environment: string;
  readonly level: string;
  readonly serviceName: string;
  readonly serviceVersion: string;
}

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.token',
  'req.body.secret',
  'res.headers["set-cookie"]',
] as const;

@Module({})
export class ObservabilityModule {
  public static forRoot(options: ObservabilityModuleOptions): DynamicModule {
    const loggerModule = LoggerModule.forRoot({
      pinoHttp: {
        level: options.level,
        base: {
          environment: options.environment,
          service: options.serviceName,
          version: options.serviceVersion,
        },
        customAttributeKeys: {
          reqId: 'correlationId',
        },
        customProps: (request) => ({
          correlationId: request.id,
        }),
        genReqId: (request, response) => {
          const suppliedId = request.headers['x-correlation-id'];
          const correlationId =
            typeof suppliedId === 'string' && suppliedId.length <= 128 ? suppliedId : randomUUID();
          response.setHeader('x-correlation-id', correlationId);
          return correlationId;
        },
        redact: {
          paths: [...REDACTED_PATHS],
          censor: '[REDACTED]',
        },
      },
    });

    return {
      module: ObservabilityModule,
      imports: [loggerModule],
    };
  }
}
