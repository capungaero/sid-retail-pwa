import type { PermissionKey, UserRole } from '../types';

// AuthUser.role is whatever the identity source returned verbatim: an app_user_settings login
// already carries the Pengaturan role key ('kasir'/'supervisor'/'admin'), while a legacy karyawan
// login carries the raw karyawan.level code ('ADM'/'MGG'/'KTR'/'KS') — see AuthController::login's
// two branches and config/sid.php's level_role_map, which this mirrors on the frontend since the
// API doesn't expose the resolved role directly. Unrecognized values fall back to the
// least-privileged 'kasir', same fallback the backend uses.
const LEVEL_ROLE_MAP: Record<string, UserRole> = { ADM: 'admin', MGG: 'supervisor', KTR: 'supervisor', KS: 'kasir' };
const ROLES: UserRole[] = ['kasir', 'supervisor', 'admin'];

export function resolveRole(rawRole: string | undefined): UserRole {
  if (rawRole && (ROLES as string[]).includes(rawRole)) return rawRole as UserRole;
  return (rawRole && LEVEL_ROLE_MAP[rawRole]) || 'kasir';
}

export function hasPermission(permissions: PermissionKey[], key: PermissionKey): boolean {
  return permissions.includes(key);
}
