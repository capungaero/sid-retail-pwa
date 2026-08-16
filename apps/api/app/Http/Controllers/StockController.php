<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyStockRepository;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class StockController
{
    public function movements(Request $request, LegacyStockRepository $stock): JsonResponse
    { return response()->json($stock->movements((string)$request->query('productId', ''))); }

    public function adjust(Request $request): JsonResponse
    {
        $data = $request->validate([
            'productId' => 'required|string|max:25',
            'qty' => 'required|numeric|not_in:0',
            'reason' => 'required|string|max:25',
            'note' => 'nullable|string|max:200',
        ]);

        $productTable = config('sid.product.table'); $prc = config('sid.product.columns');
        $correctionTable = config('sid.stock_correction.table'); $cc = config('sid.stock_correction.columns');
        $itemTable = config('sid.stock_correction_item.table'); $ic = config('sid.stock_correction_item.columns');
        $operator = $request->user()?->getKey();
        $idempotencyKey = $request->header('Idempotency-Key');

        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        try {
            $movement = DB::transaction(function () use ($data, $productTable, $prc, $correctionTable, $cc, $itemTable, $ic, $operator, $idempotencyKey) {
                $product = DB::table($productTable)->where($prc['id'], $data['productId'])->lockForUpdate()->first();
                if (!$product) throw ValidationException::withMessages(['productId' => 'Barang tidak ditemukan']);

                $prevStock = (float)$product->{$prc['stock']};
                $newStock = $prevStock + $data['qty'];
                if ($newStock < 0) throw ValidationException::withMessages(['qty' => 'Stok tidak boleh negatif']);

                $code = 'ADJ-'.now()->format('ymdHis').'-'.random_int(100, 999);
                DB::table($correctionTable)->insert([
                    $cc['id'] => $code, $cc['date'] => now()->toDateString(), $cc['total'] => $data['qty'],
                    $cc['operator'] => $operator, $cc['stock_location'] => 'toko', $cc['kind'] => 'KOREKSI STOK',
                ]);
                DB::table($itemTable)->insert([
                    $ic['correction_id'] => $code, $ic['product_code'] => $data['productId'], $ic['product_name'] => $product->{$prc['name']},
                    $ic['unit'] => $product->{$prc['unit']}, $ic['prev_stock'] => $prevStock, $ic['new_stock'] => $newStock,
                    $ic['reason'] => $data['reason'], $ic['diff'] => $data['qty'], $ic['hpp'] => $product->{$prc['cost']},
                ]);
                DB::table($productTable)->where($prc['id'], $data['productId'])->update([$prc['stock'] => $newStock]);

                $movementId = (string) Str::uuid();
                $note = ($data['note'] ?? null) ? "{$data['reason']} — {$data['note']}" : $data['reason'];
                DB::table('app_stock_movements')->insert([
                    'id' => $movementId, 'product_id' => $data['productId'], 'product_name' => $product->{$prc['name']},
                    'type' => 'adjustment', 'qty' => $data['qty'], 'reference' => $code, 'note' => $note, 'created_at' => now(),
                ]);

                $result = [
                    'id' => $movementId, 'productId' => $data['productId'], 'productName' => $product->{$prc['name']},
                    'type' => 'adjustment', 'qty' => (float)$data['qty'], 'reference' => $code, 'note' => $note,
                    'createdAt' => now()->toJSON(),
                ];
                Idempotency::store($idempotencyKey, 'stock-adjustments', $result);
                return $result;
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner);
            throw $e;
        }

        return response()->json($movement);
    }
}
