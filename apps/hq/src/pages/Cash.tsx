import { useEffect, useState } from 'react';
import type { CashLedgerEntry } from '@web/types';
import { money } from '@web/lib/money';
import { cashPosition, filterByRange } from '@web/lib/reports';
import type { DateRange } from '@web/lib/reports';
import { listBranches } from '../lib/branches';
import { branchRequest } from '../lib/hqApi';
import type { Branch } from '../types';

export function Cash() {
  const [branches] = useState(() => listBranches());
  const [selected, setSelected] = useState<Branch | null>(branches[0] ?? null);
  const [range, setRange] = useState<DateRange>({});
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setError('');
    branchRequest<CashLedgerEntry[]>(selected, '/finance/cash-entries')
      .then(setEntries)
      .catch(err => { setError(err instanceof Error ? err.message : 'Permintaan gagal.'); setEntries([]); })
      .finally(() => setLoading(false));
  }, [selected]);

  const visible = filterByRange(entries, range);
  // Position over the FILTERED window for in/out totals; the running balance is whole-ledger
  // (balanceAfter of the last entry), so it comes from the unfiltered list.
  const rangePosition = cashPosition(visible);
  const overallBalance = cashPosition(entries).balance;

  return <div className="page">
    <div className="page-heading">
      <div><h1>Kas Cabang</h1><p>Pemasukan dan pengeluaran per cabang.</p></div>
      <div className="history-tools">
        <label className="date-field">Dari<input type="date" value={range.start ?? ''} onChange={e => setRange(r => ({ ...r, start: e.target.value || undefined }))} /></label>
        <label className="date-field">Sampai<input type="date" value={range.end ?? ''} onChange={e => setRange(r => ({ ...r, end: e.target.value || undefined }))} /></label>
      </div>
    </div>

    <div className="branch-picker">{branches.map(b => <button key={b.code} className={selected?.code === b.code ? 'active' : ''} onClick={() => setSelected(b)}>{b.name}</button>)}</div>
    {error && <div className="notice error" role="alert">{error}</div>}

    <div className="history-summary">
      <div className="metric"><div><span>Kas masuk (periode)</span><strong>{money.format(rangePosition.totalIn)}</strong></div></div>
      <div className="metric"><div><span>Kas keluar (periode)</span><strong>{money.format(rangePosition.totalOut)}</strong></div></div>
      <div className="metric"><div><span>Saldo berjalan</span><strong>{money.format(overallBalance)}</strong></div></div>
    </div>

    <div className="panel flush"><div className="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Arah</th><th>Kategori</th><th>Keterangan</th><th className="numeric">Jumlah</th><th className="numeric">Saldo</th></tr></thead>
      <tbody>{[...visible].reverse().map(e => <tr key={e.id}>
        <td className="mono">{e.createdAt.slice(0, 10)}</td>
        <td><span className={`status ${e.direction === 'in' ? 'success' : 'danger'}`}>{e.direction === 'in' ? 'Masuk' : 'Keluar'}</span></td>
        <td>{e.category}</td>
        <td>{e.note ?? '—'}</td>
        <td className={`numeric ${e.direction === 'out' ? 'danger-text' : ''}`}>{money.format(e.amount)}</td>
        <td className="numeric">{money.format(e.balanceAfter)}</td>
      </tr>)}</tbody>
    </table></div>
    {!visible.length && !loading && <div className="empty-state">Tidak ada entri kas pada periode ini.</div>}</div>
  </div>;
}
