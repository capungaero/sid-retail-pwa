import { describe, expect, it } from 'vitest';
import { applyReceipt, poStatusAfterReceipt, signedReturnQty } from './inventory';
import type { PurchaseLine } from '../types';

const lines: PurchaseLine[] = [
  { productId: 'a', productName: 'A', unit: 'Pcs', qty: 10, cost: 100, receivedQty: 0 },
  { productId: 'b', productName: 'B', unit: 'Pcs', qty: 5, cost: 200, receivedQty: 2 }
];

describe('applyReceipt', () => {
  it('adds received qty and caps at the ordered qty', () => {
    const next = applyReceipt(lines, [{ productId: 'a', qty: 4 }, { productId: 'b', qty: 10 }]);
    expect(next.find(l => l.productId === 'a')?.receivedQty).toBe(4);
    expect(next.find(l => l.productId === 'b')?.receivedQty).toBe(5); // capped at ordered qty of 5
  });
  it('ignores lines not present in the receipt and non-positive quantities', () => {
    const next = applyReceipt(lines, [{ productId: 'a', qty: 0 }]);
    expect(next).toEqual(lines);
  });
});

describe('poStatusAfterReceipt', () => {
  it('stays open when any line is short', () => {
    expect(poStatusAfterReceipt(applyReceipt(lines, [{ productId: 'a', qty: 4 }]))).toBe('open');
  });
  it('closes as received once every line is fully received', () => {
    const full = applyReceipt(lines, [{ productId: 'a', qty: 10 }, { productId: 'b', qty: 3 }]);
    expect(poStatusAfterReceipt(full)).toBe('received');
  });
});

describe('signedReturnQty', () => {
  it('subtracts stock for purchase returns', () => {
    expect(signedReturnQty('purchase', 3)).toBe(-3);
  });
  it('adds stock for sales returns', () => {
    expect(signedReturnQty('sales', 3)).toBe(3);
  });
  it('normalizes negative input qty to the correct sign', () => {
    expect(signedReturnQty('purchase', -3)).toBe(-3);
    expect(signedReturnQty('sales', -3)).toBe(3);
  });
});
