import type { DailyMethodRecap } from '@web/types';

export type Branch = { code: string; name: string; apiUrl: string };

// Per-branch outcome of a fan-out call — one branch being offline/unauthenticated must never
// take down the others' data on screen.
export type BranchResult<T> =
  | { branch: Branch; ok: true; data: T }
  | { branch: Branch; ok: false; error: string };

// GET /reports/summary response (ReportSummaryController) — range generalization of DailyRecap.
export type ReportSummaryDay = { date: string; netRevenue: number; transactionCount: number; drawnFromDaily: number };
export type ReportSummary = {
  from: string;
  to: string;
  days: ReportSummaryDay[];
  byMethod: DailyMethodRecap[];
  totalRevenue: number;
  transactionCount: number;
};

export type TransferLine = { productId: string; productName: string; unit: string; qty: number };
export type TransferDirection = 'out' | 'in';
// One side of an inter-branch transfer as stored in THAT branch's own DB (app_stock_transfers).
// A completed transfer exists as two docs sharing one reference: direction 'out' at the source,
// 'in' at the destination.
export type TransferDoc = {
  id: string;
  reference: string;
  direction: TransferDirection;
  counterpartBranchCode: string;
  counterpartBranchName: string;
  status: 'sent' | 'received';
  note?: string;
  operator?: string;
  lines: TransferLine[];
  createdAt: string;
};

// A transfer whose 'out' leg succeeded but whose 'in' leg hasn't landed yet (destination offline
// or rejected). Queued in localStorage so the HQ operator can retry; the stored idempotency key
// makes the retry safe to repeat.
export type PendingTransfer = {
  reference: string;
  sourceCode: string;
  sourceName: string;
  destCode: string;
  destName: string;
  note?: string;
  lines: TransferLine[];
  inIdempotencyKey: string;
  createdAt: string;
};
