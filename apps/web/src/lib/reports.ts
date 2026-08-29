import { payableOutstanding, receivableOutstanding } from './finance';
import type { CashLedgerEntry, DailyMethodRecap, DailyRecap, Payable, Product, PurchaseOrder, Receivable, SaleExchangeInfo, SaleRecord } from '../types';

export type DateRange = { start?: string; end?: string };

// Inclusive date-range check over an ISO timestamp. An unset bound is treated as unbounded.
// start/end are plain dates (yyyy-mm-dd from a <input type="date">), so both are given an
// explicit time-of-day and parsed as local time, matching how a bare `createdAt` (no timezone
// suffix) is parsed. A bare `new Date('yyyy-mm-dd')` parses as UTC midnight instead — mixing
// that with a local-time createdAt silently dropped the first few hours of the start date
// (any WIB-morning sale before the UTC offset caught up), which read as missing transactions.
export function withinRange(createdAt: string, range: DateRange): boolean {
  const time = new Date(createdAt).getTime();
  if (range.start && time < new Date(`${range.start}T00:00:00.000`).getTime()) return false;
  if (range.end && time > new Date(`${range.end}T23:59:59.999`).getTime()) return false;
  return true;
}

export function filterByRange<T extends { createdAt: string }>(items: T[], range: DateRange): T[] {
  return items.filter(item => withinRange(item.createdAt, range));
}

export type SalesSummary = { count: number; qtySold: number; revenue: number; discount: number };

// Sum of a sale's own lines later swapped out via Tukar barang — the portion of its total that
// no longer reflects a kept item (the replacement is its own new sale, counted on its own).
export function exchangedOutValue(sale: { exchanges?: SaleExchangeInfo[] }): number {
  return (sale.exchanges ?? []).reduce((sum, x) => sum + x.oldLineValue, 0);
}

// A sale's revenue contribution net of anything later exchanged away, so an old invoice's total
// isn't double-counted against the replacement item's own new invoice.
export function netSaleTotal(sale: { total: number; exchanges?: SaleExchangeInfo[] }): number {
  return sale.total - exchangedOutValue(sale);
}

// A Tukar barang exchange books its replacement item as its own new invoice, so a naive row
// count reads one customer visit as two transactions. This counts a set of sales the way a
// cashier would: an exchange's new invoice is a continuation of its original, not a fresh one.
export function countDistinctTransactions(sales: { invoice: string; exchanges?: SaleExchangeInfo[] }[]): number {
  const exchangedInvoices = new Set(sales.flatMap(s => (s.exchanges ?? []).map(x => x.newInvoice)));
  return sales.filter(s => !exchangedInvoices.has(s.invoice)).length;
}

export type CashierCashTotal = { cashierName: string; amount: number };

// Today's own cash-method (Tunai) revenue per cashier, netted the same way as netSaleTotal. Used
// to show "berapa saldo tunai kasir X hari ini" when attributing a "dari transaksi harian" kas
// keluar to a specific cashier - the picker shows exactly what that cashier is on the hook for.
export function cashierDailyCashTotals(sales: SaleRecord[], date: string, cashMethodName: string): CashierCashTotal[] {
  const map = new Map<string, number>();
  sales.filter(s => s.createdAt.slice(0, 10) === date && s.methodName === cashMethodName && s.cashierName)
    .forEach(s => map.set(s.cashierName!, (map.get(s.cashierName!) ?? 0) + netSaleTotal(s)));
  return Array.from(map, ([cashierName, amount]) => ({ cashierName, amount })).sort((a, b) => b.amount - a.amount);
}

// Aggregates completed sales into transaction count, units sold, revenue and total discount given.
export function summarizeSales(sales: SaleRecord[]): SalesSummary {
  const totals = sales.reduce<Omit<SalesSummary, 'count'>>((acc, sale) => {
    const qty = sale.lines.reduce((sum, line) => sum + line.qty, 0);
    const discount = sale.lines.reduce((sum, line) => sum + line.discount, 0);
    return { qtySold: acc.qtySold + qty, revenue: acc.revenue + netSaleTotal(sale), discount: acc.discount + discount };
  }, { qtySold: 0, revenue: 0, discount: 0 });
  return { count: countDistinctTransactions(sales), ...totals };
}

export type PurchaseSummary = { count: number; orderedValue: number; receivedValue: number };

// Aggregates purchase orders into order count, total value ordered and value actually received so far.
export function summarizePurchases(orders: PurchaseOrder[]): PurchaseSummary {
  return orders.reduce<PurchaseSummary>((acc, po) => {
    const ordered = po.lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
    const received = po.lines.reduce((sum, line) => sum + line.receivedQty * line.cost, 0);
    return { count: acc.count + 1, orderedValue: acc.orderedValue + ordered, receivedValue: acc.receivedValue + received };
  }, { count: 0, orderedValue: 0, receivedValue: 0 });
}

// Products whose current stock has fallen to or below their configured minimum, worst-first.
export function lowStockProducts(products: Product[]): Product[] {
  return products.filter(p => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);
}

export type CashPosition = { totalIn: number; totalOut: number; balance: number };

// Cash-in/out totals plus the current running balance (the last ledger entry's balanceAfter).
export function cashPosition(entries: CashLedgerEntry[]): CashPosition {
  const totalIn = entries.filter(e => e.direction === 'in').reduce((sum, e) => sum + e.amount, 0);
  const totalOut = entries.filter(e => e.direction === 'out').reduce((sum, e) => sum + e.amount, 0);
  return { totalIn, totalOut, balance: entries.at(-1)?.balanceAfter ?? 0 };
}

export type ProfitLoss = { revenue: number; cogs: number; grossProfit: number; margin: number };

