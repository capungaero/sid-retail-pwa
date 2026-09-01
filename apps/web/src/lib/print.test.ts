import { describe, expect, it } from 'vitest';
import { dailySalesReportHtml, escapeHtml, receiptHtml } from './print';
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
  it('shows a placeholder when there are no expenses', () => {
    const html = dailySalesReportHtml([sale], 'Selasa, 01 September 2026', {});
    expect(html).toContain('Tidak ada pengeluaran dari kas kasir hari ini');
    expect(html).toContain('TOTAL AKHIR: Rp 7.000');
  });
});
