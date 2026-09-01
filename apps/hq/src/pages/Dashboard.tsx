import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RefreshCw } from 'lucide-react';
import type { DailyMethodRecap } from '@web/types';
import { money } from '@web/lib/money';
import { todayKey } from '@web/lib/date';
import { listBranches } from '../lib/branches';
import { getFromAllBranches } from '../lib/aggregate';
import type { BranchResult } from '../types';

// The "iOS style, kaya warna" dashboard from Claude Design mockup 1c, fed by REAL per-branch
// data (/reports/summary), not the mockup's fixed sample numbers. Period toggle drives one
// range fetch per branch; everything below (metric cards, omzet trend, payment mix, branch
// table) is derived from those responses.

const MONO = "'Fira Code', ui-monospace, Menlo, monospace";
const SANS = 'system-ui, -apple-system, sans-serif';

type SummaryDay = { date: string; netRevenue: number; transactionCount: number; drawnFromDaily: number };
type Summary = { from: string; to: string; days: SummaryDay[]; byMethod: DailyMethodRecap[]; totalRevenue: number; transactionCount: number };

const PERIODS: { label: string; days: number }[] = [
  { label: '7 Hari', days: 7 },
  { label: '30 Hari', days: 30 }
];
const BAR_COLORS = ['#0b62fe', '#34c759', '#af52de', '#ff9500', '#5b9bff', '#ff3b30'];

function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}
function dayAxis(to: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftDays(to, -(n - 1 - i)));
}
function shortLabel(key: string): string {
  const [, , d] = key.split('-').map(Number);
  return String(d);
}

