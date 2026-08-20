<?php
namespace App\Http\Controllers;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class SaleController
{
    // Reports (Laporan) needs a real read path over completed sales; the legacy dataset
    // has 30k+ rows, so this defaults to the last 90 days (or an explicit ?from=&to=
    // yyyy-mm-dd range) rather than dumping the whole table on every page load.
    public function index(Request $request): JsonResponse
    {
        $saleTable = config('sid.sale.table'); $sc = config('sid.sale.columns');
        $itemTable = config('sid.sale_item.table'); $ic = config('sid.sale_item.columns');

        $from = $request->query('from') ?: now()->subDays(90)->toDateString();
        $to = $request->query('to') ?: now()->toDateString();

        $sales = DB::table($saleTable)
            ->whereBetween($sc['date'], [$from, $to])
            ->orderByDesc($sc['date'])->orderByDesc($sc['id'])
            ->limit(2000)
            ->get([$sc['id'], $sc['date'], $sc['time'], $sc['customer_code'], $sc['customer_name'], $sc['total'], $sc['paid'], $sc['change']]);

        if ($sales->isEmpty()) return response()->json([]);

        $ids = $sales->pluck($sc['id'])->all();
        $items = DB::table($itemTable)->whereIn($ic['sale_id'], $ids)
            ->get([$ic['sale_id'], $ic['product_code'], $ic['product_name'], $ic['unit'], $ic['qty'], $ic['price'], $ic['discount_rupiah']])
            ->groupBy($ic['sale_id']);

        $result = $sales->map(function ($sale) use ($sc, $ic, $items) {
            $lines = ($items->get($sale->{$sc['id']}) ?? collect())->map(fn ($line) => [
                'productId' => (string) $line->{$ic['product_code']},
                'productName' => (string) $line->{$ic['product_name']},
                'unit' => (string) $line->{$ic['unit']},
                'qty' => (float) $line->{$ic['qty']},
                'price' => (float) $line->{$ic['price']},
                'discount' => (float) $line->{$ic['discount_rupiah']},
            ])->values();
            $createdAt = trim(($sale->{$sc['date']} ?? '') . 'T' . ($sale->{$sc['time']} ?? '00:00:00'));
            return [
                'id' => (string) $sale->{$sc['id']},
                'invoice' => (string) $sale->{$sc['id']},
                'customerId' => (string) ($sale->{$sc['customer_code']} ?? ''),
                'customerName' => (string) ($sale->{$sc['customer_name']} ?? 'Pelanggan Umum'),
                'lines' => $lines,
                'total' => (float) $sale->{$sc['total']},
                'paid' => (float) $sale->{$sc['paid']},
                'change' => (float) $sale->{$sc['change']},
                'createdAt' => $createdAt,
            ];
        })->values();

        return response()->json($result);
    }

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['customerId'=>'required|string|max:64','paid'=>'required|numeric|min:0','idempotencyKey'=>'required|uuid','lines'=>'required|array|min:1','lines.*.productId'=>'required|string','lines.*.unit'=>'required|string','lines.*.qty'=>'required|numeric|gt:0','lines.*.price'=>'required|numeric|min:0','lines.*.discount'=>'required|numeric|min:0']);

        $idempotencyKey = $data['idempotencyKey'];
        $existing = DB::table('app_idempotency_keys')->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) return response()->json(['invoice'=>$existing->invoice,'total'=>(float)$existing->total]);

        $subtotal = 0; $discountTotal = 0;
        foreach ($data['lines'] as $line) { $subtotal += $line['qty'] * $line['price']; $discountTotal += $line['discount']; }
        $total = $subtotal - $discountTotal;
        // No receivable (piutang) support yet — reject underpayment rather than silently
        // recording a partially-paid sale as LUNAS (fully paid). See config('sid.sale.*').
        if ($data['paid'] < $total) {
            return response()->json(['message' => 'Jumlah bayar kurang dari total belanja.'], 422);
        }

        $productTable = config('sid.product.table'); $pc = config('sid.product.columns');
        $saleTable = config('sid.sale.table'); $sc = config('sid.sale.columns');
        $itemTable = config('sid.sale_item.table'); $ic = config('sid.sale_item.columns');
        $customerTable = config('sid.customer.table'); $cc = config('sid.customer.columns');
        $cashier = $request->user()?->getKey();

        try {
            $result = DB::transaction(function () use ($data, $idempotencyKey, $subtotal, $discountTotal, $total, $productTable, $pc, $saleTable, $sc, $itemTable, $ic, $customerTable, $cc, $cashier) {
                // Lock every line's product row once; the lock is held for the whole transaction.
                $products = [];
                foreach ($data['lines'] as $line) {
                    $product = DB::table($productTable)->where($pc['id'], $line['productId'])->lockForUpdate()->first();
                    if (!$product) throw ValidationException::withMessages(['lines' => "Barang {$line['productId']} tidak ditemukan"]);
                    if ((float)$product->{$pc['stock']} < (float)$line['qty']) throw ValidationException::withMessages(['lines' => "Stok {$product->{$pc['name']}} tidak cukup"]);
                    $products[$line['productId']] = $product;
                }

                // Atomic, per-day invoice sequence — locked row prevents duplicate numbers under concurrent checkouts.
                $today = now()->toDateString();
                DB::table('app_invoice_counters')->insertOrIgnore(['counter_date' => $today, 'last_seq' => 0]);
                $counter = DB::table('app_invoice_counters')->where('counter_date', $today)->lockForUpdate()->first();
                $seq = $counter->last_seq + 1;
                DB::table('app_invoice_counters')->where('counter_date', $today)->update(['last_seq' => $seq]);
                $invoice = 'PWA-'.now()->format('dmy').'-'.str_pad((string)$seq, 4, '0', STR_PAD_LEFT);

                $customer = DB::table($customerTable)->where($cc['id'], $data['customerId'])->first();

                DB::table($saleTable)->insert([
                    $sc['id'] => $invoice, $sc['date'] => $today, $sc['customer_code'] => $data['customerId'],
                    $sc['customer_name'] => $customer->{$cc['name']} ?? 'Pelanggan Umum',
                    $sc['subtotal'] => $subtotal, $sc['discount'] => $discountTotal, $sc['total'] => $total,
                    $sc['paid'] => $data['paid'], $sc['change'] => max(0, $data['paid'] - $total),
                    $sc['cashier'] => $cashier, $sc['operator'] => $cashier,
                    $sc['status'] => 'LUNAS', $sc['time'] => now()->format('H:i:s'), $sc['shift'] => '1',
                ]);

                foreach (array_values($data['lines']) as $i => $line) {
                    $product = $products[$line['productId']];
                    $lineSubtotal = $line['qty'] * $line['price'] - $line['discount'];
                    DB::table($itemTable)->insert([
                        $ic['sale_id'] => $invoice, $ic['line_no'] => $i + 1, $ic['product_code'] => $line['productId'],
                        $ic['product_name'] => $product->{$pc['name']}, $ic['unit'] => $line['unit'],
                        $ic['qty'] => $line['qty'], $ic['price'] => $line['price'], $ic['discount_rupiah'] => $line['discount'],
                        $ic['subtotal'] => $lineSubtotal, $ic['hpp'] => $product->{$pc['cost']},
                    ]);
                    DB::table($productTable)->where($pc['id'], $line['productId'])->decrement($pc['stock'], $line['qty']);
                }

                // Unique PK on idempotency_key: if a concurrent duplicate request already committed
                // (raced past the pre-check above), this insert throws and the whole transaction —
                // including the sale/item rows and stock decrement just written — rolls back.
                DB::table('app_idempotency_keys')->insert(['idempotency_key' => $idempotencyKey, 'invoice' => $invoice, 'total' => $total, 'created_at' => now()]);
                return ['invoice' => $invoice, 'total' => (float)$total];
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                // Lost the idempotency race: another request with the same key already won and
                // committed. Return its result instead of surfacing the constraint violation.
                $winner = DB::table('app_idempotency_keys')->where('idempotency_key', $idempotencyKey)->first();
                if ($winner) return response()->json(['invoice' => $winner->invoice, 'total' => (float)$winner->total]);
            }
            throw $e;
        }

        return response()->json($result);
    }
}
