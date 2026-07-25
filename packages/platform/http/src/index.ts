import type { ApiErrorDetail, ProblemDetails } from '@avc/contracts';
import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

export interface ApplicationErrorOptions {
  readonly cause?: unknown;
  readonly code: string;
  readonly details?: readonly ApiErrorDetail[];
  readonly status: number;
  readonly type?: string;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details: readonly ApiErrorDetail[] | undefined;
  public readonly status: number;
  public readonly type: string;

  public constructor(message: string, options: ApplicationErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'ApplicationError';
    this.code = options.code;
    this.details = options.details;
    this.status = options.status;
    this.type = options.type ?? 'https://docs.voice-commerce.example/problems/application-error';
  }
}

interface NormalizedError {
  readonly code: string;
  readonly detail: string;
  readonly errors?: readonly ApiErrorDetail[];
  readonly status: number;
  readonly title: string;
  readonly type: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  public constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const response = http.getResponse<FastifyReply>();
    const normalized = this.normalize(exception);
    const correlationHeader = request.headers['x-correlation-id'];
    const correlationId = typeof correlationHeader === 'string' ? correlationHeader : request.id;

    if (normalized.status >= 500) {
      this.logger.error(
        {
          correlationId,
          error: exception,
          method: request.method,
          path: request.url,
          status: normalized.status,
        },
        normalized.detail,
      );
    } else {
      this.logger.warn(
        {
          code: normalized.code,
          correlationId,
          method: request.method,
          path: request.url,
          status: normalized.status,
        },
        normalized.detail,
      );
    }

    const problem: ProblemDetails = {
      code: normalized.code,
      correlationId,
      detail: normalized.detail,
      instance: request.url,
      status: normalized.status,
      title: normalized.title,
      type: normalized.type,
      ...(normalized.errors === undefined ? {} : { errors: normalized.errors }),
    };

    void response
      .status(normalized.status)
      .header('content-type', 'application/problem+json')
      .send(problem);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof ApplicationError) {
      return {
        code: exception.code,
        detail: exception.message,
        status: exception.status,
        title: this.titleForStatus(exception.status),
        type: exception.type,
        ...(exception.details === undefined ? {} : { errors: exception.details }),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const detail =
        typeof response === 'string'
          ? response
          : this.extractHttpExceptionMessage(response, exception.message);

      return {
        code: `HTTP_${status}`,
        detail,
        status,
        title: this.titleForStatus(status),
        type: `https://httpstatuses.com/${status}`,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      detail: 'An unexpected error occurred.',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: 'Internal Server Error',
      type: 'https://httpstatuses.com/500',
    };
  }

  private extractHttpExceptionMessage(response: object, fallback: string): string {
    if ('message' in response) {
      const { message } = response;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.filter((item): item is string => typeof item === 'string').join('; ');
      }
    }

    return fallback;
  }

  private titleForStatus(status: number): string {
    return HttpStatus[status] ?? 'Error';
  }
}
