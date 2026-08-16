<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyCashLedgerRepository;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CashController
{
    public function index(LegacyCashLedgerRepository $repo): JsonResponse
    { return response()->json($repo->all()); }

    public function store(Request $request, LegacyCashLedgerRepository $repo): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing, 201);

        $data = $request->validate([
            'direction' => 'required|in:in,out',
            'amount' => 'required|numeric|gt:0',
            'category' => 'required|string|max:25',
            'note' => 'nullable|string|max:50',
        ]);
        try {
            $entry = $repo->create($data['direction'], (float) $data['amount'], $data['category'], $data['note'] ?? null, $request->user()?->getKey(), $idempotencyKey);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner, 201);
            throw $e;
        }
        return response()->json($entry, 201);
    }
}
