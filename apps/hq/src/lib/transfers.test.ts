import { describe, expect, it } from 'vitest';
import { findUnreceived, pendingFromOutDoc, transferReference } from './transfers';
import type { Branch, TransferDoc } from '../types';

const branchA: Branch = { code: 'A', name: 'Cabang A', apiUrl: 'http://a/api' };
const branchB: Branch = { code: 'B', name: 'Cabang B', apiUrl: 'http://b/api' };

function doc(overrides: Partial<TransferDoc>): TransferDoc {
  return {
    id: 'id', reference: 'TRF-1', direction: 'out',
    counterpartBranchCode: 'B', counterpartBranchName: 'Cabang B',
    status: 'sent', lines: [{ productId: 'P1', productName: 'Produk 1', unit: 'PCS', qty: 5 }],
    createdAt: '2026-09-01T10:00:00', ...overrides
  };
}

describe('transferReference', () => {
  it('formats as TRF-ddmmyy-HHmmss-nnn', () => {
    const ref = transferReference(new Date(2026, 8, 1, 9, 5, 3));
    expect(ref).toMatch(/^TRF-010926-090503-\d{3}$/);
  });
});

describe('findUnreceived', () => {
  it('flags an out doc with no matching in doc anywhere', () => {
    const result = findUnreceived([
      { branch: branchA, docs: [doc({ reference: 'TRF-lost' })] },
      { branch: branchB, docs: [] }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].doc.reference).toBe('TRF-lost');
    expect(result[0].sourceBranch.code).toBe('A');
  });

  it('ignores an out doc whose in doc landed at the destination', () => {
    const result = findUnreceived([
      { branch: branchA, docs: [doc({ reference: 'TRF-ok' })] },
      { branch: branchB, docs: [doc({ reference: 'TRF-ok', direction: 'in', status: 'received', counterpartBranchCode: 'A', counterpartBranchName: 'Cabang A' })] }
    ]);
    expect(result).toHaveLength(0);
  });

  it('never flags in docs themselves', () => {
    const result = findUnreceived([
      { branch: branchB, docs: [doc({ reference: 'TRF-in-only', direction: 'in', status: 'received' })] }
    ]);
    expect(result).toHaveLength(0);
  });
});

describe('pendingFromOutDoc', () => {
  it('rebuilds a retry payload addressed to the counterpart branch', () => {
    const pending = pendingFromOutDoc(doc({ reference: 'TRF-x', note: 'kirim ulang' }), branchA);
    expect(pending.reference).toBe('TRF-x');
    expect(pending.sourceCode).toBe('A');
    expect(pending.destCode).toBe('B');
    expect(pending.lines).toHaveLength(1);
    expect(pending.note).toBe('kirim ulang');
    expect(pending.inIdempotencyKey).toBeTruthy();
  });
});
