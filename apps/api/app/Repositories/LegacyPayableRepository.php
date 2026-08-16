<?php
namespace App\Repositories;
use App\Support\Idempotency;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// hutang (payable). See config/sid.php for column semantics.
//
// IMPORTANT — corrected 2026-08-16: itemhutang.kode_hutang was previously (incorrectly) treated
// as a foreign key to hutang.kode and used as a payment/installment ledger. Verified empirically
// against production data that this is wrong: itemhutang.kode_hutang actually references
// pembelian.kode (100% match on all 984 rows), and it is itemhutang.kode that matches
// hutang.kode (also 100%). itemhutang is invoice-composition data — which purchase invoices were
// bundled into a supplier debt batch — not a record of payments made against that debt.
// No legacy table holds real payment/installment history for hutang (mutasikas,
// pembayaran_angsuran, tabel_angsuran are all empty in production). Product decision: treat
// hutang.jumlah as a fixed opening balance as of migration (payments = [] for pre-existing debt,
// honestly reflecting that no historical breakdown exists), and track only new payments made
// through this app in the new app_payable_payments table. hutang.jumlah/itemhutang are never
// written to by this app.
final class LegacyPayableRepository
{
    public function all(): array
    {
        $table = config('sid.payable.table'); $c = config('sid.payable.columns');
        $supplierTable = config('sid.supplier.table'); $sc = config('sid.supplier.columns');

        $payables = DB::table($table)->select(array_values($c))->orderBy($c['id'])->get();
        $payments = DB::table('app_payable_payments')->orderBy('created_at')->get()->groupBy('payable_id');
        $suppliers = DB::table($supplierTable)->select($sc['id'], $sc['name'])->get()->keyBy($sc['id']);

        return $payables->map(fn ($p) => $this->mapPayable($p, $c, $payments->get($p->{$c['id']}, collect()), $suppliers, $sc))->all();
    }

    // Locks the hutang row so concurrent payments against the same payable serialize: the
    // outstanding-balance check and the app_payable_payments insert happen under one lock,
    // matching the row-lock pattern used by SaleController for stock decrements.
    public function addPayment(string $payableId, float $amount, ?string $note, ?string $operator, ?string $idempotencyKey = null): array
    {
        $table = config('sid.payable.table'); $c = config('sid.payable.columns');
        $supplierTable = config('sid.supplier.table'); $sc = config('sid.supplier.columns');

        return DB::transaction(function () use ($table, $c, $supplierTable, $sc, $payableId, $amount, $note, $idempotencyKey) {
            $payable = DB::table($table)->where($c['id'], $payableId)->lockForUpdate()->first();
            if (!$payable) throw ValidationException::withMessages(['payableId' => 'Hutang tidak ditemukan']);

            $paid = (float) DB::table('app_payable_payments')->where('payable_id', $payableId)->sum('amount');
            $outstanding = max(0.0, (float) $payable->{$c['amount']} - $paid);
            $capped = max(0.0, min($outstanding, $amount));
            if ($capped <= 0) throw ValidationException::withMessages(['amount' => 'Jumlah pembayaran tidak valid']);

            DB::table('app_payable_payments')->insert([
                'id' => (string) Str::uuid(), 'payable_id' => $payableId, 'amount' => $capped,
                'note' => $note, 'created_at' => now(),
            ]);

            $payments = DB::table('app_payable_payments')->where('payable_id', $payableId)->orderBy('created_at')->get();
            $supplier = DB::table($supplierTable)->where($sc['id'], $payable->{$c['supplier_code']})->first();
            $suppliers = $supplier ? collect([$payable->{$c['supplier_code']} => $supplier]) : collect();
            $result = $this->mapPayable($payable, $c, $payments, $suppliers, $sc);
            Idempotency::store($idempotencyKey, 'finance-payables', $result);
            return $result;
        });
    }

    private function mapPayable(object $p, array $c, $payments, $suppliers, array $sc): array
    {
        $supplier = $suppliers->get($p->{$c['supplier_code']});
        return [
            'id' => (string) $p->{$c['id']},
            'supplierId' => (string) $p->{$c['supplier_code']},
            'supplierName' => $supplier ? (string) $supplier->{$sc['name']} : (string) $p->{$c['supplier_code']},
            'reference' => (string) $p->{$c['id']},
            'amount' => (float) $p->{$c['amount']},
            'payments' => $payments->map(fn ($i) => [
                'id' => (string) $i->id, 'amount' => (float) $i->amount, 'note' => $i->note,
                'createdAt' => (string) $i->created_at,
            ])->values()->all(),
            'createdAt' => (string) $p->{$c['date']},
        ];
    }
}
