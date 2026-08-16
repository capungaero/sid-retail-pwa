import { describe, expect, it } from 'vitest';
import { calculateProfitLoss, cashPosition, filterByRange, lowStockProducts, summarizePayablesBySupplier, summarizePurchases, summarizeReceivablesByCustomer, summarizeSales, withinRange } from './reports';
import type { CashLedgerEntry, Payable, Product, PurchaseOrder, Receivable, SaleRecord } from '../types';

describe('withinRange', () => {
  const createdAt = '2026-08-13T10:00:00.000Z';
  it('is true when no bounds are given', () => {
    expect(withinRange(createdAt, {})).toBe(true);
  });
  it('excludes items before the start bound', () => {
    expect(withinRange(createdAt, { start: '2026-08-14' })).toBe(false);
  });
  it('includes items on the end-bound day, up to end of day', () => {
    expect(withinRange(createdAt, { end: '2026-08-13' })).toBe(true);
  });
  it('excludes items after the end bound', () => {
    expect(withinRange(createdAt, { end: '2026-08-12' })).toBe(false);
  });
});

describe('filterByRange', () => {
  const items = [{ id: 'a', createdAt: '2026-08-10T00:00:00.000Z' }, { id: 'b', createdAt: '2026-08-15T00:00:00.000Z' }];
  it('keeps only items whose createdAt falls within the range', () => {
    expect(filterByRange(items, { start: '2026-08-12' }).map(i => i.id)).toEqual(['b']);
  });
});

