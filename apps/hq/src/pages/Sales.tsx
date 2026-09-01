import { useEffect, useState } from 'react';
import type { SaleRecord } from '@web/types';
import { money } from '@web/lib/money';
import { todayKey } from '@web/lib/date';
import { netBasketTotal, rootSalesOnly } from '@web/lib/reports';
import { listBranches } from '../lib/branches';
import { getFromAllBranches } from '../lib/aggregate';
import { branchRequest } from '../lib/hqApi';
import type { Branch, BranchResult, ReportSummary } from '../types';

function daysAgoKey(days: number): string {
  return todayKey(new Date(Date.now() - days * 86400000));
}

export function Sales() {
  const [branches] = useState(() => listBranches());
  const [from, setFrom] = useState(() => daysAgoKey(6));
  const [to, setTo] = useState(() => todayKey());
  const [results, setResults] = useState<BranchResult<ReportSummary>[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBranch, setDetailBranch] = useState<Branch | null>(null);
  const [detailSales, setDetailSales] = useState<SaleRecord[]>([]);
  const [detailError, setDetailError] = useState('');

  const load = async () => {
    setLoading(true);
    setResults(await getFromAllBranches<ReportSummary>(branches, `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`));
    setLoading(false);
  };
  useEffect(() => { void load(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!detailBranch) return;
    setDetailError(''); setDetailSales([]);
    branchRequest<SaleRecord[]>(detailBranch, `/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(setDetailSales)
      .catch(err => setDetailError(err instanceof Error ? err.message : 'Permintaan gagal.'));
  }, [detailBranch, from, to]);

  const ok = results.filter(r => r.ok);
  const totalRevenue = ok.reduce((sum, r) => sum + (r.ok ? r.data.totalRevenue : 0), 0);
  const totalCount = ok.reduce((sum, r) => sum + (r.ok ? r.data.transactionCount : 0), 0);
  const detailRoots = rootSalesOnly(detailSales);

  return <div className="page">
    <div className="page-heading">
      <div><h1>Penjualan</h1><p>Rekap penjualan per cabang untuk satu rentang tanggal.</p></div>
      <div className="history-tools">
        <label className="date-field">Dari<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="date-field">Sampai<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
    </div>

    <div className="history-summary">
      <div className="metric"><div><span>Total omzet (semua cabang)</span><strong>{money.format(totalRevenue)}</strong></div></div>
      <div className="metric"><div><span>Total transaksi</span><strong>{totalCount}</strong></div></div>
      <div className="metric"><div><span>Cabang terhubung</span><strong>{ok.length}/{branches.length}</strong></div></div>
    </div>

    <div className="branch-grid">
      {results.map(r => <article className="branch-card" key={r.branch.code}>
        <header><h2>{r.branch.name}</h2><button className="link-button" onClick={() => setDetailBranch(r.branch)}>Rincian</button></header>
        {r.ok ? <>
          <span className="branch-total">{money.format(r.data.totalRevenue)}</span>
          <span className="branch-sub">{r.data.transactionCount} transaksi</span>
          <div className="table-wrap"><table>
            <thead><tr><th>Tanggal</th><th className="numeric">Omzet</th><th className="numeric">Trx</th><th className="numeric">Tarikan harian</th></tr></thead>
            <tbody>{r.data.days.map(d => <tr key={d.date}>
              <td className="mono">{d.date}</td>
              <td className="numeric">{money.format(d.netRevenue)}</td>
              <td className="numeric">{d.transactionCount}</td>
              <td className="numeric">{d.drawnFromDaily ? money.format(d.drawnFromDaily) : '—'}</td>
            </tr>)}</tbody>
          </table></div>
        </> : <span className="branch-error">{r.error}</span>}
      </article>)}
      {loading && !results.length && <p className="muted">Memuat rekap cabang…</p>}
    </div>

    {detailBranch && <div className="panel flush" style={{ marginTop: 12 }}>
      <div className="table-tools"><h2>Rincian transaksi — {detailBranch.name} ({from} s/d {to})</h2><button className="button ghost" onClick={() => setDetailBranch(null)}>Tutup</button></div>
      {detailError && <div className="notice error" role="alert">{detailError}</div>}
      <div className="table-wrap"><table>
        <thead><tr><th>Faktur</th><th>Tanggal</th><th>Pelanggan</th><th>Kasir</th><th>Metode</th><th className="numeric">Total</th></tr></thead>
        <tbody>{detailRoots.map(s => <tr key={s.invoice}>
          <td className="mono">{s.invoice}</td>
          <td className="mono">{s.createdAt.slice(0, 10)}</td>
          <td>{s.customerName}</td>
          <td>{s.cashierName ?? '—'}</td>
          <td>{s.methodName ?? '—'}</td>
          <td className="numeric">{money.format(netBasketTotal(s, detailSales))}</td>
        </tr>)}</tbody>
      </table></div>
      {!detailRoots.length && !detailError && <div className="empty-state">Tidak ada transaksi pada rentang ini.</div>}
    </div>}
  </div>;
}
