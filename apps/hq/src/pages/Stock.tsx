import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Product } from '@web/types';
import { money, number } from '@web/lib/money';
import { listBranches } from '../lib/branches';
import { getFromAllBranches, okResults } from '../lib/aggregate';
import { branchRequest } from '../lib/hqApi';
import type { Branch, BranchResult } from '../types';

type Tab = 'branch' | 'cross' | 'low';

export function Stock() {
  const [branches] = useState(() => listBranches());
  const [tab, setTab] = useState<Tab>('branch');
  const [selected, setSelected] = useState<Branch | null>(branches[0] ?? null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [crossResults, setCrossResults] = useState<BranchResult<Product[]>[]>([]);
  const [lowResults, setLowResults] = useState<BranchResult<Product[]>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchBranch = async () => {
    if (!selected) return;
    setLoading(true); setError('');
    try { setProducts(await branchRequest<Product[]>(selected, `/products?search=${encodeURIComponent(query)}`)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Permintaan gagal.'); setProducts([]); }
    finally { setLoading(false); }
  };

  const searchCross = async () => {
    setLoading(true); setError('');
    setCrossResults(await getFromAllBranches<Product[]>(branches, `/products?search=${encodeURIComponent(query)}`));
    setLoading(false);
  };

  const loadLow = async () => {
    setLoading(true); setError('');
    setLowResults(await getFromAllBranches<Product[]>(branches, '/products?lowStock=1'));
    setLoading(false);
  };

  // Cross-branch view groups by product code: one row per product, one stock figure per branch.
  const okCross = okResults(crossResults);
  const crossRows = (() => {
    const map = new Map<string, { code: string; name: string; unit: string; stockByBranch: Record<string, number> }>();
    okCross.forEach(({ branch, data }) => data.forEach(p => {
      const row = map.get(p.code) ?? { code: p.code, name: p.name, unit: p.units[0]?.name ?? '', stockByBranch: {} };
      row.stockByBranch[branch.code] = p.stock;
      map.set(p.code, row);
    }));
    return Array.from(map.values());
  })();

  return <div className="page">
    <div className="page-heading"><div><h1>Stok Cabang</h1><p>Pantau persediaan tiap cabang dari pusat.</p></div></div>

    <div className="tabs">
      <button className={`tab-button ${tab === 'branch' ? 'active' : ''}`} onClick={() => setTab('branch')}>Per cabang</button>
      <button className={`tab-button ${tab === 'cross' ? 'active' : ''}`} onClick={() => setTab('cross')}>Cari lintas cabang</button>
      <button className={`tab-button ${tab === 'low' ? 'active' : ''}`} onClick={() => { setTab('low'); void loadLow(); }}>Stok minim</button>
    </div>

    {tab !== 'low' && <div className="table-tools" style={{ border: '0', padding: 0, marginBottom: 12 }}>
      {tab === 'branch' && <div className="branch-picker">{branches.map(b => <button key={b.code} className={selected?.code === b.code ? 'active' : ''} onClick={() => setSelected(b)}>{b.name}</button>)}</div>}
      <form className="search-box" onSubmit={e => { e.preventDefault(); void (tab === 'branch' ? searchBranch() : searchCross()); }}>
        <Search aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama / kode / barcode…" />
        <button className="button primary" type="submit" disabled={loading}>{loading ? 'Mencari…' : 'Cari'}</button>
      </form>
    </div>}
    {error && <div className="notice error" role="alert">{error}</div>}

    {tab === 'branch' && <div className="panel flush"><div className="table-wrap"><table>
      <thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th className="numeric">Stok</th><th className="numeric">Stok min</th><th className="numeric">Harga</th></tr></thead>
      <tbody>{products.map(p => <tr key={p.id}>
        <td className="mono">{p.code}</td><td>{p.name}</td><td>{p.category}</td>
        <td className={`numeric ${p.stock <= p.minStock ? 'danger-text' : ''}`}>{number.format(p.stock)}</td>
        <td className="numeric">{number.format(p.minStock)}</td>
        <td className="numeric">{money.format(p.units[0]?.price ?? 0)}</td>
      </tr>)}</tbody>
    </table></div>
    {!products.length && !loading && <div className="empty-state">Cari barang untuk melihat stok {selected?.name ?? ''}.</div>}</div>}

    {tab === 'cross' && <div className="panel flush"><div className="table-wrap"><table>
      <thead><tr><th>Kode</th><th>Nama</th>{branches.map(b => <th key={b.code} className="numeric">{b.name}</th>)}</tr></thead>
      <tbody>{crossRows.map(row => <tr key={row.code}>
        <td className="mono">{row.code}</td><td>{row.name}</td>
        {branches.map(b => <td key={b.code} className="numeric">{row.stockByBranch[b.code] !== undefined ? number.format(row.stockByBranch[b.code]) : '—'}</td>)}
      </tr>)}</tbody>
    </table></div>
    {crossResults.filter(r => !r.ok).map(r => <div className="notice warning" key={r.branch.code}>{r.branch.name}: {r.ok ? '' : r.error}</div>)}
    {!crossRows.length && !loading && <div className="empty-state">Cari barang untuk membandingkan stok antar cabang.</div>}</div>}

    {tab === 'low' && <>
      {lowResults.filter(r => !r.ok).map(r => <div className="notice warning" key={r.branch.code}>{r.branch.name}: {r.ok ? '' : r.error}</div>)}
      <div className="branch-grid">{okResults(lowResults).map(({ branch, data }) => <article className="branch-card" key={branch.code}>
        <header><h2>{branch.name}</h2><span className="branch-code">{data.length} barang</span></header>
        {data.length ? <div className="table-wrap"><table>
          <thead><tr><th>Barang</th><th className="numeric">Stok</th><th className="numeric">Min</th></tr></thead>
          <tbody>{data.map(p => <tr key={p.id}><td>{p.name}<small className="mono">{p.code}</small></td><td className="numeric danger-text">{number.format(p.stock)}</td><td className="numeric">{number.format(p.minStock)}</td></tr>)}</tbody>
        </table></div> : <span className="branch-sub">Tidak ada stok di bawah minimum.</span>}
      </article>)}</div>
    </>}
  </div>;
}
