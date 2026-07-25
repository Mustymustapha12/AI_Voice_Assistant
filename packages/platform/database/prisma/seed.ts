import process from 'node:process';

import { PrismaClient, type PlatformRole } from '@prisma/client';
import * as argon2 from 'argon2';

interface SeedIdentity {
  readonly displayName: string;
  readonly email: string;
  readonly mustChangePassword: boolean;
  readonly password: string;
  readonly role: PlatformRole;
}

const identities: readonly SeedIdentity[] = [
  {
    displayName: 'System Administrator',
    email: 'superadmin@example.com',
    mustChangePassword: true,
    password: 'SuperAdmin@123',
    role: 'SUPER_ADMIN',
  },
  {
    displayName: 'Test Admin',
    email: 'admin@example.com',
    mustChangePassword: false,
    password: 'Admin@123',
    role: 'ADMIN',
  },
];

function assertSeedAllowed(): void {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEFAULT_IDENTITY_SEED !== 'true') {
    throw new Error(
      'Default identity seeding is disabled in production. Set ALLOW_DEFAULT_IDENTITY_SEED=true only for an approved bootstrap.',
    );
  }
}

async function seedIdentity(database: PrismaClient, identity: SeedIdentity): Promise<void> {
  const normalizedEmail = identity.email.trim().toLowerCase();
  const existing = await database.user.findUnique({ where: { normalizedEmail } });
  if (existing === null) {
    await database.user.create({
      data: {
        displayName: identity.displayName,
        email: identity.email,
        emailVerifiedAt: new Date(),
        mustChangePassword: identity.mustChangePassword,
        normalizedEmail,
        passwordChangedAt: new Date(),
        passwordHash: await argon2.hash(identity.password, {
          memoryCost: 65_536,
          parallelism: 1,
          timeCost: 3,
          type: argon2.argon2id,
        }),
        role: identity.role,
        status: 'ACTIVE',
      },
    });
    process.stdout.write(`Created ${identity.role}: ${identity.email}\n`);
    return;
  }

  await database.user.update({
    data: {
      displayName: identity.displayName,
      email: identity.email,
      emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      mustChangePassword:
        identity.role === 'SUPER_ADMIN' ? existing.mustChangePassword : identity.mustChangePassword,
      role: identity.role,
      status: 'ACTIVE',
    },
    where: { id: existing.id },
  });
  process.stdout.write(`Reconciled existing ${identity.role}: ${identity.email}\n`);
}

async function main(): Promise<void> {
  assertSeedAllowed();
  const database = new PrismaClient();
  try {
    for (const identity of identities) {
      await seedIdentity(database, identity);
    }
  } finally {
    await database.$disconnect();
  }
}

void main();
