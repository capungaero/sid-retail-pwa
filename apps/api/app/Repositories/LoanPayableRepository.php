<?php
namespace App\Repositories;
use App\Support\Idempotency;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// "Hutang pinjaman" - debt booked whenever a kas keluar draws "dari kas pinjaman". App-only
// tables (app_loan_payables/app_loan_payments), no legacy table involved - see the migration's
// comment for why for_date (not the draw's own day) is what Laporan nets against.
final class LoanPayableRepository
{
    public function all(): array
    {
        $loans = DB::table('app_loan_payables')->orderBy('created_at')->get();
        $payments = DB::table('app_loan_payments')->orderBy('created_at')->get()->groupBy('loan_id');
        return $loans->map(fn ($l) => $this->mapLoan($l, $payments->get($l->id, collect())))->all();
    }

    // Called from CashController::store right after a "loan" kas keluar entry is booked.
    public function create(string $ledgerId, float $amount, string $forDate, ?string $note): array
    {
        $id = (string) Str::uuid();
        DB::table('app_loan_payables')->insert([
            'id' => $id, 'ledger_id' => $ledgerId, 'amount' => $amount, 'for_date' => $forDate,
            'note' => $note, 'created_at' => now(),
        ]);
        $loan = DB::table('app_loan_payables')->where('id', $id)->first();
        return $this->mapLoan($loan, collect());
    }

    // Same row-lock pattern as LegacyPayableRepository::addPayment - see that file's comment.
    // Repaying a loan also books a real kas keluar from the chosen wallet ($fundingSource):
    // 'daily' (Kas Kasir) draws today's takings under $cashierName - so paying a loan back with
    // till money shows up as an expense today, exactly like a normal kas keluar; the other wallets
    // (petty/bank/in_transit) draw down their own running pool balance. This is booked straight
    // through the cash-ledger repo (NOT CashController::store), so it deliberately does NOT trigger
    // the "daily draw books a matching kas masuk" pool-keeper - loan-repayment money genuinely
    // leaves the till, it isn't just moved to another purpose within the shop.
    public function addPayment(string $loanId, float $amount, ?string $note, string $fundingSource, ?string $cashierName, ?string $operator, LegacyCashLedgerRepository $cashRepo, ?string $idempotencyKey = null): array
    {
        return DB::transaction(function () use ($loanId, $amount, $note, $fundingSource, $cashierName, $operator, $cashRepo, $idempotencyKey) {
            $loan = DB::table('app_loan_payables')->where('id', $loanId)->lockForUpdate()->first();
            if (!$loan) throw ValidationException::withMessages(['loanId' => 'Hutang pinjaman tidak ditemukan']);

            $paid = (float) DB::table('app_loan_payments')->where('loan_id', $loanId)->sum('amount');
            $outstanding = max(0.0, (float) $loan->amount - $paid);
            $capped = max(0.0, min($outstanding, $amount));
            if ($capped <= 0) throw ValidationException::withMessages(['amount' => 'Jumlah pembayaran tidak valid']);

            DB::table('app_loan_payments')->insert([
                'id' => (string) Str::uuid(), 'loan_id' => $loanId, 'amount' => $capped,
                'note' => $note, 'created_at' => now(),
            ]);

            // Book the outflow from the chosen wallet for the amount actually applied ($capped).
            $entry = $cashRepo->create('out', $capped, 'Bayar hutang pinjaman', mb_substr((string) ($note ?? 'Bayar hutang pinjaman'), 0, 50), $operator, null);
            DB::table('app_cash_entry_funding')->insert([
                'ledger_id' => $entry['id'], 'funding_source' => $fundingSource,
                'cashier_name' => $fundingSource === 'daily' ? $cashierName : null, 'created_at' => now(),
            ]);

            $payments = DB::table('app_loan_payments')->where('loan_id', $loanId)->orderBy('created_at')->get();
            $result = $this->mapLoan($loan, $payments);
            Idempotency::store($idempotencyKey, 'finance-loan-payables', $result);
            return $result;
        });
    }

    private function mapLoan(object $l, $payments): array
    {
        return [
            'id' => (string) $l->id,
            'ledgerId' => (string) $l->ledger_id,
            'amount' => (float) $l->amount,
            'forDate' => (string) $l->for_date,
            'note' => $l->note !== null && $l->note !== '' ? (string) $l->note : null,
            'payments' => $payments->map(fn ($p) => [
                'id' => (string) $p->id, 'amount' => (float) $p->amount, 'note' => $p->note,
                'createdAt' => (string) $p->created_at,
            ])->values()->all(),
            'createdAt' => (string) $l->created_at,
        ];
    }
}