export function Dashboard() {
  const [branches] = useState(() => listBranches());
  const [date, setDate] = useState(() => todayKey());
  const [period, setPeriod] = useState(PERIODS[0]);
  const [results, setResults] = useState<BranchResult<Summary>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (to: string, days: number) => {
    setLoading(true);
    const from = shiftDays(to, -(days - 1));
    setResults(await getFromAllBranches<Summary>(branches, `/reports/summary?from=${from}&to=${to}`));
    setLoading(false);
  };
  useEffect(() => { void load(date, period.days); }, [date, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const ok = results.filter((r): r is { branch: BranchResult<Summary>['branch']; ok: true; data: Summary } => r.ok);
  const totalRevenue = ok.reduce((s, r) => s + r.data.totalRevenue, 0);
  const totalCount = ok.reduce((s, r) => s + r.data.transactionCount, 0);
  const avgPerTrx = totalCount > 0 ? totalRevenue / totalCount : 0;

  // Per-day omzet across all branches, on a continuous axis so the line has no gaps.
  const axis = useMemo(() => dayAxis(date, period.days), [date, period]);
  const series = useMemo(() => axis.map(day =>
    ok.reduce((s, r) => s + (r.data.days.find(d => d.date === day)?.netRevenue ?? 0), 0)
  ), [axis, ok]);

  // Payment mix summed across branches by method.
  const payMix = useMemo(() => {
    const map = new Map<string, { name: string; amount: number }>();
    for (const r of ok) for (const m of r.data.byMethod) {
      const cur = map.get(m.methodCode) ?? { name: m.methodName, amount: 0 };
      cur.amount += m.amount; map.set(m.methodCode, cur);
    }
    return [...map.values()].filter(m => m.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [ok]);
  const payMax = Math.max(...payMix.map(m => m.amount), 1);

  const chart = buildChart(series);
  const metrics = [
    { label: `Omzet ${period.label.toLowerCase()}`, value: money.format(totalRevenue), tint: '#0b62fe', tintBg: 'rgba(11,98,254,.12)', icon: 'M2 7h20v10H2V7zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6 10v4M18 10v4' },
    { label: 'Transaksi', value: totalCount.toLocaleString('id-ID'), tint: '#34c759', tintBg: 'rgba(52,199,89,.14)', icon: 'M5 3v18l2-1.4 2 1.4 2-1.4 2 1.4 2-1.4 2 1.4V3l-2 1.4L13 3l-2 1.4L9 3 7 4.4 5 3zM9 9h6M9 13h6' },
    { label: 'Rata-rata / transaksi', value: money.format(Math.round(avgPerTrx)), tint: '#af52de', tintBg: 'rgba(175,82,222,.13)', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
    { label: 'Cabang terhubung', value: `${ok.length} / ${branches.length}`, tint: '#ff9500', tintBg: 'rgba(255,149,0,.15)', icon: 'M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10' }
  ];

  return (
    <div style={{ fontFamily: SANS, color: '#0b0f19' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div><h1 style={{ margin: 0, font: `700 24px/1.1 ${SANS}`, letterSpacing: '-.02em' }}>Ringkasan Jaringan</h1><p style={{ margin: '4px 0 0', font: `500 12.5px ${SANS}`, color: 'rgba(11,15,25,.5)' }}>Omzet dan transaksi seluruh cabang.</p></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, background: '#e6e6ee', borderRadius: 10, padding: 3 }}>
            {PERIODS.map(p => {
              const active = p.label === period.label;
              return <button key={p.label} onClick={() => setPeriod(p)} style={{ height: 32, padding: '0 14px', border: 0, borderRadius: 8, background: active ? '#fff' : 'transparent', color: active ? '#0b0f19' : 'rgba(11,15,25,.55)', font: `600 12.5px ${SANS}`, boxShadow: active ? '0 1px 2px rgba(16,24,40,.14)' : 'none', cursor: 'pointer' }}>{p.label}</button>;
            })}
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: `600 11.5px ${SANS}`, color: 'rgba(11,15,25,.55)' }}>Sampai tanggal
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ height: 36, border: '1px solid #d9d9e0', borderRadius: 10, padding: '0 10px', font: `500 13px ${MONO}`, color: '#0b0f19' }} />
          </label>
          <button onClick={() => void load(date, period.days)} disabled={loading} style={{ height: 36, border: '1px solid #d9d9e0', borderRadius: 10, background: '#fff', color: '#0b0f19', font: `600 12.5px ${SANS}`, display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}><RefreshCw size={15} aria-hidden="true" />Segarkan</button>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
        {metrics.map(m => (
          <div key={m.label} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <span style={{ font: `600 11.5px ${SANS}`, color: 'rgba(11,15,25,.55)' }}>{m.label}</span>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: m.tintBg, display: 'grid', placeItems: 'center' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill={m.tint} fillOpacity=".22" stroke={m.tint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg>
              </span>
            </div>
            <div style={{ font: `700 22px/1.1 ${MONO}`, letterSpacing: '-.02em' }}>{loading ? '…' : m.value}</div>
          </div>
        ))}
      </div>

      {/* Omzet trend + payment mix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 12, marginBottom: 12 }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div><div style={{ font: `700 14px ${SANS}` }}>Omzet jaringan</div><div style={{ font: `500 11.5px ${SANS}`, color: 'rgba(11,15,25,.5)' }}>{axis[0]} – {date}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ font: `700 18px ${MONO}` }}>{money.format(totalRevenue)}</div><div style={{ font: `500 11px ${SANS}`, color: 'rgba(11,15,25,.5)' }}>total periode</div></div>
          </div>
          <svg viewBox="0 0 700 230" width="100%" height="210" style={{ display: 'block', overflow: 'visible' }}>
            <defs><linearGradient id="omzetFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b62fe" stopOpacity=".22" /><stop offset="100%" stopColor="#0b62fe" stopOpacity="0" /></linearGradient></defs>
            {[12, 62, 112, 162, 188].map(gy => <line key={gy} x1="0" y1={gy} x2="700" y2={gy} stroke="#ececed" strokeWidth="1" />)}
            {chart.area && <path d={chart.area} fill="url(#omzetFill)" />}
            {chart.line && <path d={chart.line} fill="none" stroke="#0b62fe" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
            {chart.pts.map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r="3.5" fill="#fff" stroke="#0b62fe" strokeWidth="2.2" />
                {(period.days <= 7 || i % 5 === 0) && <text x={pt.x} y={216} textAnchor="middle" style={{ font: `500 10px ${MONO}`, fill: '#8a8a94' }}>{shortLabel(axis[i])}</text>}
              </g>
            ))}
          </svg>
        </div>

        <div style={card}>
          <div style={{ font: `700 14px ${SANS}`, marginBottom: 2 }}>Metode bayar</div>
          <div style={{ font: `500 11.5px ${SANS}`, color: 'rgba(11,15,25,.5)', marginBottom: 14 }}>Komposisi seluruh cabang</div>
          {payMix.length === 0 && !loading && <div style={{ font: `500 12px ${SANS}`, color: 'rgba(11,15,25,.45)', padding: '8px 0' }}>Belum ada pembayaran pada periode ini.</div>}
          {payMix.map((m, i) => (
            <div key={m.name} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ font: `600 12.5px ${SANS}` }}>{m.name}</span>
                <span style={{ font: `600 12.5px ${MONO}`, color: 'rgba(11,15,25,.6)' }}>{money.format(m.amount)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: '#f2f2f7', overflow: 'hidden' }}>
                <div style={{ height: 8, borderRadius: 5, width: `${Math.round((m.amount / payMax) * 100)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
              </div>
            </div>
          ))}
          {avgPerTrx > 0 && <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid #ececed', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ font: `600 12.5px ${SANS}`, color: 'rgba(11,15,25,.6)' }}>Rata-rata / transaksi</span>
            <span style={{ font: `700 14px ${MONO}` }}>{money.format(Math.round(avgPerTrx))}</span>
          </div>}
        </div>
      </div>

      {/* Branch performance table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px' }}>
          <div><div style={{ font: `700 14px ${SANS}` }}>Kinerja cabang</div><div style={{ font: `500 11.5px ${SANS}`, color: 'rgba(11,15,25,.5)' }}>Diurutkan dari omzet tertinggi</div></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f7f7fa' }}>
              {['Cabang', 'Omzet', 'Transaksi', 'Tren', 'Status'].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 || i === 3 ? 'left' : 'right', padding: i === 0 || i === 4 ? '9px 16px' : '9px 12px', font: `600 10.5px ${SANS}`, letterSpacing: '.05em', textTransform: 'uppercase', color: 'rgba(11,15,25,.5)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...results].sort((a, b) => (b.ok ? b.data.totalRevenue : -1) - (a.ok ? a.data.totalRevenue : -1)).map(r => {
                const rev = r.ok ? r.data.totalRevenue : 0;
                const trx = r.ok ? r.data.transactionCount : 0;
                const trend = r.ok ? axis.map(day => r.data.days.find(d => d.date === day)?.netRevenue ?? 0) : [];
                const up = trend.length > 1 ? trend[trend.length - 1] >= trend[0] : true;
                return (
                  <tr key={r.branch.code} style={{ borderTop: '1px solid #f0f0f4' }}>
                    <td style={{ padding: '11px 16px' }}><div style={{ font: `600 13.5px ${SANS}` }}>{r.branch.name}</div><div style={{ font: `500 11px ${MONO}`, color: 'rgba(11,15,25,.45)', marginTop: 2 }}>{r.branch.code}</div></td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', font: `600 13.5px ${MONO}` }}>{r.ok ? money.format(rev) : '—'}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', font: `500 13px ${MONO}`, color: 'rgba(11,15,25,.65)' }}>{r.ok ? trx.toLocaleString('id-ID') : '—'}</td>
                    <td style={{ padding: '11px 12px' }}>{trend.some(v => v !== 0) ? <svg viewBox="0 0 120 30" width="120" height="30" style={{ display: 'block' }}><path d={spark(trend)} fill="none" stroke={up ? '#34c759' : '#ff3b30'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <span style={{ font: `500 11px ${SANS}`, color: 'rgba(11,15,25,.3)' }}>—</span>}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <span style={{ font: `600 11px ${SANS}`, borderRadius: 99, padding: '4px 9px', background: r.ok ? '#eafaef' : '#fff1f0', color: r.ok ? '#16743a' : '#c1271d' }}>{r.ok ? 'Online' : 'Terputus'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && !results.length && <div style={{ padding: 20, font: `500 12.5px ${SANS}`, color: 'rgba(11,15,25,.5)' }}>Memuat data cabang…</div>}
      </div>
    </div>
  );
}

function buildChart(values: number[]) {
  const pts: { x: number; y: number }[] = [];
  if (values.length === 0) return { pts, line: '', area: '' };
  const W = 700, H = 176;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i * W) / (values.length - 1));
  const y = (v: number) => H - ((v - min) / span) * H + 12;
  for (let i = 0; i < values.length; i++) pts.push({ x: +x(i).toFixed(1), y: +y(values[i]).toFixed(1) });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  return { pts, line, area: `${line} L${W} ${H + 12} L0 ${H + 12} Z` };
}

function spark(vals: number[]): string {
  if (vals.length === 0) return '';
  const max = Math.max(...vals), min = Math.min(...vals), span = max - min || 1;
  return vals.map((v, i) => `${i ? 'L' : 'M'}${((i * 118) / (vals.length - 1) + 1).toFixed(1)} ${(26 - ((v - min) / span) * 22).toFixed(1)}`).join(' ');
}

const card: CSSProperties = { background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(16,24,40,.06)', border: '1px solid #ececef' };
