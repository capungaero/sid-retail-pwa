import type { PaymentPayload } from '../types';
import type { Receipt } from './print';

export async function submitCheckout(
  payload: PaymentPayload,
  receipt: Omit<Receipt, 'invoice'>,
  dependencies: {
    save: (payload: PaymentPayload) => Promise<{ invoice: string; total: number }>;
    print: (receipt: Receipt) => Promise<void>;
  }
) {
  const sale = await dependencies.save(payload);
  try {
    await dependencies.print({ ...receipt, invoice: sale.invoice });
    return { invoice: sale.invoice, printFailed: false };
  } catch {
    return { invoice: sale.invoice, printFailed: true };
  }
}
