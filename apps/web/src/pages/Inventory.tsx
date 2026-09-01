import { useEffect, useMemo, useRef, useState } from 'react';
import { CirclePlus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { adjustStock, listProducts, listPurchaseOrders, listStockMovements, listSuppliers, receiveGoods, savePurchaseOrder, saveReturn } from '../lib/api';
import { money, number } from '../lib/money';
import type { Product, PurchaseLine, PurchaseOrder, ReturnDoc, ReturnKind, ReturnLine, StockMovement, StockMovementType, Supplier } from '../types';

const TABS = [
  { key: 'purchase', label: 'Pembelian & PO' },
  { key: 'receipt', label: 'Penerimaan barang' },
  { key: 'return', label: 'Retur' },
  { key: 'stock', label: 'Koreksi & mutasi stok' }
] as const;
type TabKey = typeof TABS[number]['key'];

const MOVEMENT_LABEL: Record<StockMovementType, string> = { 'purchase-receipt': 'Penerimaan pembelian', 'purchase-return': 'Retur pembelian', 'sales-return': 'Retur penjualan', adjustment: 'Koreksi stok' };
const REASONS = [
  { value: 'Barang rusak / kadaluarsa', label: 'Barang rusak / kadaluarsa' },
  { value: 'Barang hilang', label: 'Barang hilang' },
  { value: 'Ditemukan saat stok opname', label: 'Ditemukan saat stok opname' },
  { value: 'Koreksi hasil stok opname', label: 'Koreksi hasil stok opname' },
  { value: 'Lainnya', label: 'Lainnya' }
];

export function Inventory() {
  const [tab, setTab] = useState<TabKey>('purchase');
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Persediaan</p><h1>Persediaan</h1><p>Kelola arus barang dan kontrol stok.</p></div></div>
    <div className="tabs" role="tablist" aria-label="Sub modul persediaan">{TABS.map(t => <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-button ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
    {tab === 'purchase' && <PurchaseTab />}
    {tab === 'receipt' && <ReceiptTab />}
    {tab === 'return' && <ReturnTab />}
    {tab === 'stock' && <StockTab />}
  </div>;
}

function ProductPicker({ query, setQuery, results, onPick }: { query: string; setQuery: (v: string) => void; results: Product[]; onPick: (p: Product) => void }) {
  return <div className="search-box"><Search aria-hidden="true" /><span className="sr-only">Cari barang</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari barang…" />
    {!!results.length && <div className="search-results inline" role="listbox">{results.slice(0, 5).map(p => <button key={p.id} type="button" role="option" aria-selected="false" onClick={() => onPick(p)}><span><strong>{p.name}</strong><span>{p.code} · stok {number.format(p.stock)}</span></span></button>)}</div>}
  </div>;
}

function PurchaseTab() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]); const [suppliers, setSuppliers] = useState<Supplier[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editing, setEditing] = useState(false);
  const load = () => { setLoading(true); setError(''); Promise.all([listPurchaseOrders(), listSuppliers()]).then(([p, s]) => { setPos(p); setSuppliers(s); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? id;
  return <>
    <section className="panel flush">
      <div className="table-tools"><h2>Daftar pembelian & PO</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button><button className="button primary" onClick={() => setEditing(true)}><CirclePlus /> PO baru</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data pembelian…</div> : !pos.length ? <div className="empty-state">Belum ada PO atau pembelian.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Pemasok</th><th className="numeric">Baris</th><th className="numeric">Total</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>{pos.map(po => <tr key={po.id}><td className="mono">{po.reference}</td><td>{supplierName(po.supplierId)}</td><td className="numeric mono">{po.lines.length}</td><td className="numeric mono">{money.format(po.lines.reduce((sum, l) => sum + l.qty * l.cost, 0))}</td><td><span className={`status ${po.status === 'received' ? 'success' : ''}`}>{po.status === 'draft' ? 'Draft' : po.status === 'open' ? 'PO terbuka' : 'Diterima'}</span></td><td>{new Date(po.createdAt).toLocaleDateString('id-ID')}</td></tr>)}</tbody></table></div>}
    </section>
    {editing && <PurchaseOrderModal suppliers={suppliers} onClose={() => setEditing(false)} onSaved={po => { setPos(current => [po, ...current]); setEditing(false); }} />}
  </>;
}

function PurchaseOrderModal({ suppliers, onClose, onSaved }: { suppliers: Supplier[]; onClose: () => void; onSaved: (po: PurchaseOrder) => void }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? ''); const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Product[]>([]); const [picked, setPicked] = useState<Product | null>(null); const [qty, setQty] = useState(1); const [cost, setCost] = useState(0);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const modalRef = useRef<HTMLElement>(null);
  // Stable across retries of one submit attempt, regenerated only after a successful save — see
  // the same pattern on ReturnTab's docIdRef / StockTab's idempotencyKeyRef.
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  useEffect(() => { const timer = setTimeout(() => { if (query && !picked) listProducts(query).then(setResults).catch(() => setResults([])); else setResults([]); }, 150); return () => clearTimeout(timer); }, [query, picked]);
  useEffect(() => { const previous = document.activeElement as HTMLElement; const box = modalRef.current; const focusable = () => Array.from(box?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []); (box?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0])?.focus(); const keys = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose(); return; } if (event.key !== 'Tab') return; const all = focusable(); if (!all.length) return; const first = all[0], last = all[all.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }; box?.addEventListener('keydown', keys); return () => { box?.removeEventListener('keydown', keys); previous?.focus(); }; }, [onClose]);
  function pick(product: Product) { setPicked(product); setQuery(product.name); setResults([]); setCost(product.cost); }
  function addLine() {
    if (!picked) return setError('Pilih barang terlebih dahulu.');
    if (qty <= 0) return setError('Jumlah harus lebih dari 0.');
    setLines(current => [...current, { productId: picked.id, productName: picked.name, unit: picked.units[0].name, qty, cost, receivedQty: 0 }]);
    setPicked(null); setQuery(''); setQty(1); setCost(0); setError('');
  }
  async function submit(status: 'draft' | 'open') {
    if (!supplierId) return setError('Pilih pemasok.');
    if (!lines.length) return setError('Tambahkan minimal satu barang.');
    setSaving(true); setError('');
    try {
      // No client-generated id: this is always a brand-new PO here (the modal has no edit-existing
      // flow), so the server assigns the real legacy-consistent code on save — see savePurchaseOrder.
      const po: PurchaseOrder = { id: '', reference: `PO-${Date.now().toString().slice(-6)}`, supplierId, status, lines, createdAt: new Date().toISOString() };
      const saved = await savePurchaseOrder(po, idempotencyKeyRef.current);
      idempotencyKeyRef.current = crypto.randomUUID();
      onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan PO'); setSaving(false); }
  }
  const total = lines.reduce((sum, l) => sum + l.qty * l.cost, 0);
  return <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal wide" role="dialog" aria-modal="true" aria-labelledby="po-title">
    <div className="modal-heading"><div><p className="eyebrow">Pembelian</p><h2 id="po-title">Buat PO / pembelian baru</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>
    <label>Pemasok<select data-autofocus="true" value={supplierId} onChange={e => setSupplierId(e.target.value)}>{!suppliers.length && <option value="">Belum ada pemasok</option>}{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <div className="line-add-row">
      <ProductPicker query={query} setQuery={value => { setQuery(value); setPicked(null); }} results={results} onPick={pick} />
      <input type="number" min="1" step="1" value={qty || ''} onChange={e => setQty(Number(e.target.value))} aria-label="Jumlah" />
      <input type="number" min="0" value={cost || ''} onChange={e => setCost(Number(e.target.value))} aria-label="Harga beli" onKeyDown={e => e.key === 'Enter' && addLine()} />
      <button type="button" className="button secondary" onClick={addLine}><CirclePlus /> Tambah</button>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>Barang</th><th>Satuan</th><th className="numeric">Qty</th><th className="numeric">Harga</th><th className="numeric">Subtotal</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{lines.map((l, i) => <tr key={`${l.productId}-${i}`}><td>{l.productName}</td><td>{l.unit}</td><td className="numeric mono">{l.qty}</td><td className="numeric mono">{money.format(l.cost)}</td><td className="numeric mono">{money.format(l.qty * l.cost)}</td><td><button type="button" className="icon-button danger" onClick={() => setLines(c => c.filter((_, x) => x !== i))} aria-label={`Hapus ${l.productName}`}><Trash2 /></button></td></tr>)}{!lines.length && <tr><td colSpan={6} className="empty-compact">Belum ada barang ditambahkan.</td></tr>}</tbody></table></div>
    <div className="payment-total"><span>Total pembelian</span><strong>{money.format(total)}</strong></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button type="button" className="button secondary" onClick={() => submit('draft')} disabled={saving}>Simpan draft</button><button type="button" className="button primary" onClick={() => submit('open')} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan & buka PO'}</button></div>
  </section></div>;
}

function ReceiptTab() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]); const [suppliers, setSuppliers] = useState<Supplier[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(''); const [receiveQty, setReceiveQty] = useState<Record<string, number>>({}); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([listPurchaseOrders(), listSuppliers()]).then(([p, s]) => { setPos(p); setSuppliers(s); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const openPos = useMemo(() => pos.filter(p => p.status === 'open'), [pos]);
  const selected = openPos.find(p => p.id === selectedId) ?? null;
  // Regenerated whenever a different PO is selected (so switching targets never reuses a stale
  // key) and after a successful save — same pattern as the other idempotency refs in this file.
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  useEffect(() => { if (!selected) return; const next: Record<string, number> = {}; selected.lines.forEach(l => { next[l.productId] = Math.max(0, l.qty - l.receivedQty); }); setReceiveQty(next); idempotencyKeyRef.current = crypto.randomUUID(); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function submit() {
    if (!selected) return;
    const receiptLines = Object.entries(receiveQty).filter(([, qty]) => qty > 0).map(([productId, qty]) => ({ productId, qty }));
    if (!receiptLines.length) return setError('Isi jumlah barang yang diterima.');
    setSaving(true); setError('');
    try {
      const updated = await receiveGoods(selected.id, receiptLines, idempotencyKeyRef.current);
      idempotencyKeyRef.current = crypto.randomUUID();
      setPos(current => current.map(p => p.id === updated.id ? updated : p));
      setNotice(`Penerimaan untuk ${updated.reference} tersimpan (${updated.status === 'received' ? 'PO selesai diterima' : 'PO masih terbuka, sisa barang menyusul'}).`);
      setSelectedId('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan penerimaan'); }
    finally { setSaving(false); }
  }
  return <>
    {notice && <div className="notice info" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Tutup pesan"><X /></button></div>}
    <section className="panel flush">
      <div className="table-tools"><h2>PO menunggu penerimaan</h2><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data…</div> : !openPos.length ? <div className="empty-state">Tidak ada PO berstatus terbuka.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Pemasok</th><th className="numeric">Baris</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{openPos.map(po => <tr key={po.id}><td className="mono">{po.reference}</td><td>{suppliers.find(s => s.id === po.supplierId)?.name ?? po.supplierId}</td><td className="numeric mono">{po.lines.length}</td><td><span className="status">PO terbuka</span></td><td><button className="button secondary" onClick={() => setSelectedId(po.id)}>Terima</button></td></tr>)}</tbody></table></div>}
    </section>
    {selected && <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Penerimaan barang</p><h2>{selected.reference}</h2></div></div>
      <div className="table-wrap"><table><thead><tr><th>Barang</th><th className="numeric">Dipesan</th><th className="numeric">Sudah diterima</th><th className="numeric">Terima sekarang</th></tr></thead><tbody>{selected.lines.map(l => <tr key={l.productId}><td>{l.productName}<small>{l.unit}</small></td><td className="numeric mono">{l.qty}</td><td className="numeric mono">{l.receivedQty}</td><td className="numeric"><input type="number" min="0" max={l.qty - l.receivedQty} value={receiveQty[l.productId] || ''} onChange={e => setReceiveQty(c => ({ ...c, [l.productId]: Math.max(0, Math.min(l.qty - l.receivedQty, Number(e.target.value))) }))} aria-label={`Terima ${l.productName}`} /></td></tr>)}</tbody></table></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="modal-actions"><button className="button secondary" onClick={() => setSelectedId('')} disabled={saving}>Batal</button><button className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan penerimaan'}</button></div>
    </section>}
  </>;
}

function ReturnTab() {
  const [kind, setKind] = useState<ReturnKind>('purchase'); const [suppliers, setSuppliers] = useState<Supplier[]>([]); const [supplierId, setSupplierId] = useState(''); const [refLabel, setRefLabel] = useState(''); const [reason, setReason] = useState('');
  const [lines, setLines] = useState<ReturnLine[]>([]); const [query, setQuery] = useState(''); const [results, setResults] = useState<Product[]>([]); const [picked, setPicked] = useState<Product | null>(null); const [qty, setQty] = useState(1); const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [history, setHistory] = useState<ReturnDoc[]>([]);
  // doc.id doubles as the Idempotency-Key: stable across retries of one submit attempt (a failed
  // submit keeps the same id so a retry can't create a duplicate return), regenerated only after
  // a successful save so the next, independent return gets its own id.
  const docIdRef = useRef(crypto.randomUUID());
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => {}); }, []);
  useEffect(() => { const timer = setTimeout(() => { if (query && !picked) listProducts(query).then(setResults).catch(() => setResults([])); else setResults([]); }, 150); return () => clearTimeout(timer); }, [query, picked]);
  function pick(product: Product) { setPicked(product); setQuery(product.name); setResults([]); setPrice(product.units[0].price); }
  function addLine() {
    if (!picked) return setError('Pilih barang terlebih dahulu.');
    if (qty <= 0) return setError('Jumlah harus lebih dari 0.');
    setLines(current => [...current, { productId: picked.id, productName: picked.name, unit: picked.units[0].name, qty, price }]);
    setPicked(null); setQuery(''); setQty(1); setPrice(0); setError('');
  }
  async function submit() {
    if (kind === 'purchase' && !supplierId) return setError('Pilih pemasok.');
    if (kind === 'sales' && !refLabel.trim()) return setError('Isi referensi transaksi penjualan.');
    if (!lines.length) return setError('Tambahkan minimal satu barang.');
    setSaving(true); setError('');
    try {
      const doc: ReturnDoc = { id: docIdRef.current, reference: `RET-${Date.now().toString().slice(-6)}`, kind, refLabel: kind === 'purchase' ? (suppliers.find(s => s.id === supplierId)?.name ?? supplierId) : refLabel.trim(), lines, createdAt: new Date().toISOString(), reason };
      const saved = await saveReturn(doc);
      docIdRef.current = crypto.randomUUID();
      setHistory(current => [saved, ...current]); setLines([]); setRefLabel(''); setReason(''); setSupplierId('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan retur'); }
    finally { setSaving(false); }
  }
  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  return <>
    <section className="panel">
      <div className="tabs inner" role="tablist" aria-label="Jenis retur">
        <button type="button" role="tab" aria-selected={kind === 'purchase'} className={`tab-button ${kind === 'purchase' ? 'active' : ''}`} onClick={() => setKind('purchase')}>Retur pembelian (ke pemasok)</button>
        <button type="button" role="tab" aria-selected={kind === 'sales'} className={`tab-button ${kind === 'sales' ? 'active' : ''}`} onClick={() => setKind('sales')}>Retur penjualan (dari pelanggan)</button>
      </div>
      {kind === 'purchase'
        ? <label>Pemasok<select value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Pilih pemasok…</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        : <label>Referensi transaksi penjualan<input value={refLabel} onChange={e => setRefLabel(e.target.value)} placeholder="No. struk atau nama pelanggan" /></label>}
      <label>Alasan retur<input value={reason} onChange={e => setReason(e.target.value)} placeholder="Contoh: barang rusak, salah kirim" /></label>
      <div className="line-add-row">
        <ProductPicker query={query} setQuery={value => { setQuery(value); setPicked(null); }} results={results} onPick={pick} />
        <input type="number" min="1" step="1" value={qty || ''} onChange={e => setQty(Number(e.target.value))} aria-label="Jumlah" />
        <input type="number" min="0" value={price || ''} onChange={e => setPrice(Number(e.target.value))} aria-label="Harga" onKeyDown={e => e.key === 'Enter' && addLine()} />
        <button type="button" className="button secondary" onClick={addLine}><CirclePlus /> Tambah</button>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="table-wrap"><table><thead><tr><th>Barang</th><th>Satuan</th><th className="numeric">Qty</th><th className="numeric">Harga</th><th className="numeric">Subtotal</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{lines.map((l, i) => <tr key={`${l.productId}-${i}`}><td>{l.productName}</td><td>{l.unit}</td><td className="numeric mono">{l.qty}</td><td className="numeric mono">{money.format(l.price)}</td><td className="numeric mono">{money.format(l.qty * l.price)}</td><td><button type="button" className="icon-button danger" onClick={() => setLines(c => c.filter((_, x) => x !== i))} aria-label={`Hapus ${l.productName}`}><Trash2 /></button></td></tr>)}{!lines.length && <tr><td colSpan={6} className="empty-compact">Belum ada barang ditambahkan.</td></tr>}</tbody></table></div>
      <div className="payment-total"><span>Total retur</span><strong>{money.format(total)}</strong></div>
      <div className="modal-actions"><button className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan retur'}</button></div>
    </section>
    <section className="panel flush"><div className="table-tools"><h2>Retur tersimpan sesi ini</h2></div>{!history.length ? <div className="empty-state">Belum ada retur pada sesi ini.</div> : <div className="table-wrap"><table><thead><tr><th>Referensi</th><th>Jenis</th><th>Terhadap</th><th className="numeric">Baris</th><th>Waktu</th></tr></thead><tbody>{history.map(h => <tr key={h.id}><td className="mono">{h.reference}</td><td>{h.kind === 'purchase' ? 'Pembelian' : 'Penjualan'}</td><td>{h.refLabel}</td><td className="numeric mono">{h.lines.length}</td><td>{new Date(h.createdAt).toLocaleString('id-ID')}</td></tr>)}</tbody></table></div>}</section>
  </>;
}

function StockTab() {
  const [products, setProducts] = useState<Product[]>([]); const [movements, setMovements] = useState<StockMovement[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [filterProduct, setFilterProduct] = useState(''); const [query, setQuery] = useState(''); const [results, setResults] = useState<Product[]>([]); const [picked, setPicked] = useState<Product | null>(null);
  const [delta, setDelta] = useState(0); const [reason, setReason] = useState(REASONS[0].value); const [note, setNote] = useState(''); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState('');
  // Stable across retries of one submit attempt, regenerated only after a successful save — see
  // the same pattern on ReturnTab's docIdRef.
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const load = () => { setLoading(true); setError(''); Promise.all([listProducts(), listStockMovements()]).then(([p, m]) => { setProducts(p); setMovements(m); }).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat data')).finally(() => setLoading(false)); };
  useEffect(load, []);
  useEffect(() => { const timer = setTimeout(() => { if (query && !picked) listProducts(query).then(setResults).catch(() => setResults([])); else setResults([]); }, 150); return () => clearTimeout(timer); }, [query, picked]);
  function pick(product: Product) { setPicked(product); setQuery(product.name); setResults([]); }
  async function submit() {
    if (!picked) return setError('Pilih barang terlebih dahulu.');
    if (!delta) return setError('Jumlah koreksi tidak boleh nol.');
    setSaving(true); setError('');
    try {
      const movement = await adjustStock({ productId: picked.id, qty: delta, reason, note: note.trim() || undefined }, idempotencyKeyRef.current);
      idempotencyKeyRef.current = crypto.randomUUID();
      setMovements(current => [movement, ...current]);
      setProducts(current => current.map(p => p.id === picked.id ? { ...p, stock: p.stock + delta } : p));
      setNotice(`Stok ${picked.name} disesuaikan sebanyak ${delta > 0 ? '+' : ''}${delta}.`);
      setPicked(null); setQuery(''); setDelta(0); setNote('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan koreksi stok'); }
    finally { setSaving(false); }
  }
  const filtered = filterProduct ? movements.filter(m => m.productId === filterProduct) : movements;
  return <>
    {notice && <div className="notice info" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Tutup pesan"><X /></button></div>}
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Koreksi stok</p><h2>Sesuaikan stok barang</h2></div></div>
      <div className="form-grid">
        <label className="span-2">Barang<ProductPicker query={query} setQuery={value => { setQuery(value); setPicked(null); }} results={results} onPick={pick} /></label>
        <label>Jumlah koreksi (+/-)<input type="number" value={delta || ''} onChange={e => setDelta(Number(e.target.value))} placeholder="Contoh: -2 atau 5" /></label>
        <label>Alasan<select value={reason} onChange={e => setReason(e.target.value)}>{REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        <label className="span-2">Catatan (opsional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Detail tambahan" /></label>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="modal-actions"><button className="button primary" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan koreksi'}</button></div>
    </section>
    <section className="panel flush">
      <div className="table-tools"><h2>Riwayat mutasi stok</h2><select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} aria-label="Filter barang"><option value="">Semua barang</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {loading ? <div className="empty-state">Memuat data…</div> : !filtered.length ? <div className="empty-state">Belum ada mutasi stok.</div> : <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Barang</th><th>Jenis</th><th className="numeric">Jumlah</th><th>Referensi</th><th>Catatan</th></tr></thead><tbody>{filtered.map(m => <tr key={m.id}><td>{new Date(m.createdAt).toLocaleString('id-ID')}</td><td>{m.productName}</td><td>{MOVEMENT_LABEL[m.type]}</td><td className={`numeric mono ${m.qty < 0 ? 'danger-text' : ''}`}>{m.qty > 0 ? '+' : ''}{number.format(m.qty)}</td><td className="mono">{m.reference}</td><td>{m.note ?? '—'}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
