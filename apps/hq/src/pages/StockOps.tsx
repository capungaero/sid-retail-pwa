import { useEffect, useState } from 'react';
import { ArrowRight, Search, Trash2 } from 'lucide-react';
import type { Product, StockMovement } from '@web/types';
import { number } from '@web/lib/money';
import { listBranches } from '../lib/branches';
import { fetchAllBranches, okResults } from '../lib/aggregate';
import { branchRequest } from '../lib/hqApi';
import { executeTransfer, findUnreceived, loadPendingTransfers, pendingFromOutDoc, retryPendingTransfer } from '../lib/transfers';
import type { Branch, PendingTransfer, TransferDoc, TransferLine } from '../types';

type Tab = 'adjust' | 'transfer' | 'history';

function ProductSearch({ branch, onPick }: { branch: Branch | null; onPick: (product: Product) => void }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Product[]>([]);
  const [error, setError] = useState('');
  return <div className="search-box" style={{ position: 'relative' }}>
    <Search aria-hidden="true" />
    <input value={query} placeholder={branch ? `Cari barang di ${branch.name}…` : 'Pilih cabang dulu'} disabled={!branch}
      onChange={e => setQuery(e.target.value)}
      onKeyDown={async e => {
        if (e.key !== 'Enter' || !branch) return;
        e.preventDefault();
        try { setError(''); setOptions(await branchRequest<Product[]>(branch, `/products?search=${encodeURIComponent(query)}`)); }
        catch (err) { setError(err instanceof Error ? err.message : 'Pencarian gagal.'); }
      }} />
    {error && <span className="branch-error">{error}</span>}
    {options.length > 0 && <div className="search-results inline">
      {options.slice(0, 8).map(p => <button key={p.id} type="button" onClick={() => { onPick(p); setOptions([]); setQuery(''); }}>
        <div><strong>{p.name}</strong><span className="mono">{p.code}</span></div>
        <div><span>Stok: {number.format(p.stock)}</span></div>
      </button>)}
    </div>}
  </div>;
}

