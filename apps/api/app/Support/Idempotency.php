<?php
namespace App\Support;
use Illuminate\Support\Facades\DB;

// Generic replay protection for mutating endpoints, mirroring SaleController's
// app_idempotency_keys pattern but reusable across any endpoint (see app_request_idempotency).
// Usage: check find() before doing any work; call store() with the final response INSIDE the
// same DB::transaction as the mutation, so a duplicate key can never observe a partial write;
// on a QueryException with code 23000 (unique-key race — two concurrent requests with the same
// key both passed find() before either committed), call find() again to return the winner's
// stored response instead of surfacing the constraint violation. See StockController,
// CashController, PayableController, ReceivableController, ReturnController,
// PaymentInstrumentController for callers.
final class Idempotency
{
    public static function find(?string $key): ?array
    {
        if (!$key) return null;
        $row = DB::table('app_request_idempotency')->where('idempotency_key', $key)->first();
        return $row ? json_decode($row->response, true) : null;
    }

    public static function store(?string $key, string $endpoint, array $response): void
    {
        if (!$key) return;
        DB::table('app_request_idempotency')->insert([
            'idempotency_key' => $key, 'endpoint' => $endpoint,
            'response' => json_encode($response), 'created_at' => now(),
        ]);
    }
}
