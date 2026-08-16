<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyPurchaseRepository;
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
        $key = $id ?? $data['reference'];
        $operator = $request->user()?->getKey();

        DB::transaction(function () use ($data, $key, $purchaseTable, $pc, $itemTable, $ic, $operator): void {
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
        });

        return response()->json((new LegacyPurchaseRepository())->find($key));
    }

    public function receive(Request $request, string $poId, LegacyPurchaseRepository $purchases): JsonResponse
    {
        $data = $request->validate([
            'lines' => 'required|array|min:1',
            'lines.*.productId' => 'required|string',
            'lines.*.qty' => 'required|numeric|min:0',
        ]);

        $purchaseTable = config('sid.purchase.table'); $pc = config('sid.purchase.columns');
        $itemTable = config('sid.purchase_item.table'); $ic = config('sid.purchase_item.columns');
        $productTable = config('sid.product.table'); $prc = config('sid.product.columns');

        try {
            DB::transaction(function () use ($data, $poId, $purchaseTable, $pc, $itemTable, $ic, $productTable, $prc): void {
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
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        }

        return response()->json($purchases->find($poId));
    }
}
