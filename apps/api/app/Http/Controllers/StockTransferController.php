<?php
namespace App\Http\Controllers;

use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// One inter-branch transfer = two branch-local documents sharing a reference: this branch only
// ever books its OWN side ('out' lowers stock, 'in' raises it); the HQ dashboard orchestrates
// the pair across two API deployments. Both legs are doubly idempotent — Idempotency-Key header
// plus unique(reference, direction) — so HQ can retry a half-landed transfer blindly.
final class StockTransferController
{
    public function index(): JsonResponse
    {
        $transfers = DB::table('app_stock_transfers')->orderByDesc('created_at')->limit(200)->get();
        $lines = DB::table('app_stock_transfer_lines')
            ->whereIn('transfer_id', $transfers->pluck('id')->all())
            ->get()->groupBy('transfer_id');
        return response()->json($transfers->map(fn ($t) => $this->mapDoc($t, $lines->get($t->id) ?? collect()))->values());
    }

    public function out(Request $request): JsonResponse
    {
        return $this->book($request, 'out');
    }

    public function in(Request $request): JsonResponse
    {
        return $this->book($request, 'in');
    }

    private function book(Request $request, string $direction): JsonResponse
    {
        $data = $request->validate([
            // Max 25 so the reference also fits app_stock_movements.reference verbatim.
            'reference' => 'required|string|max:25',
            'counterpartBranchCode' => 'required|string|max:20',
            'counterpartBranchName' => 'required|string|max:50',
            'note' => 'nullable|string|max:200',
            'lines' => 'required|array|min:1',
            'lines.*.productId' => 'required|string|max:25',
            'lines.*.productName' => 'required|string|max:50',
            'lines.*.unit' => 'nullable|string|max:25',
            'lines.*.qty' => 'required|numeric|gt:0',
        ]);

        $productTable = config('sid.product.table'); $prc = config('sid.product.columns');
        $operator = $request->user()?->getKey();
        $idempotencyKey = $request->header('Idempotency-Key');

        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        try {
            $doc = DB::transaction(function () use ($data, $direction, $productTable, $prc, $operator, $idempotencyKey) {
                $transferId = (string) Str::uuid();
                $movementRows = []; $lineRows = [];

                foreach ($data['lines'] as $line) {
                    $product = DB::table($productTable)->where($prc['id'], $line['productId'])->lockForUpdate()->first();
                    if (!$product) {
                        throw ValidationException::withMessages(['lines' => $direction === 'in'
                            ? "Barang {$line['productId']} belum terdaftar di cabang tujuan"
                            : "Barang {$line['productId']} tidak ditemukan"]);
                    }
                    $prevStock = (float) $product->{$prc['stock']};
                    $delta = $direction === 'out' ? -(float) $line['qty'] : (float) $line['qty'];
                    $newStock = $prevStock + $delta;
                    if ($newStock < 0) {
                        throw ValidationException::withMessages(['lines' => "Stok {$product->{$prc['name']}} tidak boleh negatif"]);
                    }
                    DB::table($productTable)->where($prc['id'], $line['productId'])->update([$prc['stock'] => $newStock]);

                    $lineRows[] = [
                        'transfer_id' => $transferId, 'product_id' => $line['productId'],
                        'product_name' => $line['productName'], 'unit' => $line['unit'] ?? (string) ($product->{$prc['unit']} ?: 'Pcs'),
                        'qty' => $line['qty'],
                    ];
                    $movementRows[] = [
                        'id' => (string) Str::uuid(), 'product_id' => $line['productId'],
                        'product_name' => (string) $product->{$prc['name']},
                        'type' => $direction === 'out' ? 'transfer-out' : 'transfer-in',
                        'qty' => $delta, 'reference' => $data['reference'],
                        'note' => $direction === 'out'
                            ? "Transfer ke {$data['counterpartBranchName']}"
                            : "Transfer dari {$data['counterpartBranchName']}",
                        'created_at' => now(),
                    ];
                }

                DB::table('app_stock_transfers')->insert([
                    'id' => $transferId, 'reference' => $data['reference'], 'direction' => $direction,
                    'counterpart_branch_code' => $data['counterpartBranchCode'],
                    'counterpart_branch_name' => $data['counterpartBranchName'],
                    'status' => $direction === 'out' ? 'sent' : 'received',
                    'note' => $data['note'] ?? null, 'operator' => $operator, 'created_at' => now(),
                ]);
                DB::table('app_stock_transfer_lines')->insert($lineRows);
                DB::table('app_stock_movements')->insert($movementRows);

                $result = [
                    'id' => $transferId, 'reference' => $data['reference'], 'direction' => $direction,
                    'counterpartBranchCode' => $data['counterpartBranchCode'],
                    'counterpartBranchName' => $data['counterpartBranchName'],
                    'status' => $direction === 'out' ? 'sent' : 'received',
                    'note' => $data['note'] ?? null, 'operator' => $operator,
                    'lines' => array_map(fn ($l) => [
                        'productId' => $l['product_id'], 'productName' => $l['product_name'],
                        'unit' => $l['unit'], 'qty' => (float) $l['qty'],
                    ], $lineRows),
                    'createdAt' => now()->toJSON(),
                ];
                Idempotency::store($idempotencyKey, "stock-transfers-$direction", $result);
                return $result;
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                // Either the same Idempotency-Key raced, or a DIFFERENT retry (fresh key, e.g.
                // rebuilt from the out-doc after a lost queue) hit unique(reference, direction):
                // both mean this side is already booked — return the existing document.
                if ($winner = Idempotency::find($idempotencyKey)) return response()->json($winner);
                $existing = DB::table('app_stock_transfers')
                    ->where('reference', $data['reference'])->where('direction', $direction)->first();
                if ($existing) {
                    $lines = DB::table('app_stock_transfer_lines')->where('transfer_id', $existing->id)->get();
                    return response()->json($this->mapDoc($existing, $lines));
                }
            }
            throw $e;
        }

        return response()->json($doc);
    }

    private function mapDoc(object $t, iterable $lines): array
    {
        return [
            'id' => (string) $t->id, 'reference' => (string) $t->reference, 'direction' => (string) $t->direction,
            'counterpartBranchCode' => (string) $t->counterpart_branch_code,
            'counterpartBranchName' => (string) $t->counterpart_branch_name,
            'status' => (string) $t->status, 'note' => $t->note, 'operator' => $t->operator,
            'lines' => collect($lines)->map(fn ($l) => [
                'productId' => (string) $l->product_id, 'productName' => (string) $l->product_name,
                'unit' => (string) $l->unit, 'qty' => (float) $l->qty,
            ])->values()->all(),
            'createdAt' => (string) $t->created_at,
        ];
    }
}
