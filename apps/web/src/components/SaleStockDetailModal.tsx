import { useEffect, useRef } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { money, number } from '../lib/money';
import type { SaleRecord } from '../types';

// Per line item, how much stock the product had before/after this sale. stockBefore is a
// projection from current stock (see SaleLine's type comment), not a stored historical value.
export function SaleStockDetailModal({ sale, onClose }: { sale: SaleRecord; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const exchanges = sale.exchanges ?? [];
  const exchangeFor = (productId: string, unit: string) => exchanges.find(x => x.oldProductId === productId && x.oldUnit === unit);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const keys = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', keys);
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.removeEventListener('keydown', keys); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-overlay" role="presentation"><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="sale-stock-title">
    <div className="modal-heading"><div><p className="eyebrow">Detail stok</p><h2 id="sale-stock-title">{sale.invoice}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <p className="muted" style={{ marginTop: -8 }}>{new Date(sale.createdAt).toLocaleString('id-ID')} · Kasir {sale.cashierName || '—'} · {sale.customerName || 'Tanpa nama'}</p>
    {exchanges.length > 0 && <div className="notice info" role="status"><ArrowLeftRight /> Transaksi ini sudah ditukar. Barang pengganti tercatat di {exchanges.map(x => x.newInvoice).join(', ')}.</div>}
    <div className="table-wrap"><table><thead><tr><th>Barang</th><th className="numeric">Stok awal</th><th className="numeric">Terjual</th><th className="numeric">Harga</th><th className="numeric">Sisa stok</th></tr></thead><tbody>
      {sale.lines.map((l, i) => { const ex = exchangeFor(l.productId, l.unit); return <tr key={i}><td>{l.productName}<br /><small className="muted">{l.unit}</small>{ex && <><br /><small className="muted">Ditukar → {ex.newProductName} ({ex.newInvoice})</small></>}</td><td className="numeric mono">{l.stockBefore ?? '—'}</td><td className="numeric mono">{number.format(l.qty)}</td><td className="numeric mono">{money.format(l.qty * l.price - l.discount)}</td><td className="numeric mono">{l.stockAfter ?? '—'}</td></tr>; })}
    </tbody></table></div>
    <div className="summary"><div className="grand-total"><span>Total penjualan</span><strong>{money.format(sale.total)}</strong></div></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Tutup</button></div>
  </section></div>;
}
