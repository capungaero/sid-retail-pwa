<?php
namespace App\Http\Controllers;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ReturnController
{
    public function __invoke(Request $request): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        $data = $request->validate([
            'reference' => 'required|string|max:25',
            'kind' => 'required|in:purchase,sales',
            'refLabel' => 'required|string|max:100',
            'reason' => 'required|string|max:100',
            'lines' => 'required|array|min:1',
            'lines.*.productId' => 'required|string',
            'lines.*.productName' => 'required|string',
            'lines.*.unit' => 'required|string',
            'lines.*.qty' => 'required|numeric|gt:0',
            'lines.*.price' => 'required|numeric|min:0',
        ]);

        $productTable = config('sid.product.table'); $prc = config('sid.product.columns');
        // Purchase return = stock leaves the store (goods sent back to supplier): decrement.
        // Sales return = stock comes back from a customer: increment.
        $sign = $data['kind'] === 'purchase' ? -1 : 1;

        try {
            $doc = DB::transaction(function () use ($data, $productTable, $prc, $sign, $idempotencyKey) {
                $id = (string) Str::uuid();
                DB::table('app_return_documents')->insert([
                    'id' => $id, 'reference' => $data['reference'], 'kind' => $data['kind'],
                    'ref_label' => $data['refLabel'], 'reason' => $data['reason'], 'created_at' => now(),
                ]);

                foreach ($data['lines'] as $line) {
                    $product = DB::table($productTable)->where($prc['id'], $line['productId'])->lockForUpdate()->first();
                    if (!$product) throw ValidationException::withMessages(['lines' => "Barang {$line['productId']} tidak ditemukan"]);
                    $signedQty = $sign * $line['qty'];
                    $newStock = (float)$product->{$prc['stock']} + $signedQty;
                    if ($newStock < 0) throw ValidationException::withMessages(['lines' => "Stok {$product->{$prc['name']}} tidak cukup untuk retur"]);

                    DB::table($productTable)->where($prc['id'], $line['productId'])->update([$prc['stock'] => $newStock]);
                    DB::table('app_return_lines')->insert([
                        'return_document_id' => $id, 'product_id' => $line['productId'], 'product_name' => $line['productName'],
                        'unit' => $line['unit'], 'qty' => $line['qty'], 'price' => $line['price'],
                    ]);
                    DB::table('app_stock_movements')->insert([
                        'id' => (string) Str::uuid(), 'product_id' => $line['productId'], 'product_name' => $line['productName'],
                        'type' => $data['kind'] === 'purchase' ? 'purchase-return' : 'sales-return', 'qty' => $signedQty,
                        'reference' => $data['reference'], 'note' => $data['reason'], 'created_at' => now(),
                    ]);
                }

                $result = [
                    'id' => $id, 'reference' => $data['reference'], 'kind' => $data['kind'], 'refLabel' => $data['refLabel'],
                    'lines' => $data['lines'], 'createdAt' => now()->toJSON(), 'reason' => $data['reason'],
                ];
                Idempotency::store($idempotencyKey, 'returns', $result);
                return $result;
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner);
            throw $e;
        }

        return response()->json($doc);
    }
}
