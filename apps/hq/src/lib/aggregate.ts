import type { Branch, BranchResult } from '../types';
import { branchRequest, isBranchAuthenticated } from './hqApi';

// Fan a call out to every branch that has a live session; each branch resolves to its own
// ok/error row so one offline branch degrades to a labeled error card instead of a blank page.
export async function fetchAllBranches<T>(branches: Branch[], fn: (branch: Branch) => Promise<T>): Promise<BranchResult<T>[]> {
  return Promise.all(branches.map(async (branch): Promise<BranchResult<T>> => {
    if (!isBranchAuthenticated(branch.code)) return { branch, ok: false, error: 'Belum login ke cabang ini.' };
    try {
      return { branch, ok: true, data: await fn(branch) };
    } catch (err) {
      return { branch, ok: false, error: err instanceof Error ? err.message : 'Permintaan gagal.' };
    }
  }));
}

// Convenience for simple GETs.
export async function getFromAllBranches<T>(branches: Branch[], path: string): Promise<BranchResult<T>[]> {
  return fetchAllBranches(branches, branch => branchRequest<T>(branch, path));
}

export function okResults<T>(results: BranchResult<T>[]): { branch: Branch; data: T }[] {
  return results.filter((r): r is { branch: Branch; ok: true; data: T } => r.ok);
}
