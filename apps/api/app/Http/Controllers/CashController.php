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
        $funding = DB::table('app_cash_entry_funding')->get()->keyBy('ledger_id');
        return response()->json(array_map(function ($e) use ($funding) {
            $f = $funding->get($e['id']);
            return $e + ['fundingSource' => $f?->funding_source, 'fundingCashierName' => $f?->cashier_name, 'cashSource' => $f?->cash_source];
        }, $entries));
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
            'fundingSource' => 'required_if:direction,out|nullable|in:daily,loan,cashier,petty,in_transit,bank',
            // Only a 'daily' draw is attributed to one cashier's own takings - a 'loan' draw and
            // the plain cash-pool tags (cashier/petty/in_transit/bank) aren't tied to any single
            // cashier's day.
            'fundingCashierName' => 'required_if:fundingSource,daily|nullable|string|max:100',
            // Which cash pool a "kas masuk" entry landed in.
            'cashSource' => 'required_if:direction,in|nullable|in:cashier,petty,in_transit,bank',
        ]);
        try {
            $entry = $repo->create($data['direction'], (float) $data['amount'], $data['category'], $data['note'] ?? null, $request->user()?->getKey(), $idempotencyKey);
            if ($data['direction'] === 'out') {
                DB::table('app_cash_entry_funding')->insert([
                    'ledger_id' => $entry['id'], 'funding_source' => $data['fundingSource'],
                    'cashier_name' => $data['fundingSource'] === 'daily' ? $data['fundingCashierName'] : null,
                    'created_at' => now(),
                ]);
                $entry['fundingSource'] = $data['fundingSource'];
                $entry['fundingCashierName'] = $data['fundingSource'] === 'daily' ? $data['fundingCashierName'] : null;
            } else {
                DB::table('app_cash_entry_funding')->insert([
                    'ledger_id' => $entry['id'], 'cash_source' => $data['cashSource'], 'created_at' => now(),
                ]);
                $entry['cashSource'] = $data['cashSource'];
            }
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner, 201);
            throw $e;
        }
        return response()->json($entry, 201);
    }
}
