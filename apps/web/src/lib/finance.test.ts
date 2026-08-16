import { describe, expect, it } from 'vitest';
import { canTransitionInstrument, capPayment, nextCashBalance, payableOutstanding, receivableOutstanding, totalPaid } from './finance';
import type { Payable, Receivable } from '../types';

describe('nextCashBalance', () => {
  it('adds cash-in amounts to the running balance', () => {
    expect(nextCashBalance(1000, 'in', 500)).toBe(1500);
  });
  it('subtracts cash-out amounts from the running balance', () => {
    expect(nextCashBalance(1000, 'out', 300)).toBe(700);
  });
  it('allows the running balance to go negative on cash-out', () => {
    expect(nextCashBalance(100, 'out', 300)).toBe(-200);
  });
});

describe('totalPaid', () => {
  it('sums payment amounts', () => {
    expect(totalPaid([{ amount: 100 }, { amount: 250 }])).toBe(350);
  });
  it('returns 0 for no payments', () => {
    expect(totalPaid([])).toBe(0);
  });
});

const payable: Payable = { id: 'p1', supplierId: 'sup-1', supplierName: 'PT Sumber Makmur', reference: 'PO-0001', amount: 1000, payments: [{ id: 'pay-1', amount: 400, createdAt: '2026-08-01T00:00:00.000Z' }], createdAt: '2026-08-01T00:00:00.000Z' };
const receivable: Receivable = { id: 'r1', customerId: 'c-1', customerName: 'Siti Aminah', reference: 'INV-0001', amount: 500, payments: [], createdAt: '2026-08-01T00:00:00.000Z' };

describe('payableOutstanding', () => {
  it('subtracts payments already made from the payable amount', () => {
    expect(payableOutstanding(payable)).toBe(600);
  });
  it('never goes negative when payments exceed the amount', () => {
    const overpaid: Payable = { ...payable, payments: [{ id: 'pay-2', amount: 5000, createdAt: '2026-08-02T00:00:00.000Z' }] };
    expect(payableOutstanding(overpaid)).toBe(0);
  });
});

describe('receivableOutstanding', () => {
  it('equals the full amount when nothing has been collected', () => {
    expect(receivableOutstanding(receivable)).toBe(500);
  });
});

describe('capPayment', () => {
  it('passes through amounts within the outstanding balance', () => {
    expect(capPayment(600, 200)).toBe(200);
  });
  it('caps at the outstanding balance when the amount is larger', () => {
    expect(capPayment(600, 900)).toBe(600);
  });
  it('floors negative input at 0', () => {
    expect(capPayment(600, -50)).toBe(0);
  });
});

describe('canTransitionInstrument', () => {
  it('allows pending to move to cleared or bounced', () => {
    expect(canTransitionInstrument('pending', 'cleared')).toBe(true);
    expect(canTransitionInstrument('pending', 'bounced')).toBe(true);
  });
  it('rejects transitions out of terminal states', () => {
    expect(canTransitionInstrument('cleared', 'pending')).toBe(false);
    expect(canTransitionInstrument('bounced', 'cleared')).toBe(false);
  });
  it('rejects a no-op transition to the same state', () => {
    expect(canTransitionInstrument('pending', 'pending')).toBe(false);
  });
});
