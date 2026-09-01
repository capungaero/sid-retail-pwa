import { describe, expect, it } from 'vitest';
import { buildDailyRecap, calculateProfitLoss, cashierDailyCashTotals, cashierRemainingDailyCash, cashPoolBalance, cashPosition, countDistinctTransactions, dailyDrawnTotal, exchangedOutValue, exchangeHopsFor, filterByRange, loanOutstandingDrawnTotal, lowStockProducts, netBasketTotal, netSaleTotal, reportedRevenueDrawnTotal, rootSalesOnly, summarizePayablesBySupplier, summarizePurchases, summarizeReceivablesByCustomer, summarizeSales, UNTRACKED_METHOD_CODE, walletLedger, withinRange, withMethodPercentages } from './reports';
import type { CashLedgerEntry, DailyMethodRecap, LoanPayable, Payable, Product, PurchaseOrder, Receivable, SaleRecord } from '../types';

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
  it('includes an early-morning sale on the start-bound day itself (no UTC-vs-local drift)', () => {
    // A bare `new Date('yyyy-mm-dd')` parses as UTC midnight; createdAt here has no timezone
    // suffix and so parses as local time. Filtering that same day with itself as both bounds
    // must not silently drop hours before the local UTC offset catches up.
    expect(withinRange('2026-08-28T00:04:20.000', { start: '2026-08-28', end: '2026-08-28' })).toBe(true);
  });
});

describe('filterByRange', () => {
  const items = [{ id: 'a', createdAt: '2026-08-10T00:00:00.000Z' }, { id: 'b', createdAt: '2026-08-15T00:00:00.000Z' }];
  it('keeps only items whose createdAt falls within the range', () => {
    expect(filterByRange(items, { start: '2026-08-12' }).map(i => i.id)).toEqual(['b']);
  });
});

