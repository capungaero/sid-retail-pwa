import type { AuditLogEntry, PermissionKey, RolePermissions, StoreProfile, UserRole } from '../types';

// Validates the store profile form before it is saved; returns a list of Indonesian
// human-readable errors (empty array means the profile is valid).
export function validateStoreProfile(profile: Partial<StoreProfile>): string[] {
  const errors: string[] = [];
  if (!profile.name?.trim()) errors.push('Nama toko wajib diisi.');
  if (!profile.address?.trim()) errors.push('Alamat toko wajib diisi.');
  if (!profile.phone?.trim()) errors.push('Nomor telepon wajib diisi.');
  else if (!/^[0-9+\-() ]{6,20}$/.test(profile.phone.trim())) errors.push('Nomor telepon tidak valid.');
  if (profile.taxId?.trim() && !/^[0-9.\-]{5,25}$/.test(profile.taxId.trim())) errors.push('Format NPWP tidak valid.');
  return errors;
}

// Toggles a single permission for a role without mutating the input, returning a new map.
export function togglePermission(permissions: RolePermissions, role: UserRole, key: PermissionKey): RolePermissions {
  const current = permissions[role] ?? [];
  const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
  return { ...permissions, [role]: next };
}

// Formats an audit log entry into a single readable line for display, e.g.
// "14 Agu 2026 11.00 — Kasir Demo: Transaksi DEMO-00000003 tersimpan."
export function formatAuditEntry(entry: AuditLogEntry): string {
  const date = new Date(entry.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${date} — ${entry.actor}: ${entry.description}`;
}
