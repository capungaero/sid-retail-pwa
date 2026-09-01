import { describe, expect, it } from 'vitest';
import { cashLedgerReportHtml, dailySalesReportHtml, escapeHtml, receiptHtml } from './print';
import { demoCustomers, demoProducts } from '../data';
import type { SaleRecord } from '../types';

describe('thermal receipt safety', () => {
  it('escapes untrusted html', () => expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;'));
  it('does not include customer markup as executable html', () => {
    const html = receiptHtml({ invoice:'INV-1', customer:{...demoCustomers[0],name:'<img src=x onerror=alert(1)>'}, lines:[{productName:demoProducts[0].name,unitName:demoProducts[0].units[0].name,unitPrice:demoProducts[0].units[0].price,qty:1,discount:0}],paid:5000,total:3500 });
    expect(html).not.toContain('<img src=x'); expect(html).toContain('&lt;img src=x');
  });
});

describe('daily sales report', () => {
  const sale: SaleRecord = {
    id: 's1', invoice: 'INV-1', customerId: 'general', customerName: 'Umum', cashierName: 'satri', methodName: 'Tunai',
    lines: [{ productId: '1', productName: 'Air', unit: 'Botol', qty: 2, price: 3500, discount: 0 }],
    total: 7000, paid: 7000, change: 0, createdAt: '2026-09-01T01:00:00.000Z',
  };
  it('renders the eight columns including Metode bayar, Kasir and Sisa stok', () => {
    const html = dailySalesReportHtml([sale], 'Selasa, 01 September 2026', { stockByProduct: new Map([['1', 40]]) });
    ['No', 'Nama barang', 'Satuan', 'Qty', 'Metode bayar', 'Kasir', 'Harga', 'Sisa stok'].forEach(h => expect(html).toContain(`>${h}<`));
    expect(html).toContain('>Tunai<'); expect(html).toContain('>satri<'); expect(html).toContain('>40<');
  });
  it('lists kas kasir expenses and subtracts them for the Total akhir', () => {
    const html = dailySalesReportHtml([sale], 'Selasa, 01 September 2026', {
      expenses: [{ label: 'bayar air — satri', amount: 2000 }, { label: 'Biaya operasional — Admin', amount: 500 }],
    });
    expect(html).toContain('Rincian pengeluaran dari kas kasir');
    expect(html).toContain('bayar air — satri');
    expect(html).toContain('TOTAL KESELURUHAN: Rp 7.000');
    expect(html).toContain('TOTAL AKHIR: Rp 4.500');
  });
  it('keeps a swapped item under its original faktur: old item red, replacement shown, no replacement-faktur reference', () => {
    const root: SaleRecord = {
      id: 'r', invoice: 'PWA-0003', customerId: 'general', customerName: 'Umum', cashierName: 'Admin', methodName: 'Transfer',
      lines: [{ productId: 'shampo', productName: 'SHAMPO SUNSILK', unit: 'RENTENG', qty: 1, price: 9500, discount: 0 }],
      total: 9500, paid: 9500, change: 0, createdAt: '2026-09-01T01:00:00.000Z',
      exchanges: [{ oldProductId: 'shampo', oldUnit: 'RENTENG', oldQty: 1, oldLineValue: 9500, newInvoice: 'PWA-0007', newProductName: 'SUNLIGHT 375 GR', newUnit: 'PCS', newQty: 1, newLineValue: 6500 }],
    };
    const repl: SaleRecord = { id: 'r2', invoice: 'PWA-0007', customerId: 'general', customerName: 'Umum', cashierName: 'Admin', methodName: 'Transfer', lines: [{ productId: 'sunlight', productName: 'SUNLIGHT 375 GR', unit: 'PCS', qty: 1, price: 6500, discount: 0 }], total: 6500, paid: 6500, change: 0, createdAt: '2026-09-01T01:05:00.000Z' };
    const html = dailySalesReportHtml([root], 'Selasa, 01 September 2026', { allSales: [root, repl] });
    expect(html).toContain('class="swapped"');
    expect(html).toContain('SHAMPO SUNSILK');
    expect(html).toContain('SUNLIGHT 375 GR');
    expect(html).not.toContain('faktur PWA-0007');
  });
  it('shows a placeholder when there are no expenses', () => {
    const html = dailySalesReportHtml([sale], 'Selasa, 01 September 2026', {});
    expect(html).toContain('Tidak ada pengeluaran dari kas kasir hari ini');
    expect(html).toContain('TOTAL AKHIR: Rp 7.000');
  });
});

describe('cash ledger report', () => {
  it('lists masuk/keluar in separate columns and totals the difference', () => {
    const html = cashLedgerReportHtml([
      { createdAt: '2026-09-01T01:00:00.000Z', category: 'Setoran modal', sourceLabel: 'Kas Kecil', note: 'modal', direction: 'in', amount: 100000 },
      { createdAt: '2026-09-01T02:00:00.000Z', category: 'Biaya operasional', sourceLabel: 'Kas Kasir (Admin)', note: 'bensin', direction: 'out', amount: 30000 },
    ], { rangeLabel: '1/9/2026 s/d 1/9/2026' });
    expect(html).toContain('Kas masuk');
    expect(html).toContain('Kas keluar');
    expect(html).toContain('bensin');
    expect(html).toContain('Periode 1/9/2026 s/d 1/9/2026');
    expect(html).toContain('70.000');
  });
});