const sales: SaleRecord[] = [
  { id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', lines: [{ productId: '1', productName: 'A', unit: 'Pcs', qty: 3, price: 1000, discount: 100 }], total: 2900, paid: 2900, change: 0, createdAt: '2026-08-10T00:00:00.000Z' },
  { id: 's2', invoice: 'INV-2', customerId: 'c-1', customerName: 'Siti', lines: [{ productId: '2', productName: 'B', unit: 'Pcs', qty: 2, price: 500, discount: 0 }], total: 1000, paid: 1000, change: 0, createdAt: '2026-08-11T00:00:00.000Z' }
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

// Sunlight 640 (Rp 9.000) sold, then swapped for the cheaper Sunlight 260 (Rp 4.500) via Tukar
// barang. The original invoice is never mutated — its own total is still 9.000 in isolation —
// but its exchanged line's value (9.000, oldLineValue) must be backed out of any AGGREGATE so
// the two invoices combined read as one net Rp 4.500 sale, not a double-counted Rp 13.500.
const oldExchangedSale: SaleRecord = {
  id: 's1', invoice: 'INV-OLD', customerId: 'general', customerName: 'Umum',
  lines: [{ productId: 'sunlight-640', productName: 'Sunlight 640', unit: 'Pcs', qty: 1, price: 9000, discount: 0 }],
  total: 9000, paid: 9000, change: 0, createdAt: '2026-08-22T09:00:00.000Z',
  exchanges: [{ oldProductId: 'sunlight-640', oldUnit: 'Pcs', oldQty: 1, oldLineValue: 9000, newInvoice: 'INV-NEW', newProductName: 'Sunlight 260', newUnit: 'Pcs', newQty: 1, newLineValue: 4500 }],
};
const newExchangeSale: SaleRecord = {
  id: 's2', invoice: 'INV-NEW', customerId: 'general', customerName: 'Umum',
  lines: [{ productId: 'sunlight-260', productName: 'Sunlight 260', unit: 'Pcs', qty: 1, price: 4500, discount: 0 }],
  total: 4500, paid: 4500, change: 0, createdAt: '2026-08-22T09:05:00.000Z',
};

describe('exchangedOutValue / netSaleTotal', () => {
  it('is zero for a sale with no exchanges', () => {
    expect(exchangedOutValue(newExchangeSale)).toBe(0);
    expect(netSaleTotal(newExchangeSale)).toBe(4500);
  });
  it('nets an exchanged line off the old invoice total', () => {
    expect(exchangedOutValue(oldExchangedSale)).toBe(9000);
    expect(netSaleTotal(oldExchangedSale)).toBe(0);
  });
});

describe('netBasketTotal', () => {
  const allSales = [oldExchangedSale, newExchangeSale];
  it('is the plain total for a sale with no exchanges', () => {
    expect(netBasketTotal(newExchangeSale, allSales)).toBe(4500);
  });
  it('folds the replacement value back into the one row: a cheaper swap lowers the basket', () => {
    // Sunlight 640 (9.000) swapped for Sunlight 260 (4.500) → final basket 4.500, on one row.
    expect(netBasketTotal(oldExchangedSale, allSales)).toBe(4500);
  });
  it('a pricier swap raises the basket above the original total', () => {
    const root: SaleRecord = {
      id: 'r', invoice: 'INV-R', customerId: 'general', customerName: 'Umum',
      lines: [{ productId: 'a', productName: 'A', unit: 'Pcs', qty: 1, price: 40000, discount: 0 }, { productId: 'b', productName: 'B', unit: 'Pcs', qty: 1, price: 141000, discount: 0 }],
      total: 181000, paid: 181000, change: 0, createdAt: '2026-09-01T01:00:00.000Z',
      exchanges: [{ oldProductId: 'a', oldUnit: 'Pcs', oldQty: 1, oldLineValue: 40000, newInvoice: 'INV-R2', newProductName: 'C', newUnit: 'Pcs', newQty: 1, newLineValue: 46000 }],
    };
    const repl: SaleRecord = { id: 'r2', invoice: 'INV-R2', customerId: 'general', customerName: 'Umum', lines: [{ productId: 'c', productName: 'C', unit: 'Pcs', qty: 1, price: 46000, discount: 0 }], total: 46000, paid: 46000, change: 0, createdAt: '2026-09-01T01:05:00.000Z' };
    expect(netBasketTotal(root, [root, repl])).toBe(187000);
  });
});

describe('summarizeSales with an exchange', () => {
  it('counts the pair as one net Rp 4.500 sale, not Rp 13.500, and as one transaction', () => {
    const result = summarizeSales([oldExchangedSale, newExchangeSale]);
    expect(result.revenue).toBe(4500);
    expect(result.count).toBe(1);
  });
});

describe('cashierDailyCashTotals', () => {
  const cashierSales: SaleRecord[] = [
    { id: 's1', invoice: 'INV-1', customerId: 'g', customerName: 'Umum', cashierName: 'satri', methodName: 'Tunai', lines: [], total: 100000, paid: 100000, change: 0, createdAt: '2026-08-29T01:00:00.000Z' },
    { id: 's2', invoice: 'INV-2', customerId: 'g', customerName: 'Umum', cashierName: 'satri', methodName: 'Tunai', lines: [], total: 50000, paid: 50000, change: 0, createdAt: '2026-08-29T02:00:00.000Z' },
    { id: 's3', invoice: 'INV-3', customerId: 'g', customerName: 'Umum', cashierName: 'Admin', methodName: 'Tunai', lines: [], total: 75000, paid: 75000, change: 0, createdAt: '2026-08-29T03:00:00.000Z' },
    { id: 's4', invoice: 'INV-4', customerId: 'g', customerName: 'Umum', cashierName: 'Admin', methodName: 'QRIS', lines: [], total: 999999, paid: 999999, change: 0, createdAt: '2026-08-29T04:00:00.000Z' },
    { id: 's5', invoice: 'INV-5', customerId: 'g', customerName: 'Umum', cashierName: 'satri', methodName: 'Tunai', lines: [], total: 1, paid: 1, change: 0, createdAt: '2026-08-28T01:00:00.000Z' },
  ];
  it('sums each cashier own cash-method sales for the given day only, worst first', () => {
    expect(cashierDailyCashTotals(cashierSales, '2026-08-29', 'Tunai')).toEqual([
      { cashierName: 'satri', amount: 150000 },
      { cashierName: 'Admin', amount: 75000 },
    ]);
  });
});

describe('cashierRemainingDailyCash', () => {
  const cashierSales: SaleRecord[] = [
    { id: 's1', invoice: 'INV-1', customerId: 'g', customerName: 'Umum', cashierName: 'satri', methodName: 'Tunai', lines: [], total: 150000, paid: 150000, change: 0, createdAt: '2026-08-29T01:00:00.000Z' },
    { id: 's2', invoice: 'INV-2', customerId: 'g', customerName: 'Umum', cashierName: 'Admin', methodName: 'Tunai', lines: [], total: 75000, paid: 75000, change: 0, createdAt: '2026-08-29T03:00:00.000Z' },
  ];
  const entries: CashLedgerEntry[] = [
    { id: 'k1', direction: 'out', amount: 40000, category: 'x', fundingSource: 'daily', fundingCashierName: 'satri', balanceAfter: 0, createdAt: '2026-08-29T02:00:00.000Z' },
  ];
  it('subtracts each cashier own "dari transaksi harian" draws so far from their gross Tunai total', () => {
    expect(cashierRemainingDailyCash(cashierSales, entries, '2026-08-29', 'Tunai')).toEqual([
      { cashierName: 'satri', amount: 110000 },
      { cashierName: 'Admin', amount: 75000 },
    ]);
  });
});

describe('dailyDrawnTotal', () => {
  const entries: CashLedgerEntry[] = [
    { id: 'k1', direction: 'out', amount: 50000, category: 'x', fundingSource: 'daily', fundingCashierName: 'satri', balanceAfter: 0, createdAt: '2026-08-29T01:00:00.000Z' },
    { id: 'k2', direction: 'out', amount: 30000, category: 'x', fundingSource: 'daily', fundingCashierName: 'Admin', balanceAfter: 0, createdAt: '2026-08-29T02:00:00.000Z' },
    // Not counted: wrong direction, wrong funding source, or outside the range.
    { id: 'k3', direction: 'in', amount: 99999, category: 'x', balanceAfter: 0, createdAt: '2026-08-29T03:00:00.000Z' },
    { id: 'k4', direction: 'out', amount: 99999, category: 'x', fundingSource: 'loan', balanceAfter: 0, createdAt: '2026-08-29T04:00:00.000Z' },
    { id: 'k5', direction: 'out', amount: 99999, category: 'x', fundingSource: 'daily', fundingCashierName: 'satri', balanceAfter: 0, createdAt: '2026-08-01T00:00:00.000Z' },
  ];
  it('sums all "dari transaksi harian" draws within the range when no cashier is given', () => {
    expect(dailyDrawnTotal(entries, { start: '2026-08-29', end: '2026-08-29' })).toBe(80000);
  });
  it('narrows to one cashier own draws when given', () => {
    expect(dailyDrawnTotal(entries, { start: '2026-08-29', end: '2026-08-29' }, 'satri')).toBe(50000);
  });
});

describe('loanOutstandingDrawnTotal', () => {
  const loans: LoanPayable[] = [
    { id: 'l1', ledgerId: 'k1', amount: 200000, forDate: '2026-08-28', payments: [], createdAt: '2026-08-29T02:00:00.000Z' },
    { id: 'l2', ledgerId: 'k2', amount: 100000, forDate: '2026-08-28', payments: [{ id: 'p1', amount: 40000, createdAt: '2026-08-29T03:00:00.000Z' }], createdAt: '2026-08-29T02:30:00.000Z' },
    // Not counted: forDate outside the range.
    { id: 'l3', ledgerId: 'k3', amount: 999999, forDate: '2026-08-01', payments: [], createdAt: '2026-08-02T00:00:00.000Z' },
  ];
  it('sums outstanding (amount minus payments) for loans whose forDate falls in range', () => {
    expect(loanOutstandingDrawnTotal(loans, { start: '2026-08-28', end: '2026-08-28' })).toBe(260000);
  });
  it('a fully repaid loan stops counting toward the total', () => {
    const repaid: LoanPayable[] = [{ ...loans[0], payments: [{ id: 'p2', amount: 200000, createdAt: '2026-08-30T00:00:00.000Z' }] }];
    expect(loanOutstandingDrawnTotal(repaid, { start: '2026-08-28', end: '2026-08-28' })).toBe(0);
  });
});

describe('reportedRevenueDrawnTotal', () => {
  const entries: CashLedgerEntry[] = [
    { id: 'k1', direction: 'out', amount: 50000, category: 'x', fundingSource: 'daily', fundingCashierName: 'satri', balanceAfter: 0, createdAt: '2026-08-29T01:00:00.000Z' },
    // Not counted: wrong direction, wrong funding source, or outside the range.
    { id: 'k3', direction: 'in', amount: 99999, category: 'x', balanceAfter: 0, createdAt: '2026-08-29T03:00:00.000Z' },
    { id: 'k4', direction: 'out', amount: 99999, category: 'x', fundingSource: 'petty', balanceAfter: 0, createdAt: '2026-08-29T04:00:00.000Z' },
    { id: 'k5', direction: 'out', amount: 99999, category: 'x', fundingSource: 'daily', fundingCashierName: 'satri', balanceAfter: 0, createdAt: '2026-08-01T00:00:00.000Z' },
  ];
  // A loan drawn on 8/30 books forDate 8/29 - it nets into the 8/29 report row, not 8/30's.
  const loans: LoanPayable[] = [{ id: 'l1', ledgerId: 'k2', amount: 30000, forDate: '2026-08-29', payments: [], createdAt: '2026-08-30T02:00:00.000Z' }];
  it('sums both the daily draw and the loan\'s outstanding amount against its forDate, within range', () => {
    expect(reportedRevenueDrawnTotal(entries, loans, { start: '2026-08-29', end: '2026-08-29' })).toBe(80000);
  });
  it('narrows to one cashier own daily draws when given, still counting loan draws', () => {
    expect(reportedRevenueDrawnTotal(entries, loans, { start: '2026-08-29', end: '2026-08-29' }, 'satri')).toBe(80000);
  });
});

describe('cashPoolBalance', () => {
  const entries: CashLedgerEntry[] = [
    { id: 'p1', direction: 'in', amount: 2000000, category: 'x', cashSource: 'petty', balanceAfter: 0, createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'p2', direction: 'out', amount: 500000, category: 'x', fundingSource: 'petty', balanceAfter: 0, createdAt: '2026-08-02T00:00:00.000Z' },
    // Not counted: different pool, or a non-pool funding source (daily/loan).
    { id: 'p3', direction: 'in', amount: 999999, category: 'x', cashSource: 'bank', balanceAfter: 0, createdAt: '2026-08-03T00:00:00.000Z' },
    { id: 'p4', direction: 'out', amount: 999999, category: 'x', fundingSource: 'daily', fundingCashierName: 'satri', balanceAfter: 0, createdAt: '2026-08-04T00:00:00.000Z' },
  ];
  it('nets kas masuk against kas keluar tagged with the same pool, across all time', () => {
    expect(cashPoolBalance(entries, 'petty')).toBe(1500000);
  });
  it('matches the example from the request: 2,000,000 in, then fully drawn back out', () => {
    const drawn: CashLedgerEntry[] = [...entries, { id: 'p5', direction: 'out', amount: 1500000, category: 'x', fundingSource: 'petty', balanceAfter: 0, createdAt: '2026-08-05T00:00:00.000Z' }];
    expect(cashPoolBalance(drawn, 'petty')).toBe(0);
  });
  it('returns 0 for a pool with no entries', () => {
    expect(cashPoolBalance(entries, 'in_transit')).toBe(0);
  });
});

describe('walletLedger', () => {
  const entries: CashLedgerEntry[] = [
    { id: 'w1', direction: 'in', amount: 500000, category: 'x', cashSource: 'petty', balanceAfter: 500000, createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'w2', direction: 'out', amount: 999999999, category: 'x', fundingSource: 'loan', balanceAfter: -999499999, createdAt: '2026-08-02T00:00:00.000Z' },
    { id: 'w3', direction: 'out', amount: 200000, category: 'x', fundingSource: 'petty', balanceAfter: -999699999, createdAt: '2026-08-03T00:00:00.000Z' },
  ];
  it('keeps only entries tagged with the given wallet, with a running balance scoped to just those', () => {
    expect(walletLedger(entries, 'petty')).toEqual([
      { ...entries[0], walletBalanceAfter: 500000 },
      { ...entries[2], walletBalanceAfter: 300000 },
    ]);
  });
  it("isn't dragged negative by a huge draw from an unrelated wallet (Saldo Akumulasi Toko)", () => {
    const petty = walletLedger(entries, 'petty');
    expect(petty.at(-1)?.walletBalanceAfter).toBe(300000);
  });
  it('treats a loan as outstanding: a fully repaid draw nets to zero and the Pelunasan row adds nothing', () => {
    const loanEntries: CashLedgerEntry[] = [
      { id: 'd1', direction: 'out', amount: 1000000000, category: 'Lainnya', fundingSource: 'loan', balanceAfter: 0, createdAt: '2026-08-31T00:00:00.000Z' },
      { id: 'p1', direction: 'in', amount: 1000000000, category: 'Pelunasan Pinjaman', cashSource: 'loan', balanceAfter: 0, createdAt: '2026-09-01T00:00:00.000Z' },
    ];
    // d1 is a fully-repaid loan draw (outstanding 0), p1 is its Pelunasan (audit-only).
    const ledger = walletLedger(loanEntries, 'loan', { d1: 0 });
    expect(ledger.map(e => e.walletBalanceAfter)).toEqual([0, 0]);
  });
  it('an unpaid loan draw still weighs on the wallet by its outstanding amount', () => {
    const loanEntries: CashLedgerEntry[] = [
      { id: 'd2', direction: 'out', amount: 1000000000, category: 'Lainnya', fundingSource: 'loan', balanceAfter: 0, createdAt: '2026-08-31T00:00:00.000Z' },
    ];
    expect(walletLedger(loanEntries, 'loan', { d2: 400000000 }).at(-1)?.walletBalanceAfter).toBe(-400000000);
  });
});

describe('countDistinctTransactions', () => {
  it('counts unrelated sales at face value', () => {
    expect(countDistinctTransactions([newExchangeSale])).toBe(1);
  });
  it('excludes an exchange new-invoice so a swap reads as one transaction, not two', () => {
    expect(countDistinctTransactions([oldExchangedSale, newExchangeSale])).toBe(1);
  });
});

describe('rootSalesOnly', () => {
  it('keeps sales that were never anyone\'s exchange replacement', () => {
    expect(rootSalesOnly([newExchangeSale]).map(s => s.invoice)).toEqual(['INV-NEW']);
  });
  it('drops a sale that is the new-invoice side of an exchange', () => {
    expect(rootSalesOnly([oldExchangedSale, newExchangeSale]).map(s => s.invoice)).toEqual(['INV-OLD']);
  });
  it('drops every hop of a multi-step chain (A -> B -> C), keeping only the root', () => {
    // Mirrors a real production case: CERI1 -> LASEGAR MELON -> a second swap later the same day.
    const hopB: SaleRecord = { id: 'b', invoice: 'PWA-0005', customerId: 'g', customerName: 'Umum', lines: [{ productId: 'melon', productName: 'LASEGAR MELON', unit: 'DUS', qty: 1, price: 141000, discount: 0 }], total: 141000, paid: 141000, change: 0, createdAt: '2026-08-31T01:00:00.000Z', exchanges: [{ oldProductId: 'melon', oldUnit: 'DUS', oldQty: 1, oldLineValue: 141000, newInvoice: 'PWA-0006', newProductName: 'Air Mineral', newUnit: 'Botol', newQty: 1, newLineValue: 9000 }] };
    const hopC: SaleRecord = { id: 'c', invoice: 'PWA-0006', customerId: 'g', customerName: 'Umum', lines: [{ productId: 'air', productName: 'Air Mineral', unit: 'Botol', qty: 1, price: 9000, discount: 0 }], total: 9000, paid: 9000, change: 0, createdAt: '2026-08-31T01:30:00.000Z' };
    const hopA: SaleRecord = { id: 'a', invoice: 'PWA-0004', customerId: 'g', customerName: 'Umum', lines: [{ productId: 'ceri', productName: 'MAWAR CERIA KNG', unit: 'TIM', qty: 1, price: 93000, discount: 0 }], total: 93000, paid: 93000, change: 0, createdAt: '2026-08-31T00:30:00.000Z', exchanges: [{ oldProductId: 'ceri', oldUnit: 'TIM', oldQty: 1, oldLineValue: 93000, newInvoice: 'PWA-0005', newProductName: 'LASEGAR MELON', newUnit: 'DUS', newQty: 1, newLineValue: 141000 }] };
    expect(rootSalesOnly([hopA, hopB, hopC]).map(s => s.invoice)).toEqual(['PWA-0004']);
  });
});

describe('exchangeHopsFor', () => {
  const hopB: SaleRecord = { id: 'b', invoice: 'PWA-0005', customerId: 'g', customerName: 'Umum', lines: [{ productId: 'melon', productName: 'LASEGAR MELON', unit: 'DUS', qty: 1, price: 141000, discount: 0 }], total: 141000, paid: 141000, change: 0, createdAt: '2026-08-31T01:00:00.000Z', exchanges: [{ oldProductId: 'melon', oldUnit: 'DUS', oldQty: 1, oldLineValue: 141000, newInvoice: 'PWA-0006', newProductName: 'Air Mineral', newUnit: 'Botol', newQty: 1, newLineValue: 9000 }] };
  const hopC: SaleRecord = { id: 'c', invoice: 'PWA-0006', customerId: 'g', customerName: 'Umum', lines: [{ productId: 'air', productName: 'Air Mineral', unit: 'Botol', qty: 1, price: 9000, discount: 0 }], total: 9000, paid: 9000, change: 0, createdAt: '2026-08-31T01:30:00.000Z' };
  const hopA: SaleRecord = { id: 'a', invoice: 'PWA-0004', customerId: 'g', customerName: 'Umum', lines: [{ productId: 'ceri', productName: 'MAWAR CERIA KNG', unit: 'TIM', qty: 1, price: 93000, discount: 0 }], total: 93000, paid: 93000, change: 0, createdAt: '2026-08-31T00:30:00.000Z', exchanges: [{ oldProductId: 'ceri', oldUnit: 'TIM', oldQty: 1, oldLineValue: 93000, newInvoice: 'PWA-0005', newProductName: 'LASEGAR MELON', newUnit: 'DUS', newQty: 1, newLineValue: 141000 }] };
  const allSales = [hopA, hopB, hopC];
  it('returns an empty list for a line that was never exchanged', () => {
    expect(exchangeHopsFor(hopC, 'air', 'Botol', allSales)).toEqual([]);
  });
  it('returns one hop for a single swap', () => {
    const hops = exchangeHopsFor(hopB, 'melon', 'DUS', allSales);
    expect(hops).toEqual([{ invoice: 'PWA-0006', oldProductName: 'LASEGAR MELON', oldUnit: 'DUS', oldQty: 1, oldLineValue: 141000, newProductName: 'Air Mineral', newUnit: 'Botol', newQty: 1, newLineValue: 9000, diff: -132000 }]);
  });
  it('walks a two-hop chain (A -> B -> C) from the root line', () => {
    const hops = exchangeHopsFor(hopA, 'ceri', 'TIM', allSales);
    expect(hops).toHaveLength(2);
    expect(hops[0]).toEqual({ invoice: 'PWA-0005', oldProductName: 'MAWAR CERIA KNG', oldUnit: 'TIM', oldQty: 1, oldLineValue: 93000, newProductName: 'LASEGAR MELON', newUnit: 'DUS', newQty: 1, newLineValue: 141000, diff: 48000 });
    expect(hops[1]).toEqual({ invoice: 'PWA-0006', oldProductName: 'LASEGAR MELON', oldUnit: 'DUS', oldQty: 1, oldLineValue: 141000, newProductName: 'Air Mineral', newUnit: 'Botol', newQty: 1, newLineValue: 9000, diff: -132000 });
  });
});

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
    const oneSale: SaleRecord[] = [{ id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', lines: [{ productId: '1', productName: 'A', unit: 'Pcs', qty: 5, price: 1000, discount: 200 }], total: 4800, paid: 4800, change: 0, createdAt: '2026-08-01T00:00:00.000Z' }];
    expect(calculateProfitLoss(oneSale, products)).toEqual({ revenue: 4800, cogs: 2000, grossProfit: 2800, margin: 2800 / 4800 });
  });
  it('treats products missing from the catalog as zero cost', () => {
    const unknownProduct: SaleRecord[] = [{ id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', lines: [{ productId: 'ghost', productName: 'Ghost', unit: 'Pcs', qty: 2, price: 500, discount: 0 }], total: 1000, paid: 1000, change: 0, createdAt: '2026-08-01T00:00:00.000Z' }];
    expect(calculateProfitLoss(unknownProduct, products)).toEqual({ revenue: 1000, cogs: 0, grossProfit: 1000, margin: 1 });
  });
  it('returns zero margin when there is no revenue', () => {
    expect(calculateProfitLoss([], products).margin).toBe(0);
  });
  it('backs out revenue and COGS for a line later swapped away', () => {
    const swappedProducts: Product[] = [
      { id: 'sunlight-640', code: 'A', barcode: '1', name: 'Sunlight 640', category: 'x', stock: 0, minStock: 0, cost: 7000, active: true, units: [] },
      { id: 'sunlight-260', code: 'B', barcode: '2', name: 'Sunlight 260', category: 'x', stock: 0, minStock: 0, cost: 3500, active: true, units: [] },
    ];
    const result = calculateProfitLoss([oldExchangedSale, newExchangeSale], swappedProducts);
    expect(result.revenue).toBe(4500);
    expect(result.cogs).toBe(3500);
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

describe('buildDailyRecap', () => {
  const sales = [
    { invoice: 'INV-1', total: 10000, createdAt: '2026-08-22T09:00:00.000Z' },
    { invoice: 'INV-2', total: 5000, createdAt: '2026-08-22T10:00:00.000Z' },
    { invoice: 'INV-3', total: 3000, createdAt: '2026-08-22T11:00:00.000Z' }, // untracked (no payment row)
    { invoice: 'INV-OTHER', total: 999, createdAt: '2026-08-21T09:00:00.000Z' } // different day
  ];
  const payments = [
    { saleId: 'INV-1', methodCode: 'CASH', methodName: 'Tunai', amount: 10000 },
    { saleId: 'INV-2', methodCode: 'QRIS', methodName: 'QRIS', amount: 5000 }
  ];
  it('groups by method and buckets untracked sales so byMethod reconciles with totalRevenue', () => {
    const recap = buildDailyRecap('2026-08-22', sales, payments);
    expect(recap.totalRevenue).toBe(18000);
    expect(recap.transactionCount).toBe(3);
    const sum = recap.byMethod.reduce((s, m) => s + m.amount, 0);
    expect(sum).toBe(recap.totalRevenue);
    const untracked = recap.byMethod.find(m => m.methodCode === UNTRACKED_METHOD_CODE);
    expect(untracked).toEqual({ methodCode: UNTRACKED_METHOD_CODE, methodName: 'Lainnya / tidak tercatat', count: 1, amount: 3000 });
  });
  it('sorts methods by amount descending', () => {
    const recap = buildDailyRecap('2026-08-22', sales, payments);
    expect(recap.byMethod.map(m => m.methodCode)).toEqual(['CASH', 'QRIS', UNTRACKED_METHOD_CODE]);
  });
  it('returns an empty breakdown for a day with no sales', () => {
    const recap = buildDailyRecap('2026-08-01', sales, payments);
    expect(recap).toEqual({ date: '2026-08-01', totalRevenue: 0, transactionCount: 0, byMethod: [] });
  });
  it('nets a "dari transaksi harian" kas keluar out of totalRevenue and the cash bucket', () => {
    const cashEntries: CashLedgerEntry[] = [
      { id: 'k1', direction: 'out', amount: 5000, category: 'Biaya operasional', fundingSource: 'daily', balanceAfter: 0, createdAt: '2026-08-22T07:00:00.000Z' },
      // Not netted: wrong day, wrong direction, or funded from the loan pool instead.
      { id: 'k2', direction: 'out', amount: 999, category: 'x', fundingSource: 'daily', balanceAfter: 0, createdAt: '2026-08-21T07:00:00.000Z' },
      { id: 'k3', direction: 'in', amount: 999, category: 'x', balanceAfter: 0, createdAt: '2026-08-22T07:00:00.000Z' },
      { id: 'k4', direction: 'out', amount: 999, category: 'x', fundingSource: 'loan', balanceAfter: 0, createdAt: '2026-08-22T07:00:00.000Z' },
    ];
    const recap = buildDailyRecap('2026-08-22', sales, payments, cashEntries, { code: 'CASH', name: 'Tunai' });
    expect(recap.totalRevenue).toBe(13000); // 18000 - 5000
    expect(recap.byMethod.find(m => m.methodCode === 'CASH')?.amount).toBe(5000); // 10000 - 5000
    const sum = recap.byMethod.reduce((s, m) => s + m.amount, 0);
    expect(sum).toBe(recap.totalRevenue);
  });
  it('creates a cash bucket for a "dari transaksi harian" draw when no cash sale exists that day', () => {
    const cashOnlySales = [{ invoice: 'INV-QRIS', total: 5000, createdAt: '2026-08-23T09:00:00.000Z' }];
    const cashOnlyPayments = [{ saleId: 'INV-QRIS', methodCode: 'QRIS', methodName: 'QRIS', amount: 5000 }];
    const cashEntries: CashLedgerEntry[] = [{ id: 'k1', direction: 'out', amount: 2000, category: 'x', fundingSource: 'daily', balanceAfter: 0, createdAt: '2026-08-23T07:00:00.000Z' }];
    const recap = buildDailyRecap('2026-08-23', cashOnlySales, cashOnlyPayments, cashEntries, { code: 'CASH', name: 'Tunai' });
    expect(recap.totalRevenue).toBe(3000);
    expect(recap.byMethod.find(m => m.methodCode === 'CASH')).toEqual({ methodCode: 'CASH', methodName: 'Tunai', count: 0, amount: -2000 });
  });
  it('nets an exchange to a cheaper item down, and reconciles with the signed payment diff', () => {
    // Old invoice untouched (paid in full, Rp 9.000 Tunai); new invoice's payment is the SIGNED
    // diff (-4.500, kembalian), never clamped to zero — so byMethod still sums to totalRevenue.
    const daySales = [
      { invoice: 'INV-OLD', total: 9000, createdAt: '2026-08-22T09:00:00.000Z', exchanges: oldExchangedSale.exchanges },
      { invoice: 'INV-NEW', total: 4500, createdAt: '2026-08-22T09:05:00.000Z' },
    ];
    const dayPayments = [
      { saleId: 'INV-OLD', methodCode: 'CASH', methodName: 'Tunai', amount: 9000 },
      { saleId: 'INV-NEW', methodCode: 'CASH', methodName: 'Tunai', amount: -4500 },
    ];
    const recap = buildDailyRecap('2026-08-22', daySales, dayPayments);
    expect(recap.totalRevenue).toBe(4500);
    expect(recap.transactionCount).toBe(1);
    const sum = recap.byMethod.reduce((s, m) => s + m.amount, 0);
    expect(sum).toBe(recap.totalRevenue);
  });
});

describe('withMethodPercentages', () => {
  const byMethod: DailyMethodRecap[] = [
    { methodCode: 'CASH', methodName: 'Tunai', count: 1, amount: 7500 },
    { methodCode: 'QRIS', methodName: 'QRIS', count: 1, amount: 2500 }
  ];
  it('computes each method share of the total revenue', () => {
    expect(withMethodPercentages(byMethod, 10000).map(m => m.percent)).toEqual([0.75, 0.25]);
  });
  it('returns zero percentages when there is no revenue', () => {
    expect(withMethodPercentages(byMethod, 0).every(m => m.percent === 0)).toBe(true);
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
