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
        // A loan is tracked as OUTSTANDING, not as cash income/expense: outstanding[$ledgerId] is how
        // much of that draw is still unpaid.
        $paidByLoan = DB::table('app_loan_payments')->groupBy('loan_id')->select('loan_id', DB::raw('SUM(amount) AS paid'))->pluck('paid', 'loan_id');
        $outstanding = [];
        foreach (DB::table('app_loan_payables')->get() as $l) {
            $outstanding[$l->ledger_id] = max(0.0, (float) $l->amount - (float) ($paidByLoan[$l->id] ?? 0));
        }
        // Running balance is recomputed so a loan never inflates it: repayment rows (Pelunasan
        // Pinjaman) are audit-only (0 effect - they stay visible but don't add cash), and a loan
        // draw weighs on the balance only by its still-unpaid amount, so a fully repaid loan nets
        // to zero and the balance = real cash minus outstanding loans, never above real revenue.
        $balance = 0.0;
        $out = [];
        foreach ($entries as $e) {
            $f = $funding->get($e['id']);
            $e['fundingSource'] = $f?->funding_source;
            $e['fundingCashierName'] = $f?->cashier_name;
            $e['cashSource'] = $f?->cash_source;
            // mutasikas only stores a DATE (tanggal), so the ledger's createdAt has no time-of-day
            // and every row would render at WIB midnight (07.00). Every app-booked entry also writes
            // an app_cash_entry_funding row stamped with a real timestamp at insert - use that as
            // the actual clock time when present, falling back to the date for any legacy row.
            if ($f && $f->created_at) $e['createdAt'] = (string) $f->created_at;

            if ($e['category'] === 'Pelunasan Pinjaman') {
                $effect = 0.0;
            } elseif (array_key_exists($e['id'], $outstanding)) {
                $effect = -$outstanding[$e['id']];
            } else {
                $effect = $e['direction'] === 'in' ? (float) $e['amount'] : -(float) $e['amount'];
            }
            $balance += $effect;
            $e['balanceAfter'] = $balance;
            $out[] = $e;
        }
        return response()->json($out);
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
            // A "daily" (Kas Kasir hari ini) draw is money the shop already holds (that cashier's
            // own till), just moved to another purpose - so it books a matching kas masuk of the
            // same amount FIRST, keeping the Kas Kasir pool net-zero across the two rows. A 'loan'
            // (Saldo Akumulasi Toko) draw is NOT paired here: it genuinely lowers the accumulated
            // balance (pool goes -X) and is only restored when the debt is repaid (that repayment
            // books the +X kas masuk back to Saldo Akumulasi Toko - see LoanPayableRepository).
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

    // Edit one cash-ledger row. Amount/category/note/direction/date are all editable; a change to
    // the amount of a loan-linked row is mirrored into the loan record so the outstanding stays
    // consistent (a loan draw -> its app_loan_payables.amount; a "Pelunasan Pinjaman" repayment
    // row -> the matching app_loan_payments row). The row's funding timestamp is moved onto the
    // new date (keeping the original time-of-day) so the edited date actually shows in Buku Kas,
    // which reads the funding timestamp as the row clock.
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'direction' => 'required|in:in,out',
            'amount' => 'required|numeric|gt:0',
            'category' => 'required|string|max:25',
            'note' => 'nullable|string|max:50',
            'date' => 'required|date_format:Y-m-d',
        ]);
        $table = config('sid.cash_ledger.table'); $c = config('sid.cash_ledger.columns');
        $row = DB::table($table)->where($c['id'], $id)->first();
        if (!$row) return response()->json(['message' => 'Entri kas tidak ditemukan.'], 404);

        DB::transaction(function () use ($table, $c, $id, $row, $data) {
            DB::table($table)->where($c['id'], $id)->update([
                $c['direction'] => $data['direction'], $c['amount'] => $data['amount'],
                $c['category'] => $data['category'], $c['note'] => $data['note'] ?? null,
                $c['date'] => $data['date'],
            ]);
            $f = DB::table('app_cash_entry_funding')->where('ledger_id', $id)->first();
            if ($f) {
                $time = $f->created_at ? substr((string) $f->created_at, 11, 8) : '12:00:00';
                DB::table('app_cash_entry_funding')->where('ledger_id', $id)->update(['created_at' => $data['date'].' '.($time ?: '12:00:00')]);
            }
            $payable = DB::table('app_loan_payables')->where('ledger_id', $id)->first();
            if ($payable) {
                DB::table('app_loan_payables')->where('id', $payable->id)->update(['amount' => $data['amount']]);
            } elseif ((string) ($row->{$c['category']} ?? '') === 'Pelunasan Pinjaman') {
                self::withMatchedPayment($row, $c, fn ($loanId, $payId) => DB::table('app_loan_payments')->where('id', $payId)->update(['amount' => $data['amount']]));
            }
        });
        return response()->json(['ok' => true]);
    }

    // Delete one cash-ledger row and everything that hangs off it: its funding row always, plus
    // a cascade so the loan side never desyncs. Deleting a loan DRAW removes that debt entirely
    // (its payable and every payment against it); deleting a "Pelunasan Pinjaman" repayment row
    // removes the one matching payment, so the loan's outstanding rises back by that amount.
    public function destroy(string $id): JsonResponse
    {
        $table = config('sid.cash_ledger.table'); $c = config('sid.cash_ledger.columns');
        $row = DB::table($table)->where($c['id'], $id)->first();
        if (!$row) return response()->json(['message' => 'Entri kas tidak ditemukan.'], 404);

        DB::transaction(function () use ($table, $c, $id, $row) {
            DB::table('app_cash_entry_funding')->where('ledger_id', $id)->delete();
            $payable = DB::table('app_loan_payables')->where('ledger_id', $id)->first();
            if ($payable) {
                DB::table('app_loan_payments')->where('loan_id', $payable->id)->delete();
                DB::table('app_loan_payables')->where('id', $payable->id)->delete();
            } elseif ((string) ($row->{$c['category']} ?? '') === 'Pelunasan Pinjaman') {
                self::withMatchedPayment($row, $c, fn ($loanId, $payId) => DB::table('app_loan_payments')->where('id', $payId)->delete());
            }
            DB::table($table)->where($c['id'], $id)->delete();
        });
        return response()->json(['ok' => true]);
    }

    // A "Pelunasan Pinjaman" ledger row carries no FK to its app_loan_payments row, but its note
    // is "Pelunasan pinjaman #<first 8 of loan id>" - parse that, find the loan, and hand the
    // newest payment of the same amount to the callback (nothing happens if none matches).
    private static function withMatchedPayment(object $row, array $c, callable $fn): void
    {
        $note = (string) ($row->{$c['note']} ?? '');
        if (!preg_match('/#([0-9a-fA-F]{8})/', $note, $m)) return;
        $loan = DB::table('app_loan_payables')->where('id', 'like', $m[1].'%')->first();
        if (!$loan) return;
        $pay = DB::table('app_loan_payments')->where('loan_id', $loan->id)
            ->where('amount', (float) $row->{$c['amount']})->orderByDesc('created_at')->first();
        if ($pay) $fn($loan->id, $pay->id);
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
