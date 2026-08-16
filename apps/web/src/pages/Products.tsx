import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CirclePlus, Package, Pencil, RefreshCw, Search, X } from 'lucide-react';
import { listProducts, saveProduct, uploadProductPhoto } from '../lib/api';
import { money, number } from '../lib/money';
import type { Product } from '../types';

const blank: Product = { id: '', code: '', barcode: '', name: '', category: '', stock: 0, minStock: 0, cost: 0, active: true, units: [{ name: 'Pcs', multiplier: 1, price: 0 }] };

// Resizes+re-encodes on the client before upload (fast, small request) — the server always
// re-compresses too (never trusts a client-declared "already compressed" file).
async function compressImage(file: Blob, maxSide = 1200, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale) || 1; const height = Math.round(bitmap.height * scale) || 1;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas tidak didukung di browser ini.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gagal mengompresi gambar.')), 'image/jpeg', quality));
}

export function Products() {
  const [products, setProducts] = useState<Product[]>([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editing, setEditing] = useState<Product | null>(null); const modalRef=useRef<HTMLElement>(null);
  const [photoFile, setPhotoFile] = useState<Blob | null>(null); const [photoPreview, setPhotoPreview] = useState('');
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(new Set());
  const load = () => { setLoading(true); setError(''); listProducts().then(setProducts).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  function openEditor(product: Product) { setPhotoFile(null); setPhotoPreview(product.photoUrl ?? ''); setEditing(product); }
  async function handlePhotoBlob(file: Blob) {
    try { const compressed = await compressImage(file); setPhotoFile(compressed); setPhotoPreview(URL.createObjectURL(compressed)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal memproses foto.'); }
  }
  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    await handlePhotoBlob(file);
  }
  function onPhotoPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile(); if (!file) return;
    e.preventDefault();
    void handlePhotoBlob(file);
  }
  useEffect(()=>{if(!editing)return;const previous=document.activeElement as HTMLElement;const box=modalRef.current;const focusable=()=>Array.from(box?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')??[]);(box?.querySelector<HTMLElement>('[data-autofocus]')??focusable()[0])?.focus();const keys=(event:KeyboardEvent)=>{if(event.key==='Escape'){setEditing(null);return}if(event.key!=='Tab')return;const all=focusable();if(!all.length)return;const first=all[0],last=all[all.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};box?.addEventListener('keydown',keys);return()=>{box?.removeEventListener('keydown',keys);previous?.focus()}},[editing]);
  const filtered = useMemo(() => products.filter(p => [p.name, p.code, p.barcode].some(v => v.toLowerCase().includes(search.toLowerCase()))), [products, search]);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!editing) return; const form = new FormData(e.currentTarget); const next: Product = { ...editing, id: editing.id || crypto.randomUUID(), code: String(form.get('code')), barcode: String(form.get('barcode')), name: String(form.get('name')), category: String(form.get('category')), minStock: Number(form.get('minStock')), cost: Number(form.get('cost')), units: [{ ...editing.units[0], name: String(form.get('unit')), price: Number(form.get('price')) }] }; if (!next.code || !next.name || next.units[0].price < 0) return setError('Kode, nama, dan harga valid wajib diisi.'); try { let saved = await saveProduct(next); if (photoFile) { try { const { photoUrl } = await uploadProductPhoto(saved.id, photoFile); saved = { ...saved, photoUrl }; } catch (photoErr) { setError(photoErr instanceof Error ? photoErr.message : 'Barang tersimpan, tetapi unggah foto gagal.'); } } setProducts(current => current.some(p => p.id === saved.id) ? current.map(p => p.id === saved.id ? saved : p) : [...current, saved]); setEditing(null); } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan barang'); } }
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Master Data</p><h1>Barang</h1><p>{products.length} barang terdaftar</p></div><button className="button primary" onClick={() => openEditor(blank)}><CirclePlus /> Tambah barang</button></div>
    <section className="panel flush"><div className="table-tools"><label className="search-box"><Search aria-hidden="true"/><span className="sr-only">Cari barang</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode, barcode, atau nama…" /></label><button className="button secondary" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Memuat data barang…</div> : filtered.length === 0 ? <div className="empty-state"><PackageEmpty />Tidak ada barang yang cocok.</div> : <div className="table-wrap"><table><thead><tr><th><span className="sr-only">Foto</span></th><th>Kode</th><th>Barang</th><th>Kategori</th><th>Satuan</th><th className="numeric">Stok</th><th className="numeric">Harga</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{filtered.map(product => <tr key={product.id}><td>{product.photoUrl && !brokenPhotoIds.has(product.id) ? <img className="product-thumb" src={product.photoUrl} alt="" width={32} height={32} onError={() => setBrokenPhotoIds(current => new Set(current).add(product.id))} /> : <Package className="product-thumb-fallback" aria-hidden="true" />}</td><td className="mono">{product.code}</td><td><strong>{product.name}</strong><small>{product.barcode}</small></td><td>{product.category}</td><td>{product.units[0].name}</td><td className={`numeric mono ${product.stock <= product.minStock ? 'danger-text' : ''}`}>{number.format(product.stock)}</td><td className="numeric mono">{money.format(product.units[0].price)}</td><td><span className={`status ${product.active ? 'success' : ''}`}>{product.active ? 'Aktif' : 'Nonaktif'}</span></td><td><button className="icon-button" onClick={() => openEditor(product)} aria-label={`Edit ${product.name}`}><Pencil /></button></td></tr>)}</tbody></table></div>}
    </section>
    {editing && <div className="modal-overlay" role="presentation"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="product-title"><div className="modal-heading"><div><p className="eyebrow">Master Barang</p><h2 id="product-title">{editing.id ? 'Edit barang' : 'Tambah barang'}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Tutup"><X /></button></div><form onSubmit={submit} onPaste={onPhotoPaste}><div className="form-grid"><label>Kode barang<input name="code" defaultValue={editing.code} autoFocus required /></label><label>Barcode<input name="barcode" defaultValue={editing.barcode} /></label><label className="span-2">Nama barang<input name="name" defaultValue={editing.name} required /></label><label>Kategori<input name="category" defaultValue={editing.category} required /></label><label>Stok minimum<input name="minStock" type="number" min="0" step="0.01" defaultValue={editing.minStock} /></label><label>Harga pokok<input name="cost" type="number" min="0" defaultValue={editing.cost} /></label><label>Harga jual<input name="price" type="number" min="0" defaultValue={editing.units[0].price} required /></label><label>Satuan<input name="unit" defaultValue={editing.units[0].name} required /></label><label className="span-2">Foto barang <small className="muted">(pilih file atau tempel dengan Ctrl+V)</small>{photoPreview && <img className="product-photo-preview" src={photoPreview} alt="Pratinjau foto barang" />}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} /></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setEditing(null)}>Batal</button><button className="button primary" type="submit">Simpan barang</button></div></form></section></div>}
  </div>;
}
function PackageEmpty() { return <span aria-hidden="true" />; }