export function StockOps() {
  const [branches] = useState(() => listBranches());
  const [tab, setTab] = useState<Tab>('adjust');

  // --- Penyesuaian ---
  const [adjBranch, setAdjBranch] = useState<Branch | null>(branches[0] ?? null);
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjMessage, setAdjMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  // --- Transfer ---
  const [source, setSource] = useState<Branch | null>(branches[0] ?? null);
  const [dest, setDest] = useState<Branch | null>(branches[1] ?? null);
  const [lines, setLines] = useState<(TransferLine & { available: number })[]>([]);
  const [transferNote, setTransferNote] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState<{ kind: 'info' | 'warning' | 'error'; text: string } | null>(null);
  const [pending, setPending] = useState<PendingTransfer[]>(() => loadPendingTransfers());
  const [retryBusy, setRetryBusy] = useState<string | null>(null);

  // --- Riwayat & rekonsiliasi ---
  const [history, setHistory] = useState<{ branch: Branch; docs: TransferDoc[] }[]>([]);
  const [historyErrors, setHistoryErrors] = useState<{ branch: Branch; error: string }[]>([]);
  const loadHistory = async () => {
    const results = await fetchAllBranches(branches, b => branchRequest<TransferDoc[]>(b, '/stock-transfers'));
    setHistory(okResults(results).map(({ branch, data }) => ({ branch, docs: data })));
    setHistoryErrors(results.flatMap(r => r.ok ? [] : [{ branch: r.branch, error: r.error }]));
  };
  useEffect(() => { if (tab === 'history') void loadHistory(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreceived = findUnreceived(history);

  const retry = async (entry: PendingTransfer) => {
    setRetryBusy(entry.reference);
    try {
      await retryPendingTransfer(entry, branches);
      setPending(loadPendingTransfers());
      setTransferMessage({ kind: 'info', text: `Transfer ${entry.reference} berhasil diterima di ${entry.destName}.` });
      if (tab === 'history') void loadHistory();
    } catch (err) {
      setTransferMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Kirim ulang gagal.' });
    } finally { setRetryBusy(null); }
  };

  return <div className="page">
    <div className="page-heading"><div><h1>Operasi Stok</h1><p>Penyesuaian stok dan transfer barang antar cabang dari pusat.</p></div></div>

    {pending.length > 0 && <div className="pending-banner" role="alert">
      <span><strong>{pending.length} transfer belum diterima di cabang tujuan.</strong> Barang sudah tercatat keluar dari cabang asal.</span>
      <div className="row-actions">{pending.map(p => <button key={p.reference} className="button secondary" disabled={retryBusy === p.reference} onClick={() => void retry(p)}>
        {retryBusy === p.reference ? 'Mengirim…' : `Kirim ulang ${p.reference} → ${p.destName}`}
      </button>)}</div>
    </div>}

    <div className="tabs">
      <button className={`tab-button ${tab === 'adjust' ? 'active' : ''}`} onClick={() => setTab('adjust')}>Penyesuaian (+/−)</button>
      <button className={`tab-button ${tab === 'transfer' ? 'active' : ''}`} onClick={() => setTab('transfer')}>Transfer antar cabang</button>
      <button className={`tab-button ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Riwayat transfer</button>
    </div>

    {tab === 'adjust' && <div className="panel">
      <div className="panel-heading"><h2>Penyesuaian stok</h2><p>Menulis dokumen koreksi + kartu stok di cabang terpilih.</p></div>
      <div className="branch-picker">{branches.map(b => <button key={b.code} className={adjBranch?.code === b.code ? 'active' : ''} onClick={() => { setAdjBranch(b); setAdjProduct(null); }}>{b.name}</button>)}</div>
      <ProductSearch branch={adjBranch} onPick={p => setAdjProduct(p)} />
      {adjProduct && <div className="notice info">Barang: <strong>{adjProduct.name}</strong> ({adjProduct.code}) — stok saat ini {number.format(adjProduct.stock)}</div>}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <label>Perubahan qty (± angka, mis. -5 atau 10)<input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} /></label>
        <label>Alasan<input value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Stok opname / barang rusak / dll" /></label>
        <label className="span-2">Catatan (opsional)<input value={adjNote} onChange={e => setAdjNote(e.target.value)} /></label>
      </div>
      {adjMessage && <div className={`notice ${adjMessage.kind === 'error' ? 'error' : 'info'}`} role="alert">{adjMessage.text}</div>}
      <div className="modal-actions">
        <button className="button primary" disabled={adjBusy || !adjBranch || !adjProduct || !adjQty || !adjReason} onClick={async () => {
          if (!adjBranch || !adjProduct) return;
          const qty = Number(adjQty);
          if (!qty) { setAdjMessage({ kind: 'error', text: 'Qty tidak boleh 0.' }); return; }
          setAdjBusy(true); setAdjMessage(null);
          try {
            const movement = await branchRequest<StockMovement>(adjBranch, '/stock-adjustments', {
              method: 'POST',
              headers: { 'Idempotency-Key': crypto.randomUUID() },
              body: JSON.stringify({ productId: adjProduct.id, qty, reason: adjReason, note: adjNote || undefined })
            });
            setAdjMessage({ kind: 'info', text: `Penyesuaian tersimpan (${movement.reference}). Stok ${adjProduct.name} di ${adjBranch.name} sekarang ${number.format(adjProduct.stock + qty)}.` });
            setAdjProduct(null); setAdjQty(''); setAdjReason(''); setAdjNote('');
          } catch (err) {
            setAdjMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Penyesuaian gagal.' });
          } finally { setAdjBusy(false); }
        }}>{adjBusy ? 'Menyimpan…' : 'Simpan penyesuaian'}</button>
      </div>
    </div>}

    {tab === 'transfer' && <div className="panel">
      <div className="panel-heading"><h2>Transfer antar cabang</h2><p>Stok keluar di cabang asal, masuk di cabang tujuan, dengan satu nomor referensi.</p></div>
      <div className="form-grid">
        <label>Cabang asal<select value={source?.code ?? ''} onChange={e => { setSource(branches.find(b => b.code === e.target.value) ?? null); setLines([]); }}>
          {branches.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select></label>
        <label>Cabang tujuan<select value={dest?.code ?? ''} onChange={e => setDest(branches.find(b => b.code === e.target.value) ?? null)}>
          <option value="">— pilih —</option>
          {branches.filter(b => b.code !== source?.code).map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select></label>
      </div>
      <div style={{ marginTop: 12 }}>
        <ProductSearch branch={source} onPick={p => {
          setLines(prev => prev.some(l => l.productId === p.id) ? prev : [...prev, { productId: p.id, productName: p.name, unit: p.units[0]?.name ?? 'PCS', qty: 1, available: p.stock }]);
        }} />
      </div>
      {lines.length > 0 && <div className="table-wrap" style={{ marginTop: 12 }}><table>
        <thead><tr><th>Barang</th><th className="numeric">Stok asal</th><th className="numeric">Qty transfer</th><th /></tr></thead>
        <tbody>{lines.map(line => <tr key={line.productId}>
          <td>{line.productName}<small className="mono">{line.productId}</small></td>
          <td className="numeric">{number.format(line.available)}</td>
          <td className="numeric"><input type="number" min={0.01} step="any" value={line.qty} style={{ width: 90, height: 38, textAlign: 'right' }}
            onChange={e => setLines(prev => prev.map(l => l.productId === line.productId ? { ...l, qty: Number(e.target.value) } : l))} /></td>
          <td><button className="icon-button danger" aria-label={`Hapus ${line.productName}`} onClick={() => setLines(prev => prev.filter(l => l.productId !== line.productId))}><Trash2 /></button></td>
        </tr>)}</tbody>
      </table></div>}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <label className="span-2">Catatan (opsional)<input value={transferNote} onChange={e => setTransferNote(e.target.value)} /></label>
      </div>
      {transferMessage && <div className={`notice ${transferMessage.kind}`} role="alert">{transferMessage.text}</div>}
      <div className="modal-actions">
        <button className="button primary" disabled={transferBusy || !source || !dest || !lines.length || lines.some(l => !l.qty || l.qty <= 0 || l.qty > l.available)} onClick={async () => {
          if (!source || !dest) return;
          setTransferBusy(true); setTransferMessage(null);
          const outcome = await executeTransfer(source, dest, lines.map(({ available: _a, ...line }) => line), transferNote || undefined)
            .catch(err => ({ status: 'out-failed' as const, error: err instanceof Error ? err.message : 'Transfer gagal.' }));
          if (outcome.status === 'completed') {
            setTransferMessage({ kind: 'info', text: `Transfer ${outcome.reference} selesai: stok keluar di ${source.name}, masuk di ${dest.name}.` });
            setLines([]); setTransferNote('');
          } else if (outcome.status === 'pending-in') {
            setPending(loadPendingTransfers());
            setTransferMessage({ kind: 'warning', text: `Transfer ${outcome.reference} tercatat KELUAR di ${source.name}, tapi BELUM masuk di ${dest.name}: ${outcome.error}. Gunakan tombol kirim ulang di atas.` });
            setLines([]); setTransferNote('');
          } else {
            setTransferMessage({ kind: 'error', text: outcome.error });
          }
          setTransferBusy(false);
        }}><ArrowRight aria-hidden="true" />{transferBusy ? 'Memproses…' : 'Proses transfer'}</button>
      </div>
      {lines.some(l => l.qty > l.available) && <p className="field-error">Qty transfer melebihi stok cabang asal.</p>}
    </div>}

    {tab === 'history' && <>
      {historyErrors.map(({ branch, error }) => <div className="notice warning" key={branch.code}>{branch.name}: {error}</div>)}
      {unreceived.length > 0 && <div className="pending-banner" role="alert">
        <span><strong>{unreceived.length} transfer keluar belum punya dokumen terima di cabang mana pun.</strong></span>
        <div className="row-actions">{unreceived.map(({ doc, sourceBranch }) => <button key={doc.reference} className="button secondary" disabled={retryBusy === doc.reference}
          onClick={() => void retry(pendingFromOutDoc(doc, sourceBranch))}>
          {retryBusy === doc.reference ? 'Mengirim…' : `Kirim ulang ${doc.reference} → ${doc.counterpartBranchName}`}
        </button>)}</div>
      </div>}
      <div className="branch-grid">{history.map(({ branch, docs }) => <article className="branch-card" key={branch.code}>
        <header><h2>{branch.name}</h2><span className="branch-code">{docs.length} dokumen</span></header>
        {docs.length ? <div className="table-wrap"><table>
          <thead><tr><th>Referensi</th><th>Arah</th><th>Lawan</th><th>Status</th><th className="numeric">Baris</th></tr></thead>
          <tbody>{docs.map(d => <tr key={d.id}>
            <td className="mono">{d.reference}</td>
            <td><span className={`status ${d.direction === 'out' ? 'danger' : 'success'}`}>{d.direction === 'out' ? 'Keluar' : 'Masuk'}</span></td>
            <td>{d.counterpartBranchName}</td>
            <td><span className={`status ${d.status === 'received' ? 'success' : 'pending'}`}>{d.status === 'received' ? 'Diterima' : 'Terkirim'}</span></td>
            <td className="numeric">{d.lines.length}</td>
          </tr>)}</tbody>
        </table></div> : <span className="branch-sub">Belum ada transfer.</span>}
      </article>)}</div>
    </>}
  </div>;
}
