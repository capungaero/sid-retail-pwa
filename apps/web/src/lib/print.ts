import type { Customer, PaperWidth, SaleRecord, StoreProfile } from '../types';
import { money, number } from './money';
import { countDistinctTransactions, netSaleTotal } from './reports';

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

// A4 daily sales report — one section per faktur (oldest first, so it reads like a closing
// report) with a No/Nama barang/Satuan/Qty/Harga table, and one grand total for the whole day
// at the bottom. Separate from receiptHtml (58/80mm thermal roll) which prints a single sale.
export function dailySalesReportHtml(sales: SaleRecord[], dateLabel: string, storeName?: string): string {
  const ordered = [...sales].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const name = storeName || (import.meta.env.VITE_STORE_NAME as string | undefined) || 'SID Retail';
  const sections = ordered.map(sale => {
    const exchanges = sale.exchanges ?? [];
    const exchangeFor = (productId: string, unit: string) => exchanges.find(x => x.oldProductId === productId && x.oldUnit === unit);
    const rows = sale.lines.map((l, i) => {
      const ex = exchangeFor(l.productId, l.unit);
      const note = ex ? `<br><span class="ex-note">&#8644; Ditukar &rarr; ${escapeHtml(ex.newProductName)} (faktur ${escapeHtml(ex.newInvoice)})</span>` : '';
      return `<tr><td class="num">${i + 1}</td><td>${escapeHtml(l.productName)}${note}</td><td>${escapeHtml(l.unit)}</td><td class="num">${number.format(l.qty)}</td><td class="num">${money.format(l.price)}</td></tr>`;
    }).join('');
    const banner = exchanges.length
      ? `<p class="faktur-flag">&#8644; Faktur ini sudah ditukar &mdash; barang pengganti tercatat di ${exchanges.map(x => `faktur ${escapeHtml(x.newInvoice)}`).join(', ')}.</p>`
      : '';
    return `<section class="faktur"><p class="faktur-head">Faktur <strong>${escapeHtml(sale.invoice)}</strong> · ${new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · Kasir ${escapeHtml(sale.cashierName || '—')} · ${escapeHtml(sale.customerName || 'Pelanggan Umum')}</p>${banner}<table><colgroup><col class="col-no"><col class="col-name"><col class="col-unit"><col class="col-qty"><col class="col-price"></colgroup><thead><tr><th>No</th><th>Nama barang</th><th>Satuan</th><th class="num">Qty</th><th class="num">Harga</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
  const grandTotal = ordered.reduce((sum, s) => sum + netSaleTotal(s), 0);
  const transactionCount = countDistinctTransactions(ordered);
  return `<html><head><title>Laporan Transaksi Harian ${escapeHtml(dateLabel)}</title><style>
    @page{size:A4;margin:16mm}
    body{font:12px/1.4 Arial,sans-serif;color:#111}
    h1{font-size:18px;margin:0 0 2px}
    .sub{color:#555;margin:0 0 18px;font-size:12px}
    .faktur{margin-bottom:16px;break-inside:avoid}
    .faktur-head{font-size:11.5px;margin:0 0 4px;color:#333}
    .faktur-flag{font-size:11px;margin:0 0 6px;padding:4px 8px;background:#fff4e0;border:1px solid #e8c27a;border-radius:3px;color:#7a5300}
    table{width:100%;border-collapse:collapse;font-size:11.5px;table-layout:fixed}
    .col-no{width:6%}.col-name{width:44%}.col-unit{width:14%}.col-qty{width:12%}.col-price{width:24%}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;word-wrap:break-word}
    th{background:#f1f1f1}
    .num{text-align:right}
    .ex-note{font-size:10px;color:#7a5300}
    .grand{margin-top:10px;padding-top:10px;border-top:2px solid #111;text-align:right;font-size:14px;font-weight:bold}
  </style></head><body>
    <h1>${escapeHtml(name)}</h1>
    <p class="sub">Laporan Transaksi Harian &middot; ${escapeHtml(dateLabel)} &middot; ${transactionCount} transaksi</p>
    ${sections || '<p>Tidak ada transaksi.</p>'}
    <p class="grand">TOTAL KESELURUHAN: ${money.format(grandTotal)}</p>
  </body></html>`;
}

export function openDailySalesReportPopup(sales: SaleRecord[], dateLabel: string, storeName?: string, popup?: Window | null) {
  const win = popup ?? openBlankPreviewPopup();
  if (!win) throw new Error('Popup pratinjau diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
  const printButton = '<div style="text-align:center;margin-top:12px"><button onclick="window.print()" style="font:600 13px sans-serif;padding:9px 18px;border-radius:6px;border:1px solid #93c5fd;background:#eff6ff;cursor:pointer">Cetak</button></div>';
  win.document.write(dailySalesReportHtml(sales, dateLabel, storeName).replace('</body>', `${printButton}</body>`));
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
