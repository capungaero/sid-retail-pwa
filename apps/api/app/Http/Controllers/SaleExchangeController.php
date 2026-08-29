<?php
namespace App\Http\Controllers;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// "Tukar barang" — a customer who already paid decides not to keep an item and swaps it for a
// different one. The original sale is never mutated (audit trail intact); this creates a brand
// new sale for the replacement item and restocks the returned one, linked via app_sale_exchanges.
final class SaleExchangeController
{
    public function __invoke(Request $request, string $invoice): JsonResponse
    {
        $data = $request->validate([
            'oldProductId' => 'required|string', 'oldUnit' => 'required|string', 'oldQty' => 'required|numeric|gt:0',
            'newProductId' => 'required|string', 'newUnit' => 'required|string', 'newQty' => 'required|numeric|gt:0',
            'newPrice' => 'required|numeric|min:0', 'newDiscount' => 'nullable|numeric|min:0',
            'reason' => 'nullable|string|max:100',
            'paymentMethod' => 'required|string|max:32', 'paymentRef' => 'nullable|string|max:64',
            'idempotencyKey' => 'required|uuid',
        ]);
        $newDiscount = (float) ($data['newDiscount'] ?? 0);

        $idempotencyKey = $data['idempotencyKey'];
        $existing = DB::table('app_idempotency_keys')->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) return response()->json(['newInvoice' => $existing->invoice, 'total' => (float) $existing->total]);

        $method = DB::table('app_payment_methods')->where('code', $data['paymentMethod'])->where('active', true)->first();
        if (!$method) return response()->json(['message' => 'Metode pembayaran tidak valid atau nonaktif.'], 422);

        $saleTable = config('sid.sale.table'); $sc = config('sid.sale.columns');
        $itemTable = config('sid.sale_item.table'); $ic = config('sid.sale_item.columns');
        $productTable = config('sid.product.table'); $pc = config('sid.product.columns');
        $operator = $request->user()?->getKey();

