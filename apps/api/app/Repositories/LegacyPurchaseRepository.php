<?php
namespace App\Repositories;
use Illuminate\Support\Facades\DB;

final class LegacyPurchaseRepository
{
    public function search(string $search = ''): array
    {
        $table = config('sid.purchase.table'); $c = config('sid.purchase.columns');
        $query = DB::table($table)->select(array_values(array_unique($c)));
        if ($search !== '') $query->where($c['id'], 'like', '%'.addcslashes($search, '%_').'%');
        $rows = $query->orderByDesc($c['date'])->limit(200)->get();
        return $rows->map(fn ($row) => $this->mapWithLines((array) $row, $c))->all();
    }

    public function find(string $id): ?array
    {
        $table = config('sid.purchase.table'); $c = config('sid.purchase.columns');
        $row = DB::table($table)->where($c['id'], $id)->first();
        return $row ? $this->mapWithLines((array) $row, $c) : null;
    }

    public function lines(string $purchaseId): array
    {
        $itemTable = config('sid.purchase_item.table'); $ic = config('sid.purchase_item.columns');
        return DB::table($itemTable)->where($ic['purchase_id'], $purchaseId)->orderBy($ic['line_no'])->get()
            ->map(fn ($r) => [
                'productId' => (string)$r->{$ic['product_code']}, 'productName' => (string)$r->{$ic['product_name']},
                'unit' => (string)$r->{$ic['unit']}, 'qty' => (float)$r->{$ic['qty']}, 'cost' => (float)$r->{$ic['cost']},
                'receivedQty' => (float)$r->{$ic['received_qty']},
            ])->all();
    }

    public static function statusOf(array $r, array $c): string
    {
        $po = strtolower((string)($r[$c['po']] ?? '')) === 'true';
        $receive = strtolower((string)($r[$c['receive']] ?? '')) === 'true';
        if ($receive) return 'received';
        return $po ? 'draft' : 'open';
    }

    private function mapWithLines(array $r, array $c): array
    {
        $lines = $this->lines((string)$r[$c['id']]);
        return [
            'id' => (string)$r[$c['id']], 'reference' => (string)$r[$c['id']], 'supplierId' => (string)$r[$c['supplier_code']],
            'status' => self::statusOf($r, $c), 'lines' => $lines,
            'createdAt' => $r[$c['date']] ? (string)$r[$c['date']] : now()->toDateString(),
            'note' => $r[$c['note']] !== null && $r[$c['note']] !== '' ? (string)$r[$c['note']] : null,
        ];
    }
}
