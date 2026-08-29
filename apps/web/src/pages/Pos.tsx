import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArchiveRestore, Banknote, Check, ChevronDown, CircleUserRound, Clock3, History, Minus, PackageSearch, Pause, Plus, Printer, RefreshCw, Search, ShoppingBasket, Trash2, X } from 'lucide-react';
import { completeSale, getPaymentMethods, getPrinterConfig, getStoreProfile, listCustomers, listProducts, listSales } from '../lib/api';
import { money, number } from '../lib/money';
import { openBlankPreviewPopup, openDailySalesReportPopup, receiptHtml, sendToPrintBridge, type Receipt } from '../lib/print';
import { submitCheckout } from '../lib/checkout';
import type { CartLine, Customer, HeldSale, PaperWidth, PaymentMethod, Product, SaleRecord, StoreProfile, Unit } from '../types';

const STORAGE_KEY = 'sid-held-sales';
const general: Customer = { id: 'general', code: 'UMUM', name: 'Pelanggan Umum', tier: 'retail' };

export function Pos({ online }: { online: boolean }) {
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Product[]>([]); const [searchLoading,setSearchLoading]=useState(false); const [searchError,setSearchError]=useState(''); const [searchRetry,setSearchRetry]=useState(0); const [cart, setCart] = useState<CartLine[]>([]); const [customer, setCustomer] = useState<Customer>(general); const [dialog, setDialog] = useState<'unit'|'customer'|'payment'|'held'|null>(null); const [selected, setSelected] = useState(0); const [held, setHeld] = useState<HeldSale[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); const [notice, setNotice] = useState(''); const [tab, setTab] = useState<'kasir'|'riwayat'>('kasir'); const searchRef = useRef<HTMLInputElement>(null);
  // React's setState updater doesn't run synchronously, so a mutable flag read right after
  // calling setCart() can't be trusted to catch rapid same-tick clicks (verified live: 3
  // fast clicks on qty+ blew past a stock cap because each click's updater still saw the
  // pre-update qty). cartRef mirrors cart and is written synchronously on every cart change,
  // so stock-cap checks always read the true current qty even under rapid clicking.
  const cartRef = useRef<CartLine[]>([]);
  const updateCart = (next: CartLine[]) => { cartRef.current = next; setCart(next); };
  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.qty * line.unit.price, 0), [cart]); const discount = useMemo(() => cart.reduce((sum, line) => sum + line.discount, 0), [cart]); const total = subtotal - discount;
  // Barang stok habis/minus disaring di sini, sebelum masuk ke daftar hasil pencarian
  // maupun jalur pickSearch() exact-match - jadi kasir gak bisa nambahin barang yang
  // stoknya gak cukup sama sekali, bukan cuma ditolak belakangan pas bayar.
  useEffect(() => { let active=true; setSearchLoading(true); setSearchError(''); const timer = setTimeout(() => listProducts(query).then(data=>{if(active)setResults(data.filter(p=>p.stock>0))}).catch(error=>{if(active){setResults([]);setSearchError(error instanceof Error?error.message:'Pencarian barang gagal')}}).finally(()=>{if(active)setSearchLoading(false)}), 100); return () => { active=false; clearTimeout(timer); }; }, [query,searchRetry]);
  // Stok barang tersimpan dalam satuan dasar; satu unit kasir (mis. "Dus") bisa berisi
  // beberapa satuan dasar (unit.multiplier), jadi batas qty per baris keranjang = stok
  // dibagi multiplier satuan yang sedang dipakai, dibulatkan ke bawah.
  const maxQtyFor = (product: Product, unit: Unit) => Math.max(0, Math.floor(product.stock / unit.multiplier));
  const add = useCallback((product: Product, unit = product.units[0]) => {
    const current = cartRef.current;
    const i = current.findIndex(line => line.product.id === product.id && line.unit.name === unit.name);
    const max = maxQtyFor(product, unit);
    if (i < 0) {
      if (max < 1) setNotice(`Stok ${product.name} habis, tidak bisa ditambahkan.`);
      else updateCart([...current, { product, unit, qty: 1, discount: 0 }]);
    } else if (current[i].qty + 1 > max) {
      setNotice(`Stok ${product.name} tinggal ${max} ${unit.name}, tidak bisa ditambah lagi.`);
    } else {
      updateCart(current.map((line, index) => index === i ? { ...line, qty: line.qty + 1 } : line));
    }
    setQuery(''); searchRef.current?.focus();
  }, []);
  const holdSale = useCallback(() => { if (!cart.length) return setNotice('Keranjang masih kosong.'); const sale: HeldSale = { id: crypto.randomUUID(), reference: `HOLD-${String(held.length + 1).padStart(3,'0')}`, customer, lines: cart, heldAt: new Date().toISOString() }; const next = [...held, sale]; setHeld(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); updateCart([]); setCustomer(general); setNotice(`${sale.reference} berhasil ditahan di perangkat ini.`); }, [cart, customer, held]);
  useEffect(() => { const key = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'Escape') { setDialog(null); return; }
    // F3 toggles the Riwayat tab from anywhere; F2 always brings the cashier back to Kasir
    // and refocuses the scanner - both work regardless of which tab or dialog is active.
    if (event.key === 'F3') { event.preventDefault(); setTab(t => t === 'kasir' ? 'riwayat' : 'kasir'); return; }
    if (event.key === 'F2') { event.preventDefault(); setTab('kasir'); setTimeout(() => searchRef.current?.focus(), 0); return; }
    if (dialog || tab !== 'kasir') return;
    if (event.key === 'F1') { event.preventDefault(); if (cart.length) { if (selected < 0 || selected >= cart.length) setSelected(cart.length - 1); setDialog('unit'); } }
    if (event.key === 'F4') { event.preventDefault(); setDialog('customer'); }
    if (event.key === 'F5') { event.preventDefault(); holdSale(); }
    if (event.key === 'F8') { event.preventDefault(); if (cart.length && online) setDialog('payment'); }
  }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [cart.length, holdSale, online, dialog, selected, tab]);
  function pickSearch() { const exact = results.find(p => p.barcode === query || p.code.toLowerCase() === query.toLowerCase()); if (exact) add(exact); else if (results.length === 1) add(results[0]); }
  return <div className="pos-page"><div className="pos-header"><div><p className="eyebrow">Transaksi</p><h1>Penjualan kasir</h1></div><div className="invoice-draft"><span>Draft baru</span><strong>{new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</strong></div></div>
    {notice && <div className="notice info" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Tutup pesan"><X /></button></div>}
    <div className="tabs"><button className={`tab-button ${tab==='kasir'?'active':''}`} onClick={() => setTab('kasir')}><ShoppingBasket /> Kasir</button><button className={`tab-button ${tab==='riwayat'?'active':''}`} onClick={() => setTab('riwayat')}><History /> Riwayat hari ini <kbd>F3</kbd></button></div>
    {tab === 'riwayat' ? <HistoryTab /> : <div className="pos-layout"><section className="pos-main"><div className="scan-row"><label className="scan-input"><Search aria-hidden="true"/><span className="sr-only">Scan barcode atau cari barang</span><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && pickSearch()} placeholder="Scan barcode atau cari barang…" autoFocus /></label><span className="key-hint">F2</span></div>
      {query && <div className="search-results" role="listbox" aria-label="Hasil pencarian">{searchLoading?<div className="empty-compact" role="status">Mencari barang…</div>:searchError?<div className="inline-recovery" role="alert"><span>{searchError}</span><button className="button secondary" onClick={()=>setSearchRetry(value=>value+1)}>Coba lagi</button></div>:<>{results.slice(0,6).map(product => <button key={product.id} role="option" aria-selected="false" onClick={() => add(product)}><div><strong>{product.name}</strong><span>{product.code} · {product.barcode}</span></div><div><strong>{money.format(product.units[0].price)}</strong><span>Stok {number.format(product.stock)}</span></div></button>)}{!results.length && <div className="empty-compact">Barang tidak ditemukan</div>}</>}</div>}
      <div className="cart-heading"><div><h2>Daftar belanja</h2><span>{cart.length} baris</span></div><button className="button ghost" disabled={!cart.length} onClick={() => updateCart([])}><Trash2 /> Kosongkan</button></div>
      {!cart.length ? <div className="cart-empty"><ShoppingBasket /><h2>Belum ada barang</h2><p>Scan barcode atau cari nama barang untuk memulai.</p></div> : <div className="cart-list">{cart.map((line, index) => <article className="cart-line" key={`${line.product.id}-${line.unit.name}`} onClick={() => setSelected(index)} data-selected={selected === index}><div className="line-index">{index + 1}</div><div className="line-product"><strong>{line.product.name}</strong><span>{line.product.code}</span></div><button className="unit-select" onClick={() => { setSelected(index); setDialog('unit'); }}>{line.unit.name}<ChevronDown /></button><div className="qty-control"><button onClick={() => updateCart(cartRef.current.map((x,i) => i === index ? {...x, qty: Math.max(1,x.qty-1)} : x))} aria-label={`Kurangi ${line.product.name}`}><Minus /></button><span>{line.qty}</span><button onClick={() => { const x = cartRef.current[index]; if (!x) return; const max = maxQtyFor(x.product, x.unit); if (x.qty + 1 > max) { setNotice(`Stok ${x.product.name} tinggal ${max} ${x.unit.name}, tidak bisa ditambah lagi.`); return; } updateCart(cartRef.current.map((line2,i) => i === index ? {...line2, qty:line2.qty+1} : line2)); }} aria-label={`Tambah ${line.product.name}`}><Plus /></button></div><div className="line-price"><span>{money.format(line.unit.price)}</span><strong>{money.format(line.qty * line.unit.price - line.discount)}</strong></div><button className="icon-button danger" onClick={() => updateCart(cartRef.current.filter((_,i) => i !== index))} aria-label={`Hapus ${line.product.name}`}><Trash2 /></button></article>)}</div>}
    </section><aside className="checkout-panel"><button className="customer-card" onClick={() => setDialog('customer')}><CircleUserRound /><span><small>Pelanggan</small><strong>{customer.name}</strong><em>{customer.code}</em></span><ChevronDown /></button><div className="summary"><div><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div><div><span>Diskon</span><strong>- {money.format(discount)}</strong></div><div className="grand-total"><span>Total</span><strong>{money.format(total)}</strong></div></div><div className="checkout-actions"><button className="button secondary tall" onClick={holdSale} disabled={!cart.length}><Pause /> Tahan <kbd>F5</kbd></button><button className="button secondary tall" onClick={() => setDialog('held')}><ArchiveRestore /> Buka hold <span className="count">{held.length}</span></button><button className="button primary payment" disabled={!cart.length || !online} onClick={() => setDialog('payment')}><Banknote /><span>Bayar sekarang<small>{online ? 'Tunai / pembayaran lain' : 'Tidak tersedia saat offline'}</small></span><kbd>F8</kbd></button></div><div className="shortcut-strip"><span><kbd>F1</kbd> Satuan</span><span><kbd>F4</kbd> Pelanggan</span><span><kbd>F3</kbd> Riwayat</span><span><kbd>Esc</kbd> Tutup</span></div></aside></div>}
    {dialog === 'unit' && cart[selected] && <UnitDialog line={cart[selected]} onClose={() => setDialog(null)} onPick={unit => { updateCart(cartRef.current.map((line,i) => { if (i !== selected) return line; const max = maxQtyFor(line.product, unit); if (max < line.qty) setNotice(`Stok ${line.product.name} cuma cukup ${max} ${unit.name}, qty disesuaikan.`); return { ...line, unit, qty: Math.max(1, Math.min(line.qty, max)) }; })); setDialog(null); }} />}
    {dialog === 'customer' && <CustomerDialog onClose={() => setDialog(null)} onPick={value => { setCustomer(value); setDialog(null); }} />}
    {dialog === 'payment' && <PaymentDialog customer={customer} cart={cart} total={total} onClose={() => setDialog(null)} onDone={(invoice, printFailed) => { updateCart([]); setCustomer(general); setDialog(null); setNotice(printFailed ? `Transaksi ${invoice} tersimpan, tetapi cetak gagal. Gunakan riwayat untuk cetak ulang.` : `Transaksi ${invoice} berhasil disimpan dan struk dikirim.`); }} />}
    {dialog === 'held' && <HeldDialog sales={held} onClose={() => setDialog(null)} onPick={sale => { updateCart(sale.lines); setCustomer(sale.customer); const next = held.filter(x => x.id !== sale.id); setHeld(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setDialog(null); }} />}
  </div>;
}

function Modal({ title, children, onClose }: { title:string; children:ReactNode; onClose:()=>void }) { const ref=useRef<HTMLElement>(null); const previous=useRef<HTMLElement|null>(null); const onCloseRef=useRef(onClose); onCloseRef.current=onClose; useEffect(()=>{previous.current=document.activeElement as HTMLElement; const box=ref.current; const focusable=()=>Array.from(box?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')??[]); (box?.querySelector<HTMLElement>('[data-autofocus]')??focusable()[0])?.focus(); const trap=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onCloseRef.current();return}if(e.key!=='Tab')return;const all=focusable();if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};box?.addEventListener('keydown',trap);return()=>{box?.removeEventListener('keydown',trap);previous.current?.focus()}},[]); return <div className="modal-overlay"><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>{children}</section></div>; }
function UnitDialog({ line, onPick, onClose }: { line:CartLine; onPick:(u:Unit)=>void; onClose:()=>void }) { return <Modal title="Pilih satuan dan harga" onClose={onClose}><div className="option-list">{line.product.units.map((unit,index) => <button key={unit.name} data-autofocus={index===0?'true':undefined} onClick={() => onPick(unit)}><span><strong>{unit.name}</strong><small>Isi {unit.multiplier} satuan dasar</small></span><strong>{money.format(unit.price)}</strong>{unit.name === line.unit.name && <Check />}</button>)}</div></Modal>; }
function CustomerDialog({ onPick, onClose }: { onPick:(c:Customer)=>void; onClose:()=>void }) { const [customers,setCustomers]=useState<Customer[]>([]); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0); useEffect(()=>{let active=true;setLoading(true);setError('');const timer=setTimeout(()=>listCustomers(q).then(data=>{if(active)setCustomers(data)}).catch(err=>{if(active){setCustomers([]);setError(err instanceof Error?err.message:'Pelanggan gagal dimuat')}}).finally(()=>{if(active)setLoading(false)}),100);return()=>{active=false;clearTimeout(timer)}},[q,retry]); return <Modal title="Pilih pelanggan" onClose={onClose}><label className="search-box"><Search/><span className="sr-only">Cari pelanggan</span><input data-autofocus="true" value={q} onChange={e=>setQ(e.target.value)} placeholder="Nama atau kode pelanggan…"/></label>{loading?<div className="empty-state" role="status">Memuat pelanggan…</div>:error?<div className="inline-recovery" role="alert"><span>{error}</span><button className="button secondary" onClick={()=>setRetry(v=>v+1)}>Coba lagi</button></div>:<div className="option-list">{customers.map(c=><button key={c.id} onClick={()=>onPick(c)}><span><strong>{c.name}</strong><small>{c.code}{c.phone ? ` · ${c.phone}`:''}</small></span><span className="status">{c.tier}</span></button>)}{!customers.length&&<div className="empty-state">Pelanggan tidak ditemukan.</div>}</div>}</Modal>; }
function HeldDialog({ sales,onPick,onClose }:{sales:HeldSale[];onPick:(s:HeldSale)=>void;onClose:()=>void}) { return <Modal title="Transaksi ditahan" onClose={onClose}>{!sales.length?<div className="empty-state">Tidak ada transaksi yang ditahan.</div>:<div className="option-list">{sales.map(s=><button key={s.id} onClick={()=>onPick(s)}><span><strong>{s.reference}</strong><small>{s.customer.name} · {s.lines.length} baris · <Clock3/> {new Date(s.heldAt).toLocaleTimeString('id-ID')}</small></span><strong>{money.format(s.lines.reduce((a,l)=>a+l.qty*l.unit.price-l.discount,0))}</strong></button>)}</div>}</Modal>; }
// Shown after a sale has already saved successfully, before anything is actually sent to a
// printer. Closing/skipping is a valid choice (the sale is safe either way) - only an actual
// print failure (bridge unreachable) is reported back as printFailed to the caller.
function ReceiptPreviewModal({ receipt, profile, paperWidth, onDone }: { receipt: Receipt; profile?: StoreProfile; paperWidth: PaperWidth; onDone: (ok: boolean, err?: Error) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [printing, setPrinting] = useState(false);
  const hasBridge = Boolean(import.meta.env.VITE_PRINTER_BRIDGE_URL);
  async function doPrint() {
    setPrinting(true);
    try { if (hasBridge) await sendToPrintBridge(receipt); else iframeRef.current?.contentWindow?.print(); onDone(true); }
    catch (e) { onDone(false, e instanceof Error ? e : new Error('Cetak gagal')); }
    finally { setPrinting(false); }
  }
  return <Modal title="Pratinjau struk" onClose={() => onDone(true)}>
    <div className="receipt-preview"><iframe ref={iframeRef} title="Pratinjau struk" srcDoc={receiptHtml(receipt, profile, paperWidth)} /></div>
    <div className="modal-actions"><button className="button secondary" onClick={() => onDone(true)}>Lewati cetak</button><button className="button primary" data-autofocus="true" onClick={doPrint} disabled={printing}><Printer /> {printing ? 'Mencetak…' : 'Cetak'}</button></div>
  </Modal>;
}
// Fetches store profile + printer config (best-effort, falls back to safe defaults), shows the
// ReceiptPreviewModal, and resolves once the cashier prints or explicitly skips. Shared between
// the post-checkout flow (PaymentDialog) and reprinting a past sale (HistoryTab) so both go
// through the exact same preview-before-print step, not two divergent implementations.
function useReceiptPreview() {
  const [preview, setPreview] = useState<{ receipt: Receipt; profile?: StoreProfile; paperWidth: PaperWidth } | null>(null);
  const resolverRef = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  const previewAndPrint = useCallback((receipt: Receipt): Promise<void> => {
    return (async () => {
      let profile: StoreProfile | undefined; try { profile = await getStoreProfile(); } catch { profile = undefined; }
      let paperWidth: PaperWidth = '58mm'; try { paperWidth = (await getPrinterConfig()).paperWidth; } catch { /* keep default */ }
      return { profile, paperWidth };
    })().then(({ profile, paperWidth }) => new Promise<void>((resolve, reject) => {
      resolverRef.current = { resolve, reject };
      setPreview({ receipt, profile, paperWidth });
    }));
  }, []);
  const modal = preview ? <ReceiptPreviewModal receipt={preview.receipt} profile={preview.profile} paperWidth={preview.paperWidth} onDone={(ok, err) => { const resolver = resolverRef.current; resolverRef.current = null; setPreview(null); if (ok) resolver?.resolve(); else resolver?.reject(err ?? new Error('Cetak gagal')); }} /> : null;
  return { previewAndPrint, modal };
}
function PaymentDialog({ customer,cart,total,onClose,onDone }:{customer:Customer;cart:CartLine[];total:number;onClose:()=>void;onDone:(invoice:string,printFailed:boolean)=>void}) {
  const [paid,setPaid]=useState(total); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const [methods,setMethods]=useState<PaymentMethod[]>([]); const [method,setMethod]=useState<PaymentMethod|null>(null);
  const [methodsLoading,setMethodsLoading]=useState(true); const [methodsError,setMethodsError]=useState(''); const [methodsRetry,setMethodsRetry]=useState(0);
  const [reference,setReference]=useState('');
  const [isDebt,setIsDebt]=useState(false); const [debtNote,setDebtNote]=useState('');
  const idempotencyKey=useRef(crypto.randomUUID());
  const { previewAndPrint, modal } = useReceiptPreview();
  useEffect(()=>{let active=true;setMethodsLoading(true);setMethodsError('');getPaymentMethods().then(list=>{if(!active)return;setMethods(list);setMethod(current=>current??list[0]??null);}).catch(err=>{if(active)setMethodsError(err instanceof Error?err.message:'Metode pembayaran gagal dimuat');}).finally(()=>{if(active)setMethodsLoading(false);});return()=>{active=false;};},[methodsRetry]);
  const isCash=method?.type==='cash';
  // Cashbon is a debt sale by definition — no checkbox needed, it's implied by picking the method.
  const isDebtMethod=method?.type==='debt';
  const isCashLike=isCash||isDebtMethod;
  const isGeneralCustomer=customer.id==='general';
  const shortfall=Math.max(0,total-paid);
  const effectiveIsDebt=isDebtMethod||isDebt;
  // Non-cash-like methods are paid in full (no change/kembalian); cash/cashbon keep the received-amount flow.
  const effectivePaid=isCashLike?paid:total;
  function pickMethod(m:PaymentMethod){setMethod(m);setError('');setIsDebt(false);if(m.type==='cash')setPaid(total);else if(m.type==='debt')setPaid(0);else{setPaid(total);setReference('');}}
  async function submit(){
    if(!method)return setError('Pilih metode pembayaran.');
    if(isCashLike&&!effectiveIsDebt&&paid<total)return setError('Uang diterima kurang dari total belanja. Centang "Pelanggan berhutang" kalau belum lunas.');
    if(effectiveIsDebt&&shortfall>0&&isGeneralCustomer)return setError('Pilih pelanggan terdaftar untuk transaksi piutang, bukan Pelanggan Umum.');
    if(saving)return;
    setSaving(true);setError('');
    try{
      const trimmedRef=reference.trim();
      const debt=effectiveIsDebt&&shortfall>0;
      const payload={customerId:customer.id,lines:cart.map(l=>({productId:l.product.id,unit:l.unit.name,qty:l.qty,price:l.unit.price,discount:l.discount})),paid:effectivePaid,idempotencyKey:idempotencyKey.current,paymentMethod:method.code,paymentRef:!isCashLike&&trimmedRef?trimmedRef:undefined,isDebt:debt,debtNote:debt&&debtNote.trim()?debtNote.trim():undefined};
      const receiptLines=cart.map(l=>({productName:l.product.name,qty:l.qty,unitName:l.unit.name,unitPrice:l.unit.price,discount:l.discount}));
      const result=await submitCheckout(payload,{customer,lines:receiptLines,paid:effectivePaid,total,methodName:method.name,reference:!isCashLike&&trimmedRef?trimmedRef:undefined},{ save:completeSale, print: r => previewAndPrint(r) });
      onDone(result.invoice,result.printFailed);
    }catch(e){setError(e instanceof Error?e.message:'Transaksi gagal disimpan');setSaving(false)}
  }
  if (modal) return modal;
  const submitDisabled=saving||methodsLoading||!method||(isCashLike&&!effectiveIsDebt&&paid<total)||(effectiveIsDebt&&shortfall>0&&isGeneralCustomer);
  return <Modal title="Pembayaran" onClose={onClose}><div className="payment-total"><span>Total pembayaran</span><strong>{money.format(total)}</strong></div>
    <label>Metode pembayaran</label>
    {methodsLoading?<div className="empty-compact" role="status">Memuat metode…</div>:methodsError?<div className="inline-recovery" role="alert"><span>{methodsError}</span><button className="button secondary" onClick={()=>setMethodsRetry(v=>v+1)}>Coba lagi</button></div>:!methods.length?<div className="notice warning" role="alert">Belum ada metode pembayaran aktif. Tambahkan di Pengaturan.</div>:<div className="pay-method-picker" role="group" aria-label="Metode pembayaran">{methods.map((m,i)=><button key={m.id} type="button" data-autofocus={i===0?'true':undefined} className={method?.code===m.code?'active':''} aria-pressed={method?.code===m.code} onClick={()=>pickMethod(m)}>{m.name}</button>)}</div>}
    {method&&isCashLike&&<><label>Uang diterima<input className="money-input" type="number" min={0} value={paid} onChange={e=>setPaid(Number(e.target.value))} onFocus={e=>e.currentTarget.select()} /></label>
      <div className="change"><span>Sisa pembayaran</span><strong>{money.format(shortfall)}</strong></div>
      <div className="quick-cash">{[total,Math.ceil(total/10000)*10000,Math.ceil(total/50000)*50000].filter((v,i,a)=>a.indexOf(v)===i).map(v=><button key={v} onClick={()=>setPaid(v)}>{money.format(v)}</button>)}</div>
      {shortfall<=0?<div className="change"><span>Kembalian</span><strong>{money.format(Math.max(0,paid-total))}</strong></div>:!isDebtMethod&&<label className="checkbox-row"><input type="checkbox" checked={isDebt} onChange={e=>setIsDebt(e.target.checked)} /> Pelanggan berhutang (piutang)</label>}
      {effectiveIsDebt&&shortfall>0&&<>{isGeneralCustomer&&<div className="notice warning" role="alert">Pilih pelanggan terdaftar dulu (bukan Pelanggan Umum) supaya piutang ini bisa ditagih.</div>}<label>Catatan piutang (opsional)<input className="money-input" type="text" maxLength={50} value={debtNote} onChange={e=>setDebtNote(e.target.value)} placeholder="Alasan berhutang, janji lunas kapan, dsb." /></label></>}
    </>}
    {method&&!isCashLike&&<label>Nomor referensi (opsional)<input className="money-input" type="text" maxLength={64} value={reference} onChange={e=>setReference(e.target.value)} placeholder="No. QRIS / transfer / approval" /></label>}
    {error&&<div className="notice error" role="alert">{error}</div>}<div className="modal-actions"><button className="button secondary" onClick={onClose} disabled={saving}>Batal</button><button className="button primary" onClick={submit} disabled={submitDisabled}>{saving?'Menyimpan…':<><Printer/>Simpan & cetak</>}</button></div></Modal>; }

// View-only for now: editing a saved sale (adjusting lines/qty/price after the fact, with the
// stock/ledger implications that implies) needs its own carefully-designed, admin-gated backend
// endpoint - deliberately out of scope here. This tab covers lookup, detail, and reprint only.
function SaleDetailModal({ sale, onClose, onReprint, reprinting }: { sale: SaleRecord; onClose: () => void; onReprint: () => void; reprinting: boolean }) {
  return <Modal title={`Detail ${sale.invoice}`} onClose={onClose}>
    <p className="muted" style={{ marginTop: -8 }}>{new Date(sale.createdAt).toLocaleString('id-ID')} · {sale.customerName || 'Tanpa nama'}</p>
    <div className="table-wrap"><table><thead><tr><th>Barang</th><th>Satuan</th><th className="numeric">Qty</th><th className="numeric">Harga</th><th className="numeric">Subtotal</th></tr></thead><tbody>
      {sale.lines.map((l,i) => <tr key={i}><td>{l.productName}</td><td>{l.unit}</td><td className="numeric mono">{number.format(l.qty)}</td><td className="numeric mono">{money.format(l.price)}</td><td className="numeric mono">{money.format(l.qty*l.price-l.discount)}</td></tr>)}
    </tbody></table></div>
    <div className="summary"><div><span>Total</span><strong>{money.format(sale.total)}</strong></div><div><span>Bayar</span><strong>{money.format(sale.paid)}</strong></div><div className="grand-total"><span>Kembalian</span><strong>{money.format(sale.change)}</strong></div></div>
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Tutup</button><button className="button primary" data-autofocus="true" onClick={onReprint} disabled={reprinting}><Printer /> {reprinting ? 'Menyiapkan…' : 'Cetak ulang'}</button></div>
  </Modal>;
}
function HistoryTab() {
  const [sales, setSales] = useState<SaleRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [detail, setDetail] = useState<SaleRecord | null>(null); const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [cashierQuery, setCashierQuery] = useState(''); const [methodFilter, setMethodFilter] = useState(''); const [printingReport, setPrintingReport] = useState(false);
  const { previewAndPrint, modal } = useReceiptPreview();
  const load = () => { setLoading(true); setError(''); listSales().then(setSales).catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat riwayat')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => sales.filter(s => s.createdAt.slice(0, 10) === todayKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [sales, todayKey]);
  const methodOptions = useMemo(() => Array.from(new Set(todaySales.map(s => s.methodName).filter((v): v is string => Boolean(v)))).sort(), [todaySales]);
  const visibleSales = useMemo(() => {
    const q = cashierQuery.trim().toLowerCase();
    return todaySales
      .filter(s => !q || (s.cashierName || '').toLowerCase().includes(q))
      .filter(s => !methodFilter || s.methodName === methodFilter);
  }, [todaySales, cashierQuery, methodFilter]);
  const totalToday = useMemo(() => visibleSales.reduce((sum, s) => sum + s.total, 0), [visibleSales]);
  async function reprint(sale: SaleRecord) {
    setReprintingId(sale.id);
    try {
      await previewAndPrint({
        invoice: sale.invoice,
        customer: { id: sale.customerId || 'general', code: sale.customerId || 'UMUM', name: sale.customerName || 'Pelanggan Umum', tier: 'retail' },
        lines: sale.lines.map(l => ({ productName: l.productName, qty: l.qty, unitName: l.unit, unitPrice: l.price, discount: l.discount })),
        paid: sale.paid, total: sale.total
      });
    } catch { /* preview/print was skipped or failed - cashier can just try again from the row */ }
    finally { setReprintingId(null); }
  }
  async function printReport() {
    // window.open() must run synchronously inside the click handler or popup blockers kill it —
    // open a blank tab first, then fill it in once the store profile fetch resolves.
    const popup = openBlankPreviewPopup();
    setPrintingReport(true);
    // Store profile is settings:read-gated (kasir tokens don't have it) - the report still works
    // fine without it, just falls back to the VITE_STORE_NAME default for the header, same as
    // Settings > Printer's "Tes cetak" does for the same reason.
    let profileName: string | undefined; try { profileName = (await getStoreProfile())?.name; } catch { profileName = undefined; }
    try {
      openDailySalesReportPopup(visibleSales, new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }), profileName, popup);
    } catch (e) { popup?.close(); alert(e instanceof Error ? e.message : 'Gagal menyiapkan laporan cetak'); }
    finally { setPrintingReport(false); }
  }
  return <section className="pos-main history-tab">
    <div className="cart-heading history-heading"><div><h2>Riwayat transaksi hari ini</h2><span>{visibleSales.length} transaksi · {money.format(totalToday)}</span></div>
      <div className="history-tools">
        <label className="search-box history-search"><Search aria-hidden="true" /><span className="sr-only">Cari nama kasir</span><input value={cashierQuery} onChange={e => setCashierQuery(e.target.value)} placeholder="Cari kasir…" /></label>
        <label className="sr-only" htmlFor="history-method-filter">Filter metode pembayaran</label>
        <select id="history-method-filter" className="history-method-filter" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
          <option value="">Semua metode</option>
          {methodOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="button secondary" onClick={printReport} disabled={printingReport || !visibleSales.length}><Printer /> {printingReport ? 'Menyiapkan…' : 'Cetak laporan (A4)'}</button>
        <button className="button ghost" onClick={load} disabled={loading}><RefreshCw /> Muat ulang</button>
      </div>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {loading ? <div className="empty-state" role="status">Memuat riwayat…</div> : !visibleSales.length ? <div className="empty-state"><History /><p>{cashierQuery || methodFilter ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi hari ini.'}</p></div> : <div className="table-wrap"><table><thead><tr><th>Faktur</th><th>Waktu</th><th>Kasir</th><th>Pelanggan</th><th>Metode</th><th className="numeric">Total</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>
      {visibleSales.map(s => <tr key={s.id}>
        <td className="mono">{s.invoice}</td>
        <td>{new Date(s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>{s.cashierName || '—'}</td>
        <td>{s.customerName || 'Tanpa nama'}</td>
        <td>{s.methodName || '—'}</td>
        <td className="numeric mono">{money.format(s.total)}</td>
        <td><div className="row-actions"><button className="button ghost" onClick={() => setDetail(s)}>Detail</button><button className="button secondary" onClick={() => reprint(s)} disabled={reprintingId === s.id}><Printer /> {reprintingId === s.id ? '…' : 'Cetak ulang'}</button></div></td>
      </tr>)}
    </tbody></table></div>}
    {detail && <SaleDetailModal sale={detail} reprinting={reprintingId === detail.id} onClose={() => setDetail(null)} onReprint={() => reprint(detail)} />}
    {modal}
  </section>;
}
