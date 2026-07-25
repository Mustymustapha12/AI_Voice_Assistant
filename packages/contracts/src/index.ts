export const API_VERSION = '1' as const;
export const API_GLOBAL_PREFIX = 'api' as const;

export interface ApiErrorDetail {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly code: string;
  readonly correlationId: string;
  readonly errors?: readonly ApiErrorDetail[];
}

export type HealthStatus = 'ok' | 'error';

export interface HealthComponent {
  readonly status: HealthStatus;
  readonly latencyMs?: number;
}

export interface HealthResponse {
  readonly status: HealthStatus;
  readonly version: string;
  readonly timestamp: string;
  readonly components?: Readonly<Record<string, HealthComponent>>;
}
