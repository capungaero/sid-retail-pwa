import { useEffect, useRef } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { money, number } from '../lib/money';
import { exchangeHopsFor, netBasketTotal } from '../lib/reports';
import type { SaleRecord } from '../types';

// One line's kurang-bayar/kembalian settlement, in words. Exchanges always settle the cash
// difference immediately at the register, so there is no "belum selesai" state today.
function settlementNote(diff: number): string {
  if (diff > 0) return `Kurang bayar ${money.format(diff)} — sudah diterima, transaksi selesai.`;
  if (diff < 0) return `Kembalian ${money.format(-diff)} — sudah diserahkan, transaksi selesai.`;
  return 'Nilai sama, tidak ada selisih uang — transaksi selesai.';
}

// Per line item, how much stock the product had before/after this sale. stockBefore is a
// projection from current stock (see SaleLine's type comment), not a stored historical value.
// `allSales` lets a swapped line's full history (possibly several re-exchanges deep) resolve here
// instead of pointing at a separate faktur row - see rootSalesOnly, which is why that row never
// shows up in Ringkasan/Laporan's own list to begin with.
export function SaleStockDetailModal({ sale, allSales, onClose }: { sale: SaleRecord; allSales: SaleRecord[]; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const hasExchanges = sale.lines.some(l => exchangeHopsFor(sale, l.productId, l.unit, allSales).length > 0);
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
    {hasExchanges && <div className="notice info" role="status"><ArrowLeftRight /> Transaksi ini sudah ditukar — lihat riwayat penukaran per barang di bawah.</div>}
    <div className="table-wrap"><table><thead><tr><th>Barang</th><th className="numeric">Stok awal</th><th className="numeric">Terjual</th><th className="numeric">Harga</th><th className="numeric">Sisa stok</th></tr></thead><tbody>
      {sale.lines.flatMap((l, i) => {
        const hops = exchangeHopsFor(sale, l.productId, l.unit, allSales);
        // An exchanged-away item is shown in red and NOT counted in the total - only the final
        // replacement the customer kept (black) is. Intermediate swaps in a chain are red too.
        const swapped = hops.length > 0;
        const rows = [<tr key={i} style={swapped ? { color: '#c0392b' } : undefined}><td>{l.productName}<br /><small className={swapped ? undefined : 'muted'}>{l.unit}{swapped ? ' · barang lama, ditukar (tidak dihitung)' : ''}</small></td><td className="numeric mono">{l.stockBefore ?? '—'}</td><td className="numeric mono">{number.format(l.qty)}</td><td className="numeric mono">{money.format(l.qty * l.price - l.discount)}</td><td className="numeric mono">{l.stockAfter ?? '—'}</td></tr>];
        hops.forEach((h, hi) => {
          const isLast = hi === hops.length - 1;
          rows.push(<tr key={`${i}-ex-${hi}`} style={isLast ? undefined : { color: '#c0392b' }}><td><ArrowLeftRight size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{h.newProductName}<br /><small className={isLast ? 'muted' : undefined}>{h.newUnit}{isLast ? '' : ' · barang lama, ditukar (tidak dihitung)'}</small></td><td className="numeric mono">—</td><td className="numeric mono">{number.format(h.newQty)}</td><td className="numeric mono">{money.format(h.newLineValue)}</td><td className="numeric mono">—</td></tr>);
          rows.push(<tr key={`${i}-note-${hi}`} className="muted"><td colSpan={5} style={{ fontSize: '.85em', paddingTop: 0 }}>{h.oldProductName} → {h.newProductName}: {settlementNote(h.diff)}</td></tr>);
        });
        return rows;
      })}
    </tbody></table></div>
    <div className="summary"><div className="grand-total"><span>Total penjualan{hasExchanges ? ' (setelah tukar)' : ''}</span><strong>{money.format(netBasketTotal(sale, allSales))}</strong></div></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Tutup</button></div>
  </section></div>;
}
