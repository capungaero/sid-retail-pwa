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
        $employeeTable = config('sid.auth.table'); $ec = config('sid.auth.columns');
        $productTable = config('sid.product.table'); $pc = config('sid.product.columns');

        $from = $request->query('from') ?: now()->subDays(90)->toDateString();
        $to = $request->query('to') ?: now()->toDateString();

        $sales = DB::table($saleTable)
            ->whereBetween($sc['date'], [$from, $to])
            ->orderByDesc($sc['date'])->orderByDesc($sc['id'])
            ->limit(2000)
            ->get([$sc['id'], $sc['date'], $sc['time'], $sc['customer_code'], $sc['customer_name'], $sc['total'], $sc['paid'], $sc['change'], $sc['cashier']]);

        if ($sales->isEmpty()) return response()->json([]);

        $ids = $sales->pluck($sc['id'])->all();
        $items = DB::table($itemTable)->whereIn($ic['sale_id'], $ids)
            ->get([$ic['sale_id'], $ic['product_code'], $ic['product_name'], $ic['unit'], $ic['qty'], $ic['price'], $ic['discount_rupiah']])
            ->groupBy($ic['sale_id']);

        // Cashier can be a legacy karyawan.kode OR an app_user_settings.id (uuid) — sales made by
        // an account created via Pengaturan > Pengguna store that uuid in $sc['cashier'] instead.
        // Look up both and merge; a karyawan match wins if a code somehow collided with a uuid.
        $cashierCodes = $sales->pluck($sc['cashier'])->filter()->unique()->values()->all();
        $cashiers = DB::table($employeeTable)->whereIn($ec['id'], $cashierCodes)->pluck($ec['name'], $ec['id']);
        $appUserNames = DB::table('app_user_settings')->whereIn('id', $cashierCodes)->pluck('name', 'id');
        $cashiers = $appUserNames->merge($cashiers);

        // Current stock per product referenced in this page of sales, used to show the detail
        // view's "sisa stok" / "stok awal". stockBefore is a projection (current stock + qty on
        // this line) rather than a true historical snapshot — accurate only if nothing else has
        // moved that product's stock since this sale, which is the common case for the most
        // recent transactions this view is used for, but can drift for older ones.
        $productIds = $items->flatten()->pluck($ic['product_code'])->unique()->values()->all();
        $stocks = DB::table($productTable)->whereIn($pc['id'], $productIds)->pluck($pc['stock'], $pc['id']);

        // One payment row per sale in v1 (see app_sale_payments migration) — method_name is
        // denormalized there at checkout time, so this is stable even if the method is later
        // renamed/deleted in Pengaturan.
        $methodNames = DB::table('app_sale_payments')->whereIn('sale_id', $ids)->pluck('method_name', 'sale_id');

        $result = $sales->map(function ($sale) use ($sc, $ic, $items, $cashiers, $stocks, $methodNames) {
            $lines = ($items->get($sale->{$sc['id']}) ?? collect())->map(function ($line) use ($ic, $stocks) {
                $currentStock = (float) ($stocks->get($line->{$ic['product_code']}) ?? 0);
                $qty = (float) $line->{$ic['qty']};
                return [
                    'productId' => (string) $line->{$ic['product_code']},
                    'productName' => (string) $line->{$ic['product_name']},
                    'unit' => (string) $line->{$ic['unit']},
                    'qty' => $qty,
                    'price' => (float) $line->{$ic['price']},
                    'discount' => (float) $line->{$ic['discount_rupiah']},
                    'stockBefore' => $currentStock + $qty,
                    'stockAfter' => $currentStock,
                ];
            })->values();
            $createdAt = trim(($sale->{$sc['date']} ?? '') . 'T' . ($sale->{$sc['time']} ?? '00:00:00'));
            return [
                'id' => (string) $sale->{$sc['id']},
                'invoice' => (string) $sale->{$sc['id']},
                'customerId' => (string) ($sale->{$sc['customer_code']} ?? ''),
                'customerName' => (string) ($sale->{$sc['customer_name']} ?? 'Pelanggan Umum'),
                'cashierName' => $sale->{$sc['cashier']} ? (string) ($cashiers->get($sale->{$sc['cashier']}) ?? $sale->{$sc['cashier']}) : null,
                'methodName' => $methodNames->get($sale->{$sc['id']}),
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
        $data = $request->validate(['customerId'=>'required|string|max:64','paid'=>'required|numeric|min:0','idempotencyKey'=>'required|uuid','paymentMethod'=>'required|string|max:32','paymentRef'=>'nullable|string|max:64','lines'=>'required|array|min:1','lines.*.productId'=>'required|string','lines.*.unit'=>'required|string','lines.*.qty'=>'required|numeric|gt:0','lines.*.price'=>'required|numeric|min:0','lines.*.discount'=>'required|numeric|min:0']);

        // Payment method must be an ACTIVE, configured method (app_payment_methods.code). Looked
        // up before the transaction so an invalid method fails fast without touching stock/kas.
        $method = DB::table('app_payment_methods')->where('code', $data['paymentMethod'])->where('active', true)->first();
        if (!$method) return response()->json(['message' => 'Metode pembayaran tidak valid atau nonaktif.'], 422);

        $idempotencyKey = $data['idempotencyKey'];
        $existing = DB::table('app_idempotency_keys')->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) return response()->json(['invoice'=>$existing->invoice,'total'=>(float)$existing->total]);

        $subtotal = 0; $discountTotal = 0;
        foreach ($data['lines'] as $line) { $subtotal += $line['qty'] * $line['price']; $discountTotal += $line['discount']; }
        $total = $subtotal - $discountTotal;

        // paid/change are decided SERVER-SIDE by method type — never trusted from the client.
        // Cash: cashier tenders >= total, change = tendered - total (underpayment rejected).
        // Non-cash (QRIS/transfer/card): the transaction is settled for the exact total by the
        // payment rail, so paid = total and change = 0 regardless of whatever `paid` the client
        // sent — otherwise a client could record a phantom change on a non-cash sale.
        $isCash = ($method->type === 'cash');
        if ($isCash) {
            if ($data['paid'] < $total) {
                return response()->json(['message' => 'Jumlah bayar kurang dari total belanja.'], 422);
            }
            $paid = (float) $data['paid'];
            $change = max(0.0, $paid - $total);
        } else {
            $paid = (float) $total;
            $change = 0.0;
        }

        $productTable = config('sid.product.table'); $pc = config('sid.product.columns');
        $saleTable = config('sid.sale.table'); $sc = config('sid.sale.columns');
        $itemTable = config('sid.sale_item.table'); $ic = config('sid.sale_item.columns');
        $customerTable = config('sid.customer.table'); $cc = config('sid.customer.columns');
        $cashier = $request->user()?->getKey();

        try {
            $result = DB::transaction(function () use ($data, $method, $idempotencyKey, $subtotal, $discountTotal, $total, $paid, $change, $productTable, $pc, $saleTable, $sc, $itemTable, $ic, $customerTable, $cc, $cashier) {
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
                    $sc['paid'] => $paid, $sc['change'] => $change,
                    $sc['cashier'] => $cashier, $sc['operator'] => $cashier,
                    $sc['status'] => 'LUNAS', $sc['time'] => now()->format('H:i:s'), $sc['shift'] => '1',
                    // Legacy-app compatibility: which kas account received the money. NULL when
                    // the chosen method has no mapped legacy_kas_code (e.g. QRIS/transfer).
                    $sc['kode_kas'] => $method->legacy_kas_code,
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

                // One payment row per sale for v1 (amount = full total). Written INSIDE this
                // transaction so it is atomic with the sale/stock rows and rolls back together
                // on the idempotency-key violation below — a replayed request never double-inserts.
                // method_name is denormalized so the recap stays stable if the method is later
                // renamed/deleted. Multi-row-per-sale capable (see app_sale_payments migration).
                DB::table('app_sale_payments')->insert([
                    'sale_id' => $invoice, 'method_code' => $method->code, 'method_name' => $method->name,
                    'amount' => $total, 'reference' => $data['paymentRef'] ?? null, 'created_at' => now(),
                ]);

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
