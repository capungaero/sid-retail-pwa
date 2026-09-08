import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Printer, X } from 'lucide-react';
import { getPrinterConfig, getStoreProfile } from '../lib/api';
import { receiptHtml, sendToPrintBridge, type Receipt } from '../lib/print';
import { exchangeHopsFor, netBasketTotal } from '../lib/reports';
import type { PaperWidth, SaleRecord, StoreProfile } from '../types';

// Focus-trapped dialog shell shared by the POS dialogs and the receipt preview.
export function Modal({ title, children, onClose }: { title:string; children:ReactNode; onClose:()=>void }) { const ref=useRef<HTMLElement>(null); const previous=useRef<HTMLElement|null>(null); const onCloseRef=useRef(onClose); onCloseRef.current=onClose; useEffect(()=>{previous.current=document.activeElement as HTMLElement; const box=ref.current; const focusable=()=>Array.from(box?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')??[]); (box?.querySelector<HTMLElement>('[data-autofocus]')??focusable()[0])?.focus(); const trap=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onCloseRef.current();return}if(e.key!=='Tab')return;const all=focusable();if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};box?.addEventListener('keydown',trap);return()=>{box?.removeEventListener('keydown',trap);previous.current?.focus()}},[]); return <div className="modal-overlay"><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></div>{children}</section></div>; }

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
// the post-checkout flow (POS PaymentDialog), reprinting from the POS HistoryTab and reprinting
// from Riwayat transaksi, so every path goes through the exact same preview-before-print step.
export function useReceiptPreview() {
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

// Receipt for reprinting a past sale. Reprints the CURRENT basket, not the original: a line that
// was later swapped is replaced by the item the customer actually kept (its final replacement)
// and the old item drops off, so the receipt and its total match what was really taken home.
export function buildReprintReceipt(sale: SaleRecord, allSales: SaleRecord[]): Receipt {
  const lines = sale.lines.map(l => {
    const hops = exchangeHopsFor(sale, l.productId, l.unit, allSales);
    if (!hops.length) return { productName: l.productName, qty: l.qty, unitName: l.unit, unitPrice: l.price, discount: l.discount };
    const final = hops[hops.length - 1];
    return { productName: final.newProductName, qty: final.newQty, unitName: final.newUnit, unitPrice: final.newQty ? final.newLineValue / final.newQty : final.newLineValue, discount: 0 };
  });
  const total = netBasketTotal(sale, allSales);
  return {
    invoice: sale.invoice,
    customer: { id: sale.customerId || 'general', code: sale.customerId || 'UMUM', name: sale.customerName || 'Pelanggan Umum', tier: 'retail' },
    lines,
    paid: sale.paid + (total - sale.total), total
  };
}
