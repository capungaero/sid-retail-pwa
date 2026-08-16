import type { CartLine, Customer, StoreProfile } from '../types';
import { money } from './money';

export type Receipt = { invoice: string; customer: Customer; lines: CartLine[]; paid: number; total: number };

export function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]!);
}

// `profile` is optional so callers that don't have a store profile handy (and existing tests)
// keep working — it falls back to VITE_STORE_NAME / a bare invoice header, same as before.
export function receiptHtml(receipt: Receipt, profile?: StoreProfile) {
  const rows = receipt.lines.map(line => `${escapeHtml(line.product.name)}\n${line.qty} ${escapeHtml(line.unit.name)} × ${money.format(line.unit.price)} = ${money.format(line.qty * line.unit.price - line.discount)}`).join('\n');
  const storeName = profile?.name || (import.meta.env.VITE_STORE_NAME as string | undefined) || 'SID Retail';
  const storeLine = [profile?.address, profile?.phone, profile?.taxId ? `NPWP: ${profile.taxId}` : ''].filter(Boolean).map(escapeHtml).join('<br>');
  const header = profile?.receiptHeader ? `<p class="row">${escapeHtml(profile.receiptHeader)}</p>` : '';
  const footer = profile?.receiptFooter ? `<p class="row">${escapeHtml(profile.receiptFooter)}</p>` : '';
  return `<html><head><title>${escapeHtml(receipt.invoice)}</title><style>body{font:12px monospace;width:72mm;margin:4mm}h1{font-size:16px;text-align:center}.row{white-space:pre-wrap;margin:8px 0}.total{font-weight:bold;border-top:1px dashed;padding-top:8px}</style></head><body><h1>${escapeHtml(storeName)}</h1>${storeLine ? `<p class="row">${storeLine}</p>` : ''}${header}<p>${escapeHtml(receipt.invoice)}<br>${new Date().toLocaleString('id-ID')}<br>${escapeHtml(receipt.customer.name)}</p><div class="row">${rows}</div><p class="total">TOTAL ${money.format(receipt.total)}<br>BAYAR ${money.format(receipt.paid)}<br>KEMBALI ${money.format(receipt.paid - receipt.total)}</p>${footer}<script>window.onload=()=>{window.print();window.close()}</script></body></html>`;
}

export async function printReceipt(receipt: Receipt, profile?: StoreProfile) {
  const bridge = import.meta.env.VITE_PRINTER_BRIDGE_URL as string | undefined;
  if (bridge) {
    const response = await fetch(`${bridge.replace(/\/$/, '')}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(receipt) });
    if (!response.ok) throw new Error('Print bridge tidak merespons');
    return;
  }
  const popup = window.open('', '_blank', 'width=380,height=640');
  if (!popup) throw new Error('Popup cetak diblokir browser');
  popup.document.write(receiptHtml(receipt, profile));
  popup.document.close();
}
