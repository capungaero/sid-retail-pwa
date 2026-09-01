import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { DailyRecap } from '@web/types';
import { money } from '@web/lib/money';
import { todayKey } from '@web/lib/date';
import { listBranches } from '../lib/branches';
import { getFromAllBranches } from '../lib/aggregate';
import type { BranchResult } from '../types';

export function Dashboard() {
  const [branches] = useState(() => listBranches());
  const [date, setDate] = useState(() => todayKey());
  const [results, setResults] = useState<BranchResult<DailyRecap>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (day: string) => {
    setLoading(true);
    setResults(await getFromAllBranches<DailyRecap>(branches, `/reports/daily?date=${encodeURIComponent(day)}`));
    setLoading(false);
  };
  useEffect(() => { void load(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = results.filter(r => r.ok);
  const totalRevenue = ok.reduce((sum, r) => sum + (r.ok ? r.data.totalRevenue : 0), 0);
  const totalCount = ok.reduce((sum, r) => sum + (r.ok ? r.data.transactionCount : 0), 0);

  return <div className="page">
    <div className="page-heading">
      <div><h1>Ringkasan</h1><p>Omzet dan transaksi seluruh cabang.</p></div>
      <div className="history-tools">
        <label className="date-field">Tanggal<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <button className="button secondary" onClick={() => void load(date)} disabled={loading}><RefreshCw aria-hidden="true" />Segarkan</button>
      </div>
    </div>

    <div className="history-summary">
      <div className="metric"><div><span>Total omzet ({date})</span><strong>{money.format(totalRevenue)}</strong></div></div>
      <div className="metric"><div><span>Total transaksi</span><strong>{totalCount}</strong></div></div>
      <div className="metric"><div><span>Cabang terhubung</span><strong>{ok.length}/{branches.length}</strong></div></div>
    </div>

    <div className="branch-grid">
      {results.map(r => <article className="branch-card" key={r.branch.code}>
        <header><h2>{r.branch.name}</h2><span className="branch-code">{r.branch.code}</span></header>
        {r.ok ? <>
          <span className="branch-total">{money.format(r.data.totalRevenue)}</span>
          <span className="branch-sub">{r.data.transactionCount} transaksi</span>
          {r.data.byMethod.length > 0 && <ul className="recap-methods" style={{ padding: 0 }}>
            {r.data.byMethod.map(m => {
              const max = Math.max(...r.data.byMethod.map(x => Math.abs(x.amount)), 1);
              return <li key={m.methodCode}>
                <span className="branch-sub" style={{ minWidth: 90 }}>{m.methodName}</span>
                <span className="rm-track"><span className="rm-bar" style={{ width: `${Math.round(Math.abs(m.amount) / max * 100)}%`, display: 'block' }} /></span>
                <span className="mono branch-sub">{money.format(m.amount)}</span>
              </li>;
            })}
          </ul>}
        </> : <span className="branch-error">{r.error}</span>}
      </article>)}
      {loading && !results.length && <p className="muted">Memuat data cabang…</p>}
    </div>
  </div>;
}
