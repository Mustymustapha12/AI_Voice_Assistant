import { createHash } from 'node:crypto';
import process from 'node:process';

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const apiBaseUrl = process.env.QA_API_BASE_URL ?? 'http://localhost:3001/api/v1';
const database = new PrismaClient();
const qaUserEmail = 'phase2a-verification@example.com';

interface LoginResponse {
  readonly accessToken: string;
  readonly user: {
    readonly email: string;
    readonly mustChangePassword: boolean;
    readonly role: 'SUPER_ADMIN' | 'ADMIN';
  };
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path: string, init: RequestInit, expectedStatus: number): Promise<Response> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  assert(
    response.status === expectedStatus,
    `${init.method ?? 'GET'} ${path}: expected ${expectedStatus}, received ${response.status}`,
  );
  return response;
}

async function login(
  email: string,
  password: string,
): Promise<{
  readonly body: LoginResponse;
  readonly cookie: string;
}> {
  const response = await request(
    '/auth/login',
    {
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    200,
  );
  const body = (await response.json()) as LoginResponse;
  const setCookie = response.headers.get('set-cookie');
  assert(setCookie !== null, `Login for ${email} did not return a refresh cookie.`);
  assert(body.accessToken.split('.').length === 3, `Login for ${email} did not return a JWT.`);
  return { body, cookie: setCookie.split(';', 1)[0] ?? '' };
}

function bearer(token: string): Readonly<Record<string, string>> {
  return { Authorization: `Bearer ${token}` };
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    memoryCost: 65_536,
    parallelism: 1,
    timeCost: 3,
    type: argon2.argon2id,
  });
}

async function restoreSeedState(): Promise<void> {
  await database.session.deleteMany();
  await database.passwordResetToken.deleteMany();
  await database.emailVerificationToken.deleteMany();
  await database.user.deleteMany({ where: { normalizedEmail: qaUserEmail } });
  await database.user.update({
    data: {
      mustChangePassword: true,
      passwordHash: await hashPassword('SuperAdmin@123'),
      status: 'ACTIVE',
    },
    where: { normalizedEmail: 'superadmin@example.com' },
  });
  await database.user.update({
    data: {
      mustChangePassword: false,
      passwordHash: await hashPassword('Admin@123'),
      status: 'ACTIVE',
    },
    where: { normalizedEmail: 'admin@example.com' },
  });
}

async function run(): Promise<void> {
  try {
    const health = await request('/health/live', {}, 200);
    assert((await health.json()) !== null, 'Readiness response was empty.');

    const superAdmin = await login('superadmin@example.com', 'SuperAdmin@123');
    assert(superAdmin.body.user.role === 'SUPER_ADMIN', 'Super Admin role mismatch.');
    assert(superAdmin.body.user.mustChangePassword, 'Super Admin must require initial rotation.');
    await request('/auth/me', { headers: bearer(superAdmin.body.accessToken) }, 200);
    await request('/auth/sessions', { headers: bearer(superAdmin.body.accessToken) }, 403);
    await request(
      '/auth/change-password',
      {
        body: JSON.stringify({
          currentPassword: 'SuperAdmin@123',
          newPassword: 'QaSuperAdmin@12345',
        }),
        headers: {
          ...bearer(superAdmin.body.accessToken),
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
      204,
    );

    const rotatedSuperAdmin = await login('superadmin@example.com', 'QaSuperAdmin@12345');
    assert(
      !rotatedSuperAdmin.body.user.mustChangePassword,
      'Password rotation state was not cleared.',
    );
    await request('/platform/admins', { headers: bearer(rotatedSuperAdmin.body.accessToken) }, 200);

    const admin = await login('admin@example.com', 'Admin@123');
    assert(admin.body.user.role === 'ADMIN', 'Admin role mismatch.');
    await request('/platform/admins', { headers: bearer(admin.body.accessToken) }, 200);
    await request(
      '/platform/admins',
      {
        body: JSON.stringify({ displayName: 'Forbidden', email: 'forbidden@example.com' }),
        headers: { ...bearer(admin.body.accessToken), 'Content-Type': 'application/json' },
        method: 'POST',
      },
      403,
    );
    await request('/platform/audit-logs', { headers: bearer(admin.body.accessToken) }, 403);

    const refreshed = await request(
      '/auth/refresh',
      { headers: { Cookie: admin.cookie }, method: 'POST' },
      200,
    );
    const refreshedBody = (await refreshed.json()) as LoginResponse;
    assert(refreshedBody.accessToken.split('.').length === 3, 'Refresh did not issue a JWT.');
    const sessions = await request(
      '/auth/sessions',
      { headers: bearer(refreshedBody.accessToken) },
      200,
    );
    assert(
      ((await sessions.json()) as readonly unknown[]).length >= 1,
      'Session was not persisted.',
    );

    await request(
      '/auth/forgot-password',
      {
        body: JSON.stringify({ email: 'admin@example.com' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      202,
    );

    const adminUser = await database.user.findUniqueOrThrow({
      where: { normalizedEmail: 'admin@example.com' },
    });
    const resetToken = 'phase-2a-reset-token-with-sufficient-entropy';
    await database.passwordResetToken.deleteMany({ where: { userId: adminUser.id } });
    await database.passwordResetToken.create({
      data: {
        expiresAt: new Date(Date.now() + 10 * 60_000),
        tokenHash: createHash('sha256').update(resetToken).digest('hex'),
        userId: adminUser.id,
      },
    });
    await request(
      '/auth/reset-password',
      {
        body: JSON.stringify({ password: 'QaAdminReset@123', token: resetToken }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      204,
    );
    await login('admin@example.com', 'QaAdminReset@123');

    const verificationToken = 'phase-2a-verification-token-with-entropy';
    const verificationUser = await database.user.create({
      data: {
        displayName: 'Phase 2A Verification',
        email: qaUserEmail,
        normalizedEmail: qaUserEmail,
        role: 'ADMIN',
      },
    });
    await database.emailVerificationToken.create({
      data: {
        expiresAt: new Date(Date.now() + 10 * 60_000),
        tokenHash: createHash('sha256').update(verificationToken).digest('hex'),
        userId: verificationUser.id,
      },
    });
    await request(
      '/auth/verify-email',
      {
        body: JSON.stringify({
          password: 'QaVerification@123',
          token: verificationToken,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      204,
    );
    await login(qaUserEmail, 'QaVerification@123');

    const auditLogs = await request(
      '/platform/audit-logs?limit=200',
      { headers: bearer(rotatedSuperAdmin.body.accessToken) },
      200,
    );
    assert(((await auditLogs.json()) as readonly unknown[]).length > 0, 'Audit log is empty.');
    await request(
      '/platform/login-history?limit=200',
      { headers: bearer(rotatedSuperAdmin.body.accessToken) },
      200,
    );

    await request(
      '/auth/logout',
      { headers: bearer(rotatedSuperAdmin.body.accessToken), method: 'POST' },
      204,
    );
    await request('/auth/me', { headers: bearer(rotatedSuperAdmin.body.accessToken) }, 401);

    process.stdout.write('Phase 2A live authentication QA passed.\n');
  } finally {
    await restoreSeedState();
    await database.$disconnect();
  }
}

void run();
