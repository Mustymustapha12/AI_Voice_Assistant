'use client';

import { publicEnvironment } from './environment';

export interface AuthenticatedUser {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly permissions: readonly string[];
  readonly role: 'SUPER_ADMIN' | 'ADMIN';
  readonly status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED';
}

interface AuthenticationResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: AuthenticatedUser;
}

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthenticationResponse> | null = null;

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    readonly error?: { readonly code?: string; readonly message?: string };
  } | null;
  return new ApiError(
    body?.error?.message ?? 'The request could not be completed.',
    response.status,
    body?.error?.code,
  );
}

async function authenticationRequest(
  path: string,
  init?: RequestInit,
): Promise<AuthenticationResponse> {
  const response = await fetch(`${publicEnvironment.NEXT_PUBLIC_CONTROL_API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  const result = (await response.json()) as AuthenticationResponse;
  accessToken = result.accessToken;
  return result;
}

export async function login(email: string, password: string): Promise<AuthenticationResponse> {
  return authenticationRequest('/auth/login', {
    body: JSON.stringify({ email, password }),
    method: 'POST',
  });
}

export async function refreshAuthentication(): Promise<AuthenticationResponse> {
  refreshInFlight ??= authenticationRequest('/auth/refresh', { method: 'POST' }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (accessToken === null) {
    await refreshAuthentication();
  }
  let response = await fetch(`${publicEnvironment.NEXT_PUBLIC_CONTROL_API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${accessToken ?? ''}`,
      ...init?.headers,
    },
  });
  if (response.status === 401) {
    await refreshAuthentication();
    response = await fetch(`${publicEnvironment.NEXT_PUBLIC_CONTROL_API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${accessToken ?? ''}`,
        ...init?.headers,
      },
    });
  }
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function publicRequest(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${publicEnvironment.NEXT_PUBLIC_CONTROL_API_URL}${path}`, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    throw await parseError(response);
  }
}

export function clearAccessToken(): void {
  accessToken = null;
}