// Simple gross-margin P&L: revenue from completed sales minus cost of goods sold (product.cost * qty sold).
// This is a demo report, not full accounting -- no operating expenses, taxes, or shrinkage are factored in.
export function calculateProfitLoss(sales: SaleRecord[], products: Product[]): ProfitLoss {
  const costByProduct = new Map(products.map(p => [p.id, p.cost]));
  let revenue = 0, cogs = 0;
  sales.forEach(sale => {
    sale.lines.forEach(line => {
      revenue += line.qty * line.price - line.discount;
      cogs += line.qty * (costByProduct.get(line.productId) ?? 0);
    });
    // Lines later swapped away via Tukar barang went back to stock — back out both their revenue
    // and their cost of goods, or a returned item's margin would stay counted after it left.
    (sale.exchanges ?? []).forEach(x => {
      revenue -= x.oldLineValue;
      cogs -= x.oldQty * (costByProduct.get(x.oldProductId) ?? 0);
    });
  });
  const grossProfit = revenue - cogs;
  return { revenue, cogs, grossProfit, margin: revenue > 0 ? grossProfit / revenue : 0 };
}

export type PartyBalance = { id: string; name: string; total: number; outstanding: number };

// Groups outstanding payables by supplier, worst (largest outstanding) first.
export function summarizePayablesBySupplier(payables: Payable[]): PartyBalance[] {
  const map = new Map<string, PartyBalance>();
  payables.forEach(p => {
    const entry = map.get(p.supplierId) ?? { id: p.supplierId, name: p.supplierName, total: 0, outstanding: 0 };
    entry.total += p.amount;
    entry.outstanding += payableOutstanding(p);
    map.set(p.supplierId, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
}

// The "Lainnya / tidak tercatat" bucket code for sales with no recorded payment method
// (typically legacy sales predating this feature). Kept in sync with the backend.
export const UNTRACKED_METHOD_CODE = '__untracked__';

export type RecapSale = { invoice: string; total: number; createdAt: string; exchanges?: SaleExchangeInfo[] };
export type RecapPayment = { saleId: string; methodCode: string; methodName: string; amount: number };

// Builds a per-payment-method daily recap for a single day (yyyy-mm-dd). Sales are joined to
// payment rows by invoice; sales with no payment row are bucketed as "Lainnya / tidak tercatat"
// so byMethod always reconciles with totalRevenue (the actual sum of the day's sales). Mirrors
// the backend DailyReportController so the demo path and the real path agree.
// A kas keluar entry funded "dari transaksi harian" is also netted out of totalRevenue and the
// cash-type method's bucket, since that cash physically left today's takings. "Dari kas
// pinjaman" entries are NOT netted here — they're drawn from the overall pool, not today's sales.
export function buildDailyRecap(date: string, sales: RecapSale[], payments: RecapPayment[], cashEntries: CashLedgerEntry[] = [], cashMethod?: { code: string; name: string }): DailyRecap {
  const daySales = sales.filter(s => s.createdAt.slice(0, 10) === date);
  const dayIds = new Set(daySales.map(s => s.invoice));
  const dayPayments = payments.filter(p => dayIds.has(p.saleId));
  const map = new Map<string, DailyMethodRecap>();
  dayPayments.forEach(p => {
    const entry = map.get(p.methodCode) ?? { methodCode: p.methodCode, methodName: p.methodName, count: 0, amount: 0 };
    entry.count += 1; entry.amount += p.amount;
    map.set(p.methodCode, entry);
  });
  const byMethod = Array.from(map.values());
  const trackedIds = new Set(dayPayments.map(p => p.saleId));
  const untracked = daySales.filter(s => !trackedIds.has(s.invoice));
  if (untracked.length) {
    byMethod.push({ methodCode: UNTRACKED_METHOD_CODE, methodName: 'Lainnya / tidak tercatat', count: untracked.length, amount: untracked.reduce((sum, s) => sum + netSaleTotal(s), 0) });
  }
  const drawnFromDaily = cashEntries.filter(e => e.direction === 'out' && e.fundingSource === 'daily' && e.createdAt.slice(0, 10) === date).reduce((sum, e) => sum + e.amount, 0);
  let totalRevenue = daySales.reduce((sum, s) => sum + netSaleTotal(s), 0);
  if (drawnFromDaily > 0) {
    totalRevenue -= drawnFromDaily;
    if (cashMethod) {
      const idx = byMethod.findIndex(m => m.methodCode === cashMethod.code);
      if (idx >= 0) byMethod[idx] = { ...byMethod[idx], amount: byMethod[idx].amount - drawnFromDaily };
      else byMethod.push({ methodCode: cashMethod.code, methodName: cashMethod.name, count: 0, amount: -drawnFromDaily });
    }
  }
  byMethod.sort((a, b) => b.amount - a.amount);
  return { date, totalRevenue, transactionCount: countDistinctTransactions(daySales), byMethod };
}

export type MethodRecapRow = DailyMethodRecap & { percent: number };

// Adds each method's share of the day's total revenue (0..1). Zero revenue → zero percentages.
export function withMethodPercentages(byMethod: DailyMethodRecap[], totalRevenue: number): MethodRecapRow[] {
  return byMethod.map(m => ({ ...m, percent: totalRevenue > 0 ? m.amount / totalRevenue : 0 }));
}

// Groups outstanding receivables by customer, worst (largest outstanding) first.
export function summarizeReceivablesByCustomer(receivables: Receivable[]): PartyBalance[] {
  const map = new Map<string, PartyBalance>();
  receivables.forEach(r => {
    const entry = map.get(r.customerId) ?? { id: r.customerId, name: r.customerName, total: 0, outstanding: 0 };
    entry.total += r.amount;
    entry.outstanding += receivableOutstanding(r);
    map.set(r.customerId, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
}
