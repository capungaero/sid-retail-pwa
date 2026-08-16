import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listSales } from '../lib/api';
import { summarizeSales } from '../lib/reports';
import { money, number } from '../lib/money';
import type { SaleRecord } from '../types';

export function Transactions() {
  const [sales, setSales] = useState<SaleRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [search, setSearch] = useState('');
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
        <label className="muted">Dari<input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={{ display: 'block', height: 40, border: '1px solid #94a3b8', borderRadius: 7, padding: '0 8px' }} /></label>
        <label className="muted">Sampai<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={{ display: 'block', height: 40, border: '1px solid #94a3b8', borderRadius: 7, padding: '0 8px' }} /></label>
        <button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat riwayat transaksi…</div> : filtered.length === 0 ? <div className="empty-state">Tidak ada transaksi yang cocok.</div> : <div className="table-wrap"><table><thead><tr><th>Faktur</th><th>Tanggal</th><th>Pelanggan</th><th>Barang</th><th className="numeric">Item</th><th className="numeric">Total</th></tr></thead><tbody>
        {filtered.map(s => <tr key={s.id}><td className="mono">{s.invoice}</td><td>{new Date(s.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{s.customerName || 'Tanpa nama'}</td><td><small>{s.lines.map(l => l.productName).join(', ')}</small></td><td className="numeric mono">{number.format(s.lines.reduce((sum, l) => sum + l.qty, 0))}</td><td className="numeric mono">{money.format(s.total)}</td></tr>)}
      </tbody></table></div>}
    </section>
  </div>;
}