        try {
            $result = DB::transaction(function () use ($invoice, $data, $newDiscount, $method, $idempotencyKey, $saleTable, $sc, $itemTable, $ic, $productTable, $pc, $operator) {
                $sale = DB::table($saleTable)->where($sc['id'], $invoice)->first();
                if (!$sale) throw ValidationException::withMessages(['invoice' => 'Transaksi asli tidak ditemukan.']);

                $oldLine = DB::table($itemTable)->where($ic['sale_id'], $invoice)
                    ->where($ic['product_code'], $data['oldProductId'])->where($ic['unit'], $data['oldUnit'])->first();
                if (!$oldLine) throw ValidationException::withMessages(['oldProductId' => 'Barang tidak ditemukan di transaksi ini.']);
                if ((float) $data['oldQty'] > (float) $oldLine->{$ic['qty']}) {
                    throw ValidationException::withMessages(['oldQty' => 'Jumlah tukar melebihi jumlah yang dibeli.']);
                }

                // Proportional: a partial-line exchange only credits its share of that line's discount.
                $oldUnitNet = ((float) $oldLine->{$ic['qty']} * (float) $oldLine->{$ic['price']} - (float) $oldLine->{$ic['discount_rupiah']}) / (float) $oldLine->{$ic['qty']};
                $oldLineValue = round($oldUnitNet * (float) $data['oldQty'], 2);

                $oldProduct = DB::table($productTable)->where($pc['id'], $data['oldProductId'])->lockForUpdate()->first();
                if (!$oldProduct) throw ValidationException::withMessages(['oldProductId' => 'Barang lama tidak ditemukan.']);
                DB::table($productTable)->where($pc['id'], $data['oldProductId'])->increment($pc['stock'], $data['oldQty']);

                $newProduct = DB::table($productTable)->where($pc['id'], $data['newProductId'])->lockForUpdate()->first();
                if (!$newProduct) throw ValidationException::withMessages(['newProductId' => 'Barang pengganti tidak ditemukan.']);
                if ((float) $newProduct->{$pc['stock']} < (float) $data['newQty']) {
                    throw ValidationException::withMessages(['newProductId' => "Stok {$newProduct->{$pc['name']}} tidak cukup."]);
                }
                DB::table($productTable)->where($pc['id'], $data['newProductId'])->decrement($pc['stock'], $data['newQty']);

                $newLineValue = round((float) $data['newQty'] * (float) $data['newPrice'] - $newDiscount, 2);
                $diff = round($newLineValue - $oldLineValue, 2);
                // The new sale is always recorded as fully settled — its "payment" is partly the
                // trade-in value of the returned item and partly the cash difference below, which
                // nets out to the new item's full price. app_sale_payments.amount is written as the
                // SIGNED diff (positive = kurang bayar collected, negative = kembalian handed back),
                // never clamped to zero — that negative leg is what lets a per-method cash recap
                // (SUM(amount) grouped by method) net out to the real cash retained, matching the
                // revenue reports below, which subtract old_line_value from the old invoice instead
                // of letting both invoices' full totals double-count the same physical item.
                $collected = $diff;

                $today = now()->toDateString();
                DB::table('app_invoice_counters')->insertOrIgnore(['counter_date' => $today, 'last_seq' => 0]);
                $counter = DB::table('app_invoice_counters')->where('counter_date', $today)->lockForUpdate()->first();
                $seq = $counter->last_seq + 1;
                DB::table('app_invoice_counters')->where('counter_date', $today)->update(['last_seq' => $seq]);
                $newInvoice = 'PWA-'.now()->format('dmy').'-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

                DB::table($saleTable)->insert([
                    $sc['id'] => $newInvoice, $sc['date'] => $today, $sc['customer_code'] => $sale->{$sc['customer_code']},
                    $sc['customer_name'] => $sale->{$sc['customer_name']},
                    $sc['subtotal'] => (float) $data['newQty'] * (float) $data['newPrice'], $sc['discount'] => $newDiscount,
                    $sc['total'] => $newLineValue, $sc['paid'] => $newLineValue, $sc['change'] => 0,
                    $sc['cashier'] => $operator, $sc['operator'] => $operator,
                    $sc['status'] => 'LUNAS', $sc['time'] => now()->format('H:i:s'), $sc['shift'] => '1',
                    $sc['kode_kas'] => $method->legacy_kas_code,
                ]);
                DB::table($itemTable)->insert([
                    $ic['sale_id'] => $newInvoice, $ic['line_no'] => 1, $ic['product_code'] => $data['newProductId'],
                    $ic['product_name'] => $newProduct->{$pc['name']}, $ic['unit'] => $data['newUnit'],
                    $ic['qty'] => $data['newQty'], $ic['price'] => $data['newPrice'], $ic['discount_rupiah'] => $newDiscount,
                    $ic['subtotal'] => $newLineValue, $ic['hpp'] => $newProduct->{$pc['cost']},
                ]);
                DB::table('app_sale_payments')->insert([
                    'sale_id' => $newInvoice, 'method_code' => $method->code, 'method_name' => $method->name,
                    'amount' => $collected, 'reference' => $data['paymentRef'] ?? null, 'created_at' => now(),
                ]);

                // Same trail the Retur screen writes for a sales return, so the swapped-out item
                // shows up in Kartu stok / mutasi stok like any other return.
                DB::table('app_stock_movements')->insert([
                    'id' => (string) Str::uuid(), 'product_id' => $data['oldProductId'], 'product_name' => $oldProduct->{$pc['name']},
                    'type' => 'sales-return', 'qty' => (float) $data['oldQty'], 'reference' => $invoice,
                    'note' => $data['reason'] ?? "Tukar ke {$newProduct->{$pc['name']}}", 'created_at' => now(),
                ]);

                DB::table('app_sale_exchanges')->insert([
                    'id' => (string) Str::uuid(), 'old_invoice' => $invoice, 'new_invoice' => $newInvoice,
                    'old_product_id' => $data['oldProductId'], 'old_product_name' => $oldProduct->{$pc['name']}, 'old_unit' => $data['oldUnit'],
                    'old_qty' => $data['oldQty'], 'old_line_value' => $oldLineValue,
                    'new_product_id' => $data['newProductId'], 'new_product_name' => $newProduct->{$pc['name']}, 'new_unit' => $data['newUnit'],
                    'new_qty' => $data['newQty'], 'new_line_value' => $newLineValue,
                    'diff_amount' => $diff, 'reason' => $data['reason'] ?? null, 'operator' => $operator, 'created_at' => now(),
                ]);

                DB::table('app_idempotency_keys')->insert(['idempotency_key' => $idempotencyKey, 'invoice' => $newInvoice, 'total' => $newLineValue, 'created_at' => now()]);

                return ['newInvoice' => $newInvoice, 'oldInvoice' => $invoice, 'total' => $newLineValue, 'diff' => $diff];
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                $winner = DB::table('app_idempotency_keys')->where('idempotency_key', $idempotencyKey)->first();
                if ($winner) return response()->json(['newInvoice' => $winner->invoice, 'total' => (float) $winner->total]);
            }
            throw $e;
        }

        return response()->json($result);
    }
}
