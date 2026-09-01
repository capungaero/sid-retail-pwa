import type { Branch, PendingTransfer, TransferDoc, TransferLine } from '../types';
import { branchRequest } from './hqApi';

const PENDING_KEY = 'sid-hq-pending-transfers';

export function transferReference(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `TRF-${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${rand}`;
}

export function loadPendingTransfers(): PendingTransfer[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingTransfer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function savePendingTransfers(pending: PendingTransfer[]): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* best effort — reconciliation covers a lost queue */ }
}

export function removePendingTransfer(reference: string): PendingTransfer[] {
  const next = loadPendingTransfers().filter(p => p.reference !== reference);
  savePendingTransfers(next);
  return next;
}

type TransferPayload = {
  reference: string;
  counterpartBranchCode: string;
  counterpartBranchName: string;
  note?: string;
  lines: { productId: string; productName: string; unit: string; qty: number }[];
};

function postLeg(branch: Branch, direction: 'out' | 'in', payload: TransferPayload, idempotencyKey: string): Promise<TransferDoc> {
  return branchRequest<TransferDoc>(branch, `/stock-transfers/${direction}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload)
  });
}

export type TransferOutcome =
  | { status: 'completed'; reference: string }
  | { status: 'pending-in'; reference: string; error: string };

// Orchestrates one inter-branch transfer as two branch-local documents sharing a reference.
// The 'out' leg failing leaves no state anywhere (plain error to the caller). The 'in' leg
// failing is a REAL intermediate state — goods left the source and are physically in transit —
// so it's queued for retry rather than rolled back; the stored idempotency key plus the server's
// unique(reference, direction) make re-sending safe.
export async function executeTransfer(
  source: Branch,
  dest: Branch,
  lines: TransferLine[],
  note: string | undefined,
  keys: { reference?: string; outKey?: string; inKey?: string } = {}
): Promise<TransferOutcome> {
  const reference = keys.reference ?? transferReference();
  const outKey = keys.outKey ?? crypto.randomUUID();
  const inKey = keys.inKey ?? crypto.randomUUID();

  await postLeg(source, 'out', { reference, counterpartBranchCode: dest.code, counterpartBranchName: dest.name, note, lines }, outKey);

  try {
    await postLeg(dest, 'in', { reference, counterpartBranchCode: source.code, counterpartBranchName: source.name, note, lines }, inKey);
    return { status: 'completed', reference };
  } catch (err) {
    const pending: PendingTransfer = {
      reference,
      sourceCode: source.code, sourceName: source.name,
      destCode: dest.code, destName: dest.name,
      note, lines, inIdempotencyKey: inKey,
      createdAt: new Date().toISOString()
    };
    savePendingTransfers([...loadPendingTransfers().filter(p => p.reference !== reference), pending]);
    return { status: 'pending-in', reference, error: err instanceof Error ? err.message : 'Cabang tujuan tidak merespons.' };
  }
}

// Re-sends the queued 'in' leg with its ORIGINAL idempotency key, so however many times the
// operator clicks retry the destination books the receipt at most once.
export async function retryPendingTransfer(pending: PendingTransfer, branches: Branch[]): Promise<void> {
  const source = branches.find(b => b.code === pending.sourceCode);
  const dest = branches.find(b => b.code === pending.destCode);
  if (!dest) throw new Error(`Cabang tujuan ${pending.destName} tidak ada di registry.`);
  await postLeg(dest, 'in', {
    reference: pending.reference,
    counterpartBranchCode: source?.code ?? pending.sourceCode,
    counterpartBranchName: source?.name ?? pending.sourceName,
    note: pending.note,
    lines: pending.lines
  }, pending.inIdempotencyKey);
  removePendingTransfer(pending.reference);
}

export type UnreceivedTransfer = { doc: TransferDoc; sourceBranch: Branch };

// Passive reconciliation over the union of every branch's transfer documents: an 'out' doc whose
// reference has no matching 'in' doc ANYWHERE is a transfer that never landed. Catches the case
// where the localStorage pending queue was lost (different device/browser) — the retry payload
// can be rebuilt entirely from the out doc itself.
export function findUnreceived(perBranchDocs: { branch: Branch; docs: TransferDoc[] }[]): UnreceivedTransfer[] {
  const receivedRefs = new Set(perBranchDocs.flatMap(({ docs }) => docs.filter(d => d.direction === 'in').map(d => d.reference)));
  return perBranchDocs.flatMap(({ branch, docs }) =>
    docs.filter(d => d.direction === 'out' && !receivedRefs.has(d.reference)).map(doc => ({ doc, sourceBranch: branch }))
  );
}

// Rebuilds a retryable PendingTransfer from a source branch's out document (no localStorage
// involved). A FRESH idempotency key is generated — the original in-key is gone with the queue —
// which stays safe because the server also dedupes on unique(reference, direction).
export function pendingFromOutDoc(doc: TransferDoc, sourceBranch: Branch): PendingTransfer {
  return {
    reference: doc.reference,
    sourceCode: sourceBranch.code, sourceName: sourceBranch.name,
    destCode: doc.counterpartBranchCode, destName: doc.counterpartBranchName,
    note: doc.note, lines: doc.lines,
    inIdempotencyKey: crypto.randomUUID(),
    createdAt: doc.createdAt
  };
}
