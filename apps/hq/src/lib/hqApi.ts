import type { PermissionKey } from '@web/types';
import type { Branch } from '../types';

export type AuthUser = { id: string; name: string; role: string; permissions: PermissionKey[] };

// One Sanctum bearer token PER BRANCH (each branch is its own Laravel deployment with its own
// user table), keyed by branch code. sessionStorage matches apps/web's token handling: survives
// navigation/reload, dies with the tab.
const tokenKey = (branchCode: string) => `sid-hq-token:${branchCode}`;

export function getToken(branchCode: string): string | null {
  return sessionStorage.getItem(tokenKey(branchCode));
}

export function clearToken(branchCode: string): void {
  sessionStorage.removeItem(tokenKey(branchCode));
}

export function isBranchAuthenticated(branchCode: string): boolean {
  return Boolean(getToken(branchCode));
}

export function hasAnySession(branches: Branch[]): boolean {
  return branches.some(b => isBranchAuthenticated(b.code));
}

// The HQ operator identity shown in the topbar — whichever branch login succeeded first; all
// branches are expected to hold the same 'hq' account so any of them is representative.
export function getStoredUser(): AuthUser | null {
  const raw = sessionStorage.getItem('sid-hq-user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export async function loginBranch(branch: Branch, username: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${branch.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? 'Username atau password salah.');
  }
  const data = await response.json() as { token: string; user: AuthUser };
  sessionStorage.setItem(tokenKey(branch.code), data.token);
  if (!sessionStorage.getItem('sid-hq-user')) sessionStorage.setItem('sid-hq-user', JSON.stringify(data.user));
  return data.user;
}

export type LoginResult = { branch: Branch; ok: boolean; error?: string };

// One credential tried against every registered branch in parallel — the operating model is an
// identical 'hq' admin account provisioned at each branch. A branch that fails (offline, no such
// account, deactivated there) reports its own error without blocking the rest.
export async function loginAllBranches(branches: Branch[], username: string, password: string): Promise<LoginResult[]> {
  return Promise.all(branches.map(async branch => {
    try {
      await loginBranch(branch, username, password);
      return { branch, ok: true };
    } catch (err) {
      return { branch, ok: false, error: err instanceof Error ? err.message : 'Login gagal.' };
    }
  }));
}

export async function logoutAllBranches(branches: Branch[]): Promise<void> {
  await Promise.all(branches.map(async branch => {
    const token = getToken(branch.code);
    if (!token) return;
    clearToken(branch.code);
    await fetch(`${branch.apiUrl}/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    }).catch(() => undefined);
  }));
  sessionStorage.removeItem('sid-hq-user');
}

// Authenticated request against ONE branch. A 401 clears only that branch's token (its session
// expired or the hq account was deactivated there) — other branches keep working; the UI surfaces
// it as a per-branch error, not an app-wide logout.
export async function branchRequest<T>(branch: Branch, path: string, init?: RequestInit): Promise<T> {
  const token = getToken(branch.code);
  if (!token) throw new Error(`Belum login ke cabang ${branch.name}.`);
  const response = await fetch(`${branch.apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      clearToken(branch.code);
      throw new Error(`Sesi cabang ${branch.name} berakhir — login ulang.`);
    }
    throw new Error(data?.message ?? `Permintaan ke ${branch.name} gagal (${response.status})`);
  }
  return response.json();
}
