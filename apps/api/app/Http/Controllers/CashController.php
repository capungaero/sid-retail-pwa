<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyCashLedgerRepository;
use App\Repositories\LoanPayableRepository;
use App\Support\Idempotency;
use Carbon\Carbon;
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

    public function store(Request $request, LegacyCashLedgerRepository $repo, LoanPayableRepository $loanRepo): JsonResponse
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
            // Which cash pool a "kas masuk" entry landed in. Mirrors fundingSource's vocabulary -
            // 'daily'/'loan' here are plain descriptive tags, no cashier/debt logic attached.
            'cashSource' => 'required_if:direction,in|nullable|in:daily,loan,cashier,petty,in_transit,bank',
        ]);
        try {
            // A "daily" kas keluar draw is money the shop already has (that cashier's own till),
            // just spent for something else - its matching kas masuk is booked FIRST, so it
            // always sorts/shows ahead of the draw that pulls from it (matches how "Kas Kasir dari
            // transaksi harian" is meant to read: money comes in, then some of it goes back out).
            if ($data['direction'] === 'out' && $data['fundingSource'] === 'daily') {
                // idempotency_key is CHAR(36) - too short for the raw key plus a suffix - so the
                // linked entry's key is derived via hash instead of concatenation.
                $linkedKey = $idempotencyKey ? self::deriveLinkedKey($idempotencyKey) : null;
                if (!$linkedKey || !Idempotency::find($linkedKey)) {
                    $note = mb_substr("Transaksi {$data['fundingCashierName']}", 0, 50);
                    $linked = $repo->create('in', (float) $data['amount'], $data['category'], $note, $request->user()?->getKey(), $linkedKey);
                    DB::table('app_cash_entry_funding')->insert([
                        'ledger_id' => $linked['id'], 'cash_source' => 'daily',
                        'cashier_name' => $data['fundingCashierName'], 'created_at' => now(),
                    ]);
                }
            }

            $entry = $repo->create($data['direction'], (float) $data['amount'], $data['category'], $data['note'] ?? null, $request->user()?->getKey(), $idempotencyKey);
            if ($data['direction'] === 'out') {
                DB::table('app_cash_entry_funding')->insert([
                    'ledger_id' => $entry['id'], 'funding_source' => $data['fundingSource'],
                    'cashier_name' => $data['fundingSource'] === 'daily' ? $data['fundingCashierName'] : null,
                    'created_at' => now(),
                ]);
                $entry['fundingSource'] = $data['fundingSource'];
                $entry['fundingCashierName'] = $data['fundingSource'] === 'daily' ? $data['fundingCashierName'] : null;
                if ($data['fundingSource'] === 'loan') {
                    // Draws against the previous day's already-closed sales, not today's still-open
                    // till - see LoanPayableRepository/migration comment.
                    $forDate = Carbon::parse($entry['createdAt'])->subDay()->toDateString();
                    $loanRepo->create($entry['id'], (float) $data['amount'], $forDate, $data['note'] ?? null);
                }
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

    // idempotency_key is CHAR(36); this turns an arbitrary client key into a distinct, still
    // 36-char, deterministic key for the auto-booked linked entry (same input -> same derived
    // key, so a retried request can't double-book it).
    private static function deriveLinkedKey(string $key): string
    {
        $hash = md5($key.':daily-link');
        return sprintf('%s-%s-%s-%s-%s', substr($hash, 0, 8), substr($hash, 8, 4), substr($hash, 12, 4), substr($hash, 16, 4), substr($hash, 20, 12));
    }
}
