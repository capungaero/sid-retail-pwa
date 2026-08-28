import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStoredUser, listSales } from '../lib/api';
import { summarizeSales } from '../lib/reports';
import { money, number } from '../lib/money';
import type { SaleRecord } from '../types';

// karyawan.level for an admin account (see config/sid.php's level_role_map on the API side) —
// the raw legacy code, not the mapped Pengaturan role key ('admin'), is what AuthUser.role holds.
const ADMIN_LEVEL = 'ADM';

export function Transactions() {
  const [sales, setSales] = useState<SaleRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<SaleRecord | null>(null);
  const isAdmin = getStoredUser()?.role === ADMIN_LEVEL;
  const load = () => { setLoading(true); setError(''); listSales().then(setSales).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat transaksi')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = useMemo(() => sales
    .filter(s => (!from || s.createdAt.slice(0, 10) >= from) && (!to || s.createdAt.slice(0, 10) <= to))
    .filter(s => { const q = search.trim().toLowerCase(); return !q || [s.invoice, s.customerName].some(v => v.toLowerCase().includes(q)); })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [sales, from, to, search]);
  const summary = useMemo(() => summarizeSales(filtered), [filtered]);

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Ringkasan</p><h1>Riwayat transaksi</h1><p>Seluruh penjualan, dapat difilter berdasarkan tanggal.</p></div><Link className="button secondary" to="/dashboard"><ArrowLeft /> Kembali</Link></div>
    <section className="metric-grid" aria-label="Ringkasan hasil filter" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
      <article className="metric"><div><span>Transaksi</span><strong>{number.format(summary.count)}</strong></div></article>
      <article className="metric"><div><span>Item terjual</span><strong>{number.format(summary.qtySold)}</strong></div></article>
      <article className="metric"><div><span>Total pendapatan</span><strong>{money.format(summary.revenue)}</strong></div></article>
    </section>
    <section className="panel flush">
      <div className="table-tools">
        <label className="search-box"><Search aria-hidden="true" /><span className="sr-only">Cari faktur atau pelanggan</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari faktur atau nama pelanggan…" /></label>
        <label className="date-field">Dari<input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
        <label className="date-field">Sampai<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat riwayat transaksi…</div> : filtered.length === 0 ? <div className="empty-state">Tidak ada transaksi yang cocok.</div> : <div className="table-wrap"><table><thead><tr><th>Faktur</th><th>Tanggal</th><th>Kasir</th><th>Pelanggan</th><th>Barang</th><th className="numeric">Item</th><th className="numeric">Total</th></tr></thead><tbody>
        {filtered.map(s => <tr key={s.id} className={isAdmin ? 'row-clickable' : undefined} tabIndex={isAdmin ? 0 : undefined} role={isAdmin ? 'button' : undefined} onClick={isAdmin ? () => setDetail(s) : undefined} onKeyDown={isAdmin ? e => { if (e.key === 'Enter') setDetail(s); } : undefined}>
          <td className="mono">{s.invoice}</td><td>{new Date(s.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{s.cashierName || '—'}</td><td>{s.customerName || 'Tanpa nama'}</td><td><small>{s.lines.map(l => l.productName).join(', ')}</small></td><td className="numeric mono">{number.format(s.lines.reduce((sum, l) => sum + l.qty, 0))}</td><td className="numeric mono">{money.format(s.total)}</td>
        </tr>)}
      </tbody></table></div>}
    </section>
    {detail && <SaleStockDetailModal sale={detail} onClose={() => setDetail(null)} />}
  </div>;
}

// Admin-only: per line item, how much stock the product had before/after this sale. stockBefore
// is a projection from current stock (see SaleLine's type comment), not a stored historical value.
function SaleStockDetailModal({ sale, onClose }: { sale: SaleRecord; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
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
    <div className="table-wrap"><table><thead><tr><th>Barang</th><th className="numeric">Stok awal</th><th className="numeric">Terjual</th><th className="numeric">Sisa stok</th></tr></thead><tbody>
      {sale.lines.map((l, i) => <tr key={i}><td>{l.productName}<br /><small className="muted">{l.unit}</small></td><td className="numeric mono">{l.stockBefore ?? '—'}</td><td className="numeric mono">{number.format(l.qty)}</td><td className="numeric mono">{l.stockAfter ?? '—'}</td></tr>)}
    </tbody></table></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Tutup</button></div>
  </section></div>;
}
