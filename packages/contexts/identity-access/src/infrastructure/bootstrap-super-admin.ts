import 'reflect-metadata';

import { parseBackendEnvironment } from '@avc/config';
import { PrismaService } from '@avc/database';

import { normalizeEmail } from '../domain/model.js';

import { PrismaIdentityStore } from './prisma-identity.store.js';
import { ArgonPasswordHasher } from './security.adapters.js';

async function bootstrapSuperAdmin(): Promise<void> {
  const environment = parseBackendEnvironment();
  if (
    environment.SUPER_ADMIN_EMAIL === undefined ||
    environment.SUPER_ADMIN_DISPLAY_NAME === undefined ||
    environment.SUPER_ADMIN_PASSWORD === undefined
  ) {
    throw new Error(
      'SUPER_ADMIN_EMAIL, SUPER_ADMIN_DISPLAY_NAME, and SUPER_ADMIN_PASSWORD are required.',
    );
  }
  if (
    environment.SUPER_ADMIN_PASSWORD.length < 12 ||
    !/[a-z]/u.test(environment.SUPER_ADMIN_PASSWORD) ||
    !/[A-Z]/u.test(environment.SUPER_ADMIN_PASSWORD) ||
    !/[0-9]/u.test(environment.SUPER_ADMIN_PASSWORD) ||
    !/[^A-Za-z0-9]/u.test(environment.SUPER_ADMIN_PASSWORD)
  ) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD must be at least 12 characters and include upper, lower, number, and symbol.',
    );
  }

  const database = new PrismaService();
  await database.$connect();
  try {
    const store = new PrismaIdentityStore(database);
    const passwordHasher = new ArgonPasswordHasher();
    const user = await store.bootstrapSuperAdmin({
      displayName: environment.SUPER_ADMIN_DISPLAY_NAME.trim(),
      email: environment.SUPER_ADMIN_EMAIL.trim(),
      normalizedEmail: normalizeEmail(environment.SUPER_ADMIN_EMAIL),
      passwordHash: await passwordHasher.hash(environment.SUPER_ADMIN_PASSWORD),
    });
    process.stdout.write(`Super admin created: ${user.email}\n`);
  } finally {
    await database.$disconnect();
  }
}

void bootstrapSuperAdmin();
