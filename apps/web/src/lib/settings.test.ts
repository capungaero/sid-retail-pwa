import { describe, expect, it } from 'vitest';
import { formatAuditEntry, togglePermission, validateStoreProfile } from './settings';
import type { AuditLogEntry, RolePermissions } from '../types';

describe('validateStoreProfile', () => {
  it('accepts a complete, valid profile', () => {
    expect(validateStoreProfile({ name: 'SID Retail', address: 'Jl. Melati Raya No. 8', phone: '022-4567890', taxId: '01.234.567.8-912.000' })).toEqual([]);
  });
  it('requires name, address and phone', () => {
    const errors = validateStoreProfile({ name: '', address: '', phone: '' });
    expect(errors).toContain('Nama toko wajib diisi.');
    expect(errors).toContain('Alamat toko wajib diisi.');
    expect(errors).toContain('Nomor telepon wajib diisi.');
  });
  it('rejects an obviously invalid phone number', () => {
    expect(validateStoreProfile({ name: 'SID Retail', address: 'Jl. Melati', phone: 'abc' })).toContain('Nomor telepon tidak valid.');
  });
  it('rejects an invalid tax id format when provided', () => {
    expect(validateStoreProfile({ name: 'SID Retail', address: 'Jl. Melati', phone: '022-4567890', taxId: 'not-a-npwp!!' })).toContain('Format NPWP tidak valid.');
  });
  it('allows an empty optional tax id', () => {
    expect(validateStoreProfile({ name: 'SID Retail', address: 'Jl. Melati', phone: '022-4567890', taxId: '' })).toEqual([]);
  });
});

describe('togglePermission', () => {
  const base: RolePermissions = { kasir: ['pos'], supervisor: ['pos', 'inventory'], admin: ['pos', 'inventory', 'settings'] };
  it('adds a permission that is not yet granted', () => {
    expect(togglePermission(base, 'kasir', 'inventory').kasir).toEqual(['pos', 'inventory']);
  });
  it('removes a permission that is already granted', () => {
    expect(togglePermission(base, 'supervisor', 'pos').supervisor).toEqual(['inventory']);
  });
  it('does not mutate the input map', () => {
    togglePermission(base, 'kasir', 'inventory');
    expect(base.kasir).toEqual(['pos']);
  });
  it('leaves other roles untouched', () => {
    const next = togglePermission(base, 'kasir', 'inventory');
    expect(next.admin).toBe(base.admin);
  });
});

describe('formatAuditEntry', () => {
  it('formats the actor and description into one readable line', () => {
    const entry: AuditLogEntry = { id: 'a-1', action: 'backup', description: 'Backup manual disimulasikan.', actor: 'Admin Toko', createdAt: '2026-08-14T11:00:00.000Z' };
    const line = formatAuditEntry(entry);
    expect(line).toContain('Admin Toko: Backup manual disimulasikan.');
    expect(line).toMatch(/2026/);
  });
});
