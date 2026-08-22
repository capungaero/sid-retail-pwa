<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyPurchaseRepository;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class PurchaseOrderController
{
    public function index(Request $request, LegacyPurchaseRepository $purchases): JsonResponse
    { return response()->json($purchases->search((string)$request->query('search', ''))); }

    public function store(Request $request): JsonResponse
    { return $this->persist($request, null); }

    public function update(Request $request, string $id): JsonResponse
    { return $this->persist($request, $id); }

    private function persist(Request $request, ?string $id): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        $data = $request->validate([
            'reference' => 'required|string|max:25',
            'supplierId' => 'required|string|max:15',
            'status' => 'required|in:draft,open',
            'note' => 'nullable|string|max:50',
            'lines' => 'required|array|min:1',
            'lines.*.productId' => 'required|string',
            'lines.*.productName' => 'required|string',
            'lines.*.unit' => 'required|string',
            'lines.*.qty' => 'required|numeric|gt:0',
            'lines.*.cost' => 'required|numeric|min:0',
            'lines.*.receivedQty' => 'nullable|numeric|min:0',
        ]);

        $purchaseTable = config('sid.purchase.table'); $pc = config('sid.purchase.columns');
        $itemTable = config('sid.purchase_item.table'); $ic = config('sid.purchase_item.columns');
        $operator = $request->user()?->getKey();

        try {
            $result = DB::transaction(function () use ($data, $id, $purchaseTable, $pc, $itemTable, $ic, $operator, $idempotencyKey) {
                // Updates (id present, from a prior save) reuse that legacy key. New POs never
                // adopt the client-generated 'reference' label as the legacy primary key — the
                // real 200 pre-existing POs are all 'R21-DDMMYY###', so a server-generated,
                // similarly-formatted code keeps new rows consistent instead of storing a raw
                // client UUID or free-text label as 'kode'.
                $key = $id ?? $this->nextCode($purchaseTable, $pc);

                $total = collect($data['lines'])->sum(fn ($l) => $l['qty'] * $l['cost']);
                DB::table($purchaseTable)->updateOrInsert([$pc['id'] => $key], [
                    $pc['date'] => now()->toDateString(),
                    $pc['supplier_code'] => $data['supplierId'],
                    $pc['note'] => $data['note'] ?? '',
                    $pc['total'] => $total,
                    $pc['po'] => $data['status'] === 'draft' ? 'True' : 'False',
                    $pc['receive'] => 'False',
                    $pc['operator'] => $operator,
                    $pc['stock_location'] => 'toko',
                ]);

                // Draft/open POs are fully replaced on save (no partial receipt possible before
                // status leaves 'draft'/'open' with zero received qty), so it's safe to wipe and
                // reinsert lines rather than diffing them.
                DB::table($itemTable)->where($ic['purchase_id'], $key)->delete();
                foreach (array_values($data['lines']) as $i => $line) {
                    DB::table($itemTable)->insert([
                        $ic['purchase_id'] => $key, $ic['line_no'] => $i + 1, $ic['product_code'] => $line['productId'],
                        $ic['product_name'] => $line['productName'], $ic['unit'] => $line['unit'], $ic['qty'] => $line['qty'],
                        $ic['cost'] => $line['cost'], $ic['price'] => $line['cost'], $ic['subtotal'] => $line['qty'] * $line['cost'],
                        $ic['received_qty'] => $line['receivedQty'] ?? 0,
                    ]);
                }

                $result = (new LegacyPurchaseRepository())->find($key);
                Idempotency::store($idempotencyKey, 'purchase-orders', $result);
                return $result;
            });
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner);
            throw $e;
        }

        return response()->json($result);
    }

    // 'PO-DDMMYY###': same shape as the legacy 'R21-DDMMYY###' codes so new rows sort and read
    // consistently with the pre-existing 200 POs, but with a distinct prefix so a generated code
    // can never collide with (or be mistaken for) a legacy register-assigned one. The daily
    // sequence counts only same-day 'PO-' rows, mirroring how the legacy sequence resets per day.
    private function nextCode(string $purchaseTable, array $pc): string
    {
        $datePart = now()->format('dmy');
        $prefix = "PO-{$datePart}";
        $count = DB::table($purchaseTable)->where($pc['id'], 'like', "{$prefix}%")->count();
        return $prefix.str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);
    }

    public function receive(Request $request, string $poId, LegacyPurchaseRepository $purchases): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        $data = $request->validate([
            'lines' => 'required|array|min:1',
            'lines.*.productId' => 'required|string',
            'lines.*.qty' => 'required|numeric|min:0',
        ]);

        $purchaseTable = config('sid.purchase.table'); $pc = config('sid.purchase.columns');
        $itemTable = config('sid.purchase_item.table'); $ic = config('sid.purchase_item.columns');
        $productTable = config('sid.product.table'); $prc = config('sid.product.columns');

        try {
            $result = DB::transaction(function () use ($data, $poId, $purchaseTable, $pc, $itemTable, $ic, $productTable, $prc, $idempotencyKey, $purchases) {
                $po = DB::table($purchaseTable)->where($pc['id'], $poId)->lockForUpdate()->first();
                if (!$po) throw ValidationException::withMessages(['poId' => 'PO tidak ditemukan']);
                if (strtolower((string)$po->{$pc['receive']}) === 'true') throw ValidationException::withMessages(['poId' => 'PO sudah diterima penuh']);

                foreach ($data['lines'] as $line) {
                    if ($line['qty'] <= 0) continue;
                    $item = DB::table($itemTable)->where($ic['purchase_id'], $poId)->where($ic['product_code'], $line['productId'])->lockForUpdate()->first();
                    if (!$item) throw ValidationException::withMessages(['lines' => "Barang {$line['productId']} tidak ada pada PO ini"]);
                    $remaining = (float)$item->{$ic['qty']} - (float)$item->{$ic['received_qty']};
                    // Idempotency guard: never let a line's received qty exceed its ordered qty,
                    // so the same receipt can't be double-applied.
                    if ($line['qty'] > $remaining + 0.0001) throw ValidationException::withMessages(['lines' => "Jumlah terima untuk {$line['productId']} melebihi sisa pesanan"]);

                    $product = DB::table($productTable)->where($prc['id'], $line['productId'])->lockForUpdate()->first();
                    if (!$product) throw ValidationException::withMessages(['lines' => "Barang {$line['productId']} tidak ditemukan"]);
                    DB::table($productTable)->where($prc['id'], $line['productId'])->increment($prc['stock'], $line['qty']);
                    DB::table($itemTable)->where($ic['purchase_id'], $poId)->where($ic['product_code'], $line['productId'])->increment($ic['received_qty'], $line['qty']);

                    // Existing stock adopts the new purchase price on receipt (no weighted
                    // average with the old cost) — already-recorded sales are untouched because
                    // itempenjualan snapshots its own price/hpp per line at sale time, so this
                    // update can never rewrite history. Selling price is rescaled by the old
                    // markup ratio (newCost * oldPrice/oldCost) to preserve the margin percentage;
                    // if there was no old cost to derive a ratio from, only cost is updated.
                    $newCost = (float)($item->{$ic['cost']} ?? 0);
                    $oldCost = (float)$product->{$prc['cost']};
                    if ($newCost > 0 && abs($newCost - $oldCost) > 0.0001) {
                        $priceUpdate = [$prc['cost'] => $newCost];
                        if ($oldCost > 0) {
                            $oldPrice = (float)$product->{$prc['price']};
                            $priceUpdate[$prc['price']] = round($newCost * ($oldPrice / $oldCost));
                        }
                        DB::table($productTable)->where($prc['id'], $line['productId'])->update($priceUpdate);
                    }

                    DB::table('app_stock_movements')->insert([
                        'id' => (string) Str::uuid(), 'product_id' => $line['productId'], 'product_name' => $item->{$ic['product_name']},
                        'type' => 'purchase-receipt', 'qty' => $line['qty'], 'reference' => $poId, 'note' => null, 'created_at' => now(),
                    ]);
                }

                $lines = DB::table($itemTable)->where($ic['purchase_id'], $poId)->get();
                $fullyReceived = $lines->every(fn ($l) => (float)$l->{$ic['received_qty']} >= (float)$l->{$ic['qty']} - 0.0001);
                DB::table($purchaseTable)->where($pc['id'], $poId)->update([
                    $pc['po'] => 'False',
                    $pc['receive'] => $fullyReceived ? 'True' : 'False',
                ]);

                $result = $purchases->find($poId);
                Idempotency::store($idempotencyKey, 'purchase-orders-receive', $result);
                return $result;
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner);
            throw $e;
        }

        return response()->json($result);
    }
}
