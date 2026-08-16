import type { POStatus, PurchaseLine, ReturnKind } from '../types';

// Applies received quantities to PO lines, capping each line at its ordered qty.
export function applyReceipt(lines: PurchaseLine[], receipt: { productId: string; qty: number }[]): PurchaseLine[] {
  return lines.map(line => {
    const match = receipt.find(r => r.productId === line.productId);
    if (!match || match.qty <= 0) return line;
    return { ...line, receivedQty: Math.min(line.qty, line.receivedQty + match.qty) };
  });
}

// Derives PO status from line receipt progress: fully received lines close the PO, otherwise it stays open.
export function poStatusAfterReceipt(lines: PurchaseLine[]): POStatus {
  return lines.every(line => line.receivedQty >= line.qty) ? 'received' : 'open';
}

// Purchase returns leave stock (back to supplier); sales returns bring stock back in.
export function signedReturnQty(kind: ReturnKind, qty: number): number {
  return kind === 'purchase' ? -Math.abs(qty) : Math.abs(qty);
}