const sales: SaleRecord[] = [
  { id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', lines: [{ productId: '1', productName: 'A', unit: 'Pcs', qty: 3, price: 1000, discount: 100 }], total: 2900, createdAt: '2026-08-10T00:00:00.000Z' },
  { id: 's2', invoice: 'INV-2', customerId: 'c-1', customerName: 'Siti', lines: [{ productId: '2', productName: 'B', unit: 'Pcs', qty: 2, price: 500, discount: 0 }], total: 1000, createdAt: '2026-08-11T00:00:00.000Z' }
];

describe('summarizeSales', () => {
  it('aggregates count, quantity, revenue and discount across sales', () => {
    expect(summarizeSales(sales)).toEqual({ count: 2, qtySold: 5, revenue: 3900, discount: 100 });
  });
  it('returns all zeros for no sales', () => {
    expect(summarizeSales([])).toEqual({ count: 0, qtySold: 0, revenue: 0, discount: 0 });
  });
});

const orders: PurchaseOrder[] = [
  { id: 'po1', reference: 'PO-1', supplierId: 'sup-1', status: 'open', createdAt: '2026-08-01T00:00:00.000Z', lines: [{ productId: '1', productName: 'A', unit: 'Pcs', qty: 10, cost: 100, receivedQty: 4 }] },
  { id: 'po2', reference: 'PO-2', supplierId: 'sup-2', status: 'received', createdAt: '2026-08-02T00:00:00.000Z', lines: [{ productId: '2', productName: 'B', unit: 'Pcs', qty: 5, cost: 200, receivedQty: 5 }] }
];

describe('summarizePurchases', () => {
  it('sums ordered value and received value separately', () => {
    expect(summarizePurchases(orders)).toEqual({ count: 2, orderedValue: 10 * 100 + 5 * 200, receivedValue: 4 * 100 + 5 * 200 });
  });
});

describe('lowStockProducts', () => {
  const products: Product[] = [
    { id: '1', code: 'A', barcode: '1', name: 'A', category: 'x', stock: 5, minStock: 10, cost: 100, active: true, units: [] },
    { id: '2', code: 'B', barcode: '2', name: 'B', category: 'x', stock: 20, minStock: 10, cost: 100, active: true, units: [] },
    { id: '3', code: 'C', barcode: '3', name: 'C', category: 'x', stock: 10, minStock: 10, cost: 100, active: true, units: [] }
  ];
  it('includes products at or below minimum stock, worst first', () => {
    expect(lowStockProducts(products).map(p => p.id)).toEqual(['1', '3']);
  });
});

describe('cashPosition', () => {
  const entries: CashLedgerEntry[] = [
    { id: 'k1', direction: 'in', amount: 1000, category: 'x', balanceAfter: 1000, createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'k2', direction: 'out', amount: 300, category: 'x', balanceAfter: 700, createdAt: '2026-08-02T00:00:00.000Z' }
  ];
  it('sums cash in/out and takes the balance from the last entry', () => {
    expect(cashPosition(entries)).toEqual({ totalIn: 1000, totalOut: 300, balance: 700 });
  });
  it('returns a zero balance for no entries', () => {
    expect(cashPosition([])).toEqual({ totalIn: 0, totalOut: 0, balance: 0 });
  });
});

describe('calculateProfitLoss', () => {
  const products: Product[] = [{ id: '1', code: 'A', barcode: '1', name: 'A', category: 'x', stock: 0, minStock: 0, cost: 400, active: true, units: [] }];
  it('computes revenue, cogs and gross profit from sale lines and product cost', () => {
    const oneSale: SaleRecord[] = [{ id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', lines: [{ productId: '1', productName: 'A', unit: 'Pcs', qty: 5, price: 1000, discount: 200 }], total: 4800, createdAt: '2026-08-01T00:00:00.000Z' }];
    expect(calculateProfitLoss(oneSale, products)).toEqual({ revenue: 4800, cogs: 2000, grossProfit: 2800, margin: 2800 / 4800 });
  });
  it('treats products missing from the catalog as zero cost', () => {
    const unknownProduct: SaleRecord[] = [{ id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', lines: [{ productId: 'ghost', productName: 'Ghost', unit: 'Pcs', qty: 2, price: 500, discount: 0 }], total: 1000, createdAt: '2026-08-01T00:00:00.000Z' }];
    expect(calculateProfitLoss(unknownProduct, products)).toEqual({ revenue: 1000, cogs: 0, grossProfit: 1000, margin: 1 });
  });
  it('returns zero margin when there is no revenue', () => {
    expect(calculateProfitLoss([], products).margin).toBe(0);
  });
});

describe('summarizePayablesBySupplier', () => {
  const payables: Payable[] = [
    { id: 'h1', supplierId: 'sup-1', supplierName: 'Sumber Makmur', reference: 'PO-1', amount: 1000, payments: [{ id: 'p1', amount: 400, createdAt: '2026-08-01T00:00:00.000Z' }], createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'h2', supplierId: 'sup-1', supplierName: 'Sumber Makmur', reference: 'PO-2', amount: 500, payments: [], createdAt: '2026-08-02T00:00:00.000Z' },
    { id: 'h3', supplierId: 'sup-2', supplierName: 'Tirta Jaya', reference: 'PO-3', amount: 200, payments: [{ id: 'p2', amount: 200, createdAt: '2026-08-03T00:00:00.000Z' }], createdAt: '2026-08-03T00:00:00.000Z' }
  ];
  it('groups multiple payables for the same supplier and sums outstanding balances', () => {
    const result = summarizePayablesBySupplier(payables);
    expect(result).toEqual([
      { id: 'sup-1', name: 'Sumber Makmur', total: 1500, outstanding: 1100 },
      { id: 'sup-2', name: 'Tirta Jaya', total: 200, outstanding: 0 }
    ]);
  });
});

describe('summarizeReceivablesByCustomer', () => {
  const receivables: Receivable[] = [
    { id: 'r1', customerId: 'c-1', customerName: 'Siti', reference: 'INV-1', amount: 300, payments: [], createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'r2', customerId: 'c-1', customerName: 'Siti', reference: 'INV-2', amount: 200, payments: [{ id: 'p1', amount: 200, createdAt: '2026-08-02T00:00:00.000Z' }], createdAt: '2026-08-02T00:00:00.000Z' }
  ];
  it('groups multiple receivables for the same customer and sums outstanding balances', () => {
    expect(summarizeReceivablesByCustomer(receivables)).toEqual([{ id: 'c-1', name: 'Siti', total: 500, outstanding: 300 }]);
  });
});
