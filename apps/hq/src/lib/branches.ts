import type { Branch } from '../types';

const STORAGE_KEY = 'sid-hq-branches';

// Compiled-in defaults — the registry the app ships with. Adding a branch in the field goes
// through the Kelola Cabang page (persisted to localStorage), no rebuild needed.
export const DEFAULT_BRANCHES: Branch[] = [
  { code: 'CAB-01', name: 'Cabang Utama', apiUrl: 'https://sid.4dm1n.my.id/api' }
];

function normalize(branch: Branch): Branch {
  return { ...branch, apiUrl: branch.apiUrl.replace(/\/$/, '') };
}

export function listBranches(): Branch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Branch[];
      if (Array.isArray(parsed) && parsed.every(b => b.code && b.apiUrl)) return parsed.map(normalize);
    }
  } catch { /* corrupt storage falls back to defaults */ }
  return DEFAULT_BRANCHES.map(normalize);
}

export function saveBranches(branches: Branch[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branches.map(normalize)));
}

// Public unauthenticated endpoint — cheap reachability probe for the Kelola Cabang status column.
export async function testConnection(branch: Branch, timeoutMs = 5000): Promise<boolean> {
  try {
    const response = await fetch(`${normalize(branch).apiUrl}/health`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    return response.ok;
  } catch {
    return false;
  }
}
