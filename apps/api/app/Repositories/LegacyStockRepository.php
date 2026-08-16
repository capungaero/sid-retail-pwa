<?php
namespace App\Repositories;
use Illuminate\Support\Facades\DB;

// Reads the app_stock_movements audit trail (see migration 2026_08_16_070002). Writes to it
// happen inline inside PurchaseOrderController::receive, ReturnController and StockController
// so they can share the same DB::transaction as the legacy-table writes they accompany.
final class LegacyStockRepository
{
    public function movements(string $productId = ''): array
    {
        $query = DB::table('app_stock_movements')->orderByDesc('created_at');
        if ($productId !== '') $query->where('product_id', $productId);
        return $query->limit(200)->get()->map(fn ($r) => [
            'id' => (string)$r->id, 'productId' => (string)$r->product_id, 'productName' => (string)$r->product_name,
            'type' => (string)$r->type, 'qty' => (float)$r->qty, 'reference' => (string)$r->reference,
            'note' => $r->note !== null && $r->note !== '' ? (string)$r->note : null, 'createdAt' => (string)$r->created_at,
        ])->all();
    }
}
