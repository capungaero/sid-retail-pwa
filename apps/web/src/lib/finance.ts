import type { CashDirection, InstrumentStatus, Payable, Receivable } from '../types';

// Computes the new running balance after applying a signed cash movement.
export function nextCashBalance(previousBalance: number, direction: CashDirection, amount: number): number {
  return previousBalance + (direction === 'in' ? amount : -amount);
}

// Total already paid/collected against a payable or receivable.
export function totalPaid(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

// Outstanding balance on a supplier payable (never negative).
export function payableOutstanding(payable: Payable): number {
  return Math.max(0, payable.amount - totalPaid(payable.payments));
}

// Outstanding balance on a customer receivable (never negative).
export function receivableOutstanding(receivable: Receivable): number {
  return Math.max(0, receivable.amount - totalPaid(receivable.payments));
}

// Caps a payment/collection amount so it never exceeds what is still outstanding.
export function capPayment(outstanding: number, amount: number): number {
  return Math.max(0, Math.min(outstanding, amount));
}

const ALLOWED_INSTRUMENT_TRANSITIONS: Record<InstrumentStatus, InstrumentStatus[]> = {
  pending: ['cleared', 'bounced'],
  cleared: [],
  bounced: []
};

// Card/voucher/giro clearing status only moves pending -> cleared or pending -> bounced; once cleared or bounced it is final.
export function canTransitionInstrument(from: InstrumentStatus, to: InstrumentStatus): boolean {
  return ALLOWED_INSTRUMENT_TRANSITIONS[from].includes(to);
}
