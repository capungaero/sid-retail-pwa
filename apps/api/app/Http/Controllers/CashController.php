<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyCashLedgerRepository;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CashController
{
    public function index(LegacyCashLedgerRepository $repo): JsonResponse
    {
        $entries = $repo->all();
        $funding = DB::table('app_cash_entry_funding')->pluck('funding_source', 'ledger_id');
        return response()->json(array_map(fn ($e) => $e + ['fundingSource' => $funding->get($e['id'])], $entries));
    }

    public function store(Request $request, LegacyCashLedgerRepository $repo): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing, 201);

        $data = $request->validate([
            'direction' => 'required|in:in,out',
            'amount' => 'required|numeric|gt:0',
            'category' => 'required|string|max:25',
            'note' => 'nullable|string|max:50',
            'fundingSource' => 'required_if:direction,out|nullable|in:daily,loan',
        ]);
        try {
            $entry = $repo->create($data['direction'], (float) $data['amount'], $data['category'], $data['note'] ?? null, $request->user()?->getKey(), $idempotencyKey);
            if ($data['direction'] === 'out') {
                DB::table('app_cash_entry_funding')->insert(['ledger_id' => $entry['id'], 'funding_source' => $data['fundingSource'], 'created_at' => now()]);
                $entry['fundingSource'] = $data['fundingSource'];
            }
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner, 201);
            throw $e;
        }
        return response()->json($entry, 201);
    }
}
