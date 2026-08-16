import { describe, expect, it, vi } from 'vitest';
import { submitCheckout } from './checkout';
import { demoCustomers, demoProducts } from '../data';

const line = { product: demoProducts[0], unit: demoProducts[0].units[0], qty: 1, discount: 0 };
const payload = { customerId: 'general', lines: [{ productId: '1', unit: 'Botol', qty: 1, price: 3500, discount: 0 }], paid: 5000, idempotencyKey: '4503e3aa-6f3e-44fb-ae87-cac7dfc5d231' };

describe('checkout boundary', () => {
  it('does not resubmit a saved sale when printing fails', async () => {
    const save = vi.fn().mockResolvedValue({ invoice: 'INV-1', total: 3500 });
    const result = await submitCheckout(payload, { customer: demoCustomers[0], lines: [line], paid: 5000, total: 3500 }, { save, print: vi.fn().mockRejectedValue(new Error('printer offline')) });
    expect(save).toHaveBeenCalledTimes(1); expect(result).toEqual({ invoice: 'INV-1', printFailed: true });
  });
  it('passes the stable draft idempotency key unchanged', async () => {
    const save = vi.fn().mockResolvedValue({ invoice: 'INV-1', total: 3500 });
    await submitCheckout(payload, { customer: demoCustomers[0], lines: [line], paid: 5000, total: 3500 }, { save, print: vi.fn().mockResolvedValue(undefined) });
    expect(save.mock.calls[0][0].idempotencyKey).toBe(payload.idempotencyKey);
  });
});
