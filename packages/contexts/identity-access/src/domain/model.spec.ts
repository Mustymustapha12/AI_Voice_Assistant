import { describe, expect, it } from 'vitest';

import { PERMISSIONS, permissionsForRole, roleHasPermission } from './model.js';

describe('platform role permissions', () => {
  it('reserves administrator and global configuration management for Super Admin', () => {
    expect(roleHasPermission('SUPER_ADMIN', PERMISSIONS.ADMINS_MANAGE)).toBe(true);
    expect(roleHasPermission('SUPER_ADMIN', PERMISSIONS.GLOBAL_CONFIGURATION_MANAGE)).toBe(true);
    expect(roleHasPermission('ADMIN', PERMISSIONS.ADMINS_MANAGE)).toBe(false);
    expect(roleHasPermission('ADMIN', PERMISSIONS.GLOBAL_CONFIGURATION_MANAGE)).toBe(false);
  });

  it('does not grant cross-user session management to Admin', () => {
    expect(permissionsForRole('ADMIN')).not.toContain(PERMISSIONS.SESSIONS_MANAGE);
  });
});
