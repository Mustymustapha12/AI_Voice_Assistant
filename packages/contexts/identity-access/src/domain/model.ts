export const PLATFORM_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const USER_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PERMISSIONS = {
  ADMINS_MANAGE: 'identity.admins.manage',
  AUDIT_READ: 'identity.audit.read',
  GLOBAL_CONFIGURATION_MANAGE: 'platform.configuration.manage',
  LOGIN_HISTORY_READ: 'identity.login-history.read',
  SESSIONS_MANAGE: 'identity.sessions.manage',
  USERS_READ: 'identity.users.read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Readonly<Record<PlatformRole, ReadonlySet<Permission>>> = {
  ADMIN: new Set<Permission>([PERMISSIONS.USERS_READ]),
  SUPER_ADMIN: new Set<Permission>(Object.values(PERMISSIONS)),
};

export interface IdentityUser {
  readonly createdAt: Date;
  readonly displayName: string;
  readonly email: string;
  readonly emailVerifiedAt: Date | null;
  readonly id: string;
  readonly lastLoginAt: Date | null;
  readonly mustChangePassword: boolean;
  readonly normalizedEmail: string;
  readonly passwordHash: string | null;
  readonly role: PlatformRole;
  readonly status: UserStatus;
}

export interface AuthenticatedPrincipal {
  readonly email: string;
  readonly mustChangePassword: boolean;
  readonly permissions: readonly Permission[];
  readonly role: PlatformRole;
  readonly sessionId: string;
  readonly userId: string;
}

export function permissionsForRole(role: PlatformRole): readonly Permission[] {
  return Object.freeze([...ROLE_PERMISSIONS[role]]);
}

export function roleHasPermission(role: PlatformRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
