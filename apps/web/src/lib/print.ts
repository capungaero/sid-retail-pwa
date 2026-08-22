import type { Customer, PaperWidth, StoreProfile } from '../types';
import { money } from './money';

// Deliberately flat and decoupled from CartLine: a receipt is printed both right after a
// checkout (where lines come from the live cart) and when reprinting a past sale from history
// (where lines come from SaleRecord — a plain product/qty/price snapshot, no live Product/Unit
// objects). Both call sites map into this shape rather than receiptHtml needing two line types.
export type ReceiptLine = { productName: string; qty: number; unitName: string; unitPrice: number; discount: number };
export type Receipt = { invoice: string; customer: Customer; lines: ReceiptLine[]; paid: number; total: number; methodName?: string; reference?: string };

export function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]!);
}

// `profile` is optional so callers that don't have a store profile handy (and existing tests)
// keep working — it falls back to VITE_STORE_NAME / a bare invoice header, same as before.
// `paperWidth` matches the thermal roll actually loaded in the printer (Pengaturan > Printer),
// defaulting to 58mm (the more common size for a compact kasir printer) when unknown.
export function receiptHtml(receipt: Receipt, profile?: StoreProfile, paperWidth: PaperWidth = '58mm') {
  const widthMm = paperWidth === '80mm' ? 80 : 58;
  const rows = receipt.lines.map(line => `${escapeHtml(line.productName)}\n${line.qty} ${escapeHtml(line.unitName)} × ${money.format(line.unitPrice)} = ${money.format(line.qty * line.unitPrice - line.discount)}`).join('\n');
  const storeName = profile?.name || (import.meta.env.VITE_STORE_NAME as string | undefined) || 'SID Retail';
  const storeLine = [profile?.address, profile?.phone, profile?.taxId ? `NPWP: ${profile.taxId}` : ''].filter(Boolean).map(escapeHtml).join('<br>');
  const header = profile?.receiptHeader ? `<p class="row">${escapeHtml(profile.receiptHeader)}</p>` : '';
  const footer = profile?.receiptFooter ? `<p class="row">${escapeHtml(profile.receiptFooter)}</p>` : '';
  // Payment method (and reference, when present) — e.g. "METODE QRIS" / "REF QR-002210".
  const methodLine = receipt.methodName ? `<br>METODE ${escapeHtml(receipt.methodName)}${receipt.reference ? `<br>REF ${escapeHtml(receipt.reference)}` : ''}` : '';
  // No auto-print/auto-close script here on purpose: this HTML is now always shown as an
  // explicit preview first (in an iframe inside the app, or a plain popup as a bridgeless
  // fallback) and printed only when the cashier confirms — see printPreviewedReceipt().
  // `.feed` adds blank vertical space after the last printed line so the thermal printer
  // advances enough paper for the cashier to tear the receipt cleanly below the content.
  return `<html><head><title>${escapeHtml(receipt.invoice)}</title><style>@page{size:${widthMm}mm auto;margin:0}body{font:12px monospace;width:${widthMm}mm;margin:0 auto;padding:4mm;box-sizing:border-box}h1{font-size:16px;text-align:center}.row{white-space:pre-wrap;margin:8px 0}.total{font-weight:bold;border-top:1px dashed;padding-top:8px}.feed{height:14mm}</style></head><body><h1>${escapeHtml(storeName)}</h1>${storeLine ? `<p class="row">${storeLine}</p>` : ''}${header}<p>${escapeHtml(receipt.invoice)}<br>${new Date().toLocaleString('id-ID')}<br>${escapeHtml(receipt.customer.name)}</p><div class="row">${rows}</div><p class="total">TOTAL ${money.format(receipt.total)}<br>BAYAR ${money.format(receipt.paid)}<br>KEMBALI ${money.format(receipt.paid - receipt.total)}${methodLine}</p>${footer}<div class="feed"></div></body></html>`;
}

// Standalone preview+print popup for contexts outside the POS payment flow's React modal
// (e.g. Settings > Printer > "Tes cetak") — same no-auto-print HTML, plus one plain button.
// Accepts an optional pre-opened window: browsers only allow window.open() synchronously
// inside a user gesture, so callers that must `await` (e.g. fetching the store profile) should
// openBlankPreviewPopup() first in the click handler, then pass that window in here after the
// await resolves. Called with no popup, it opens one itself (fine when there's no preceding await).
export function openBlankPreviewPopup(): Window | null {
  return window.open('', '_blank', 'width=380,height=640');
}
export function openReceiptPreviewPopup(receipt: Receipt, profile?: StoreProfile, paperWidth: PaperWidth = '58mm', popup?: Window | null) {
  const win = popup ?? openBlankPreviewPopup();
  if (!win) throw new Error('Popup pratinjau diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
  const printButton = '<div style="text-align:center;margin-top:12px"><button onclick="window.print()" style="font:600 13px sans-serif;padding:9px 18px;border-radius:6px;border:1px solid #93c5fd;background:#eff6ff;cursor:pointer">Cetak</button></div>';
  win.document.write(receiptHtml(receipt, profile, paperWidth).replace('</body>', `${printButton}</body>`));
  win.document.close();
}

// Sends the receipt straight to a configured hardware print bridge (no in-app preview step
// possible for this path — the bridge owns the actual printer). Used from the "Cetak" action
// after the cashier has already reviewed the on-screen preview.
export async function sendToPrintBridge(receipt: Receipt): Promise<void> {
  const bridge = import.meta.env.VITE_PRINTER_BRIDGE_URL as string | undefined;
  if (!bridge) throw new Error('Print bridge belum dikonfigurasi.');
  const response = await fetch(`${bridge.replace(/\/$/, '')}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(receipt) });
  if (!response.ok) throw new Error('Print bridge tidak merespons');
}
