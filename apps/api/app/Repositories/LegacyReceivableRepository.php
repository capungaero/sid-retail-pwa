<?php
namespace App\Repositories;
use App\Support\Idempotency;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// piutang (receivable). Mirrors LegacyPayableRepository — see its header comment for the
// corrected itempiutang.kode_piutang finding (it references penjualan.kode, not piutang.kode;
// itempiutang.kode is what actually matches piutang.kode, and itempiutang is invoice-composition
// data, not a payment ledger). Payments made through this app are tracked in the new
// app_receivable_payments table; piutang.jumlah/itempiutang are never written to by this app.
final class LegacyReceivableRepository
{
    public function all(): array
    {
        $table = config('sid.receivable.table'); $c = config('sid.receivable.columns');
        $customerTable = config('sid.customer.table'); $cc = config('sid.customer.columns');

        $receivables = DB::table($table)->select(array_values($c))->orderBy($c['id'])->get();
        $payments = DB::table('app_receivable_payments')->orderBy('created_at')->get()->groupBy('receivable_id');
        $customers = DB::table($customerTable)->select($cc['id'], $cc['name'])->get()->keyBy($cc['id']);

        return $receivables->map(fn ($r) => $this->mapReceivable($r, $c, $payments->get($r->{$c['id']}, collect()), $customers, $cc))->all();
    }

    public function addPayment(string $receivableId, float $amount, ?string $note, ?string $operator, ?string $idempotencyKey = null): array
    {
        $table = config('sid.receivable.table'); $c = config('sid.receivable.columns');
        $customerTable = config('sid.customer.table'); $cc = config('sid.customer.columns');

        return DB::transaction(function () use ($table, $c, $customerTable, $cc, $receivableId, $amount, $note, $idempotencyKey) {
            $receivable = DB::table($table)->where($c['id'], $receivableId)->lockForUpdate()->first();
            if (!$receivable) throw ValidationException::withMessages(['receivableId' => 'Piutang tidak ditemukan']);

            $paid = (float) DB::table('app_receivable_payments')->where('receivable_id', $receivableId)->sum('amount');
            $outstanding = max(0.0, (float) $receivable->{$c['amount']} - $paid);
            $capped = max(0.0, min($outstanding, $amount));
            if ($capped <= 0) throw ValidationException::withMessages(['amount' => 'Jumlah pembayaran tidak valid']);

            DB::table('app_receivable_payments')->insert([
                'id' => (string) Str::uuid(), 'receivable_id' => $receivableId, 'amount' => $capped,
                'note' => $note, 'created_at' => now(),
            ]);

            $payments = DB::table('app_receivable_payments')->where('receivable_id', $receivableId)->orderBy('created_at')->get();
            $customer = DB::table($customerTable)->where($cc['id'], $receivable->{$c['customer_code']})->first();
            $customers = $customer ? collect([$receivable->{$c['customer_code']} => $customer]) : collect();
            $result = $this->mapReceivable($receivable, $c, $payments, $customers, $cc);
            Idempotency::store($idempotencyKey, 'finance-receivables', $result);
            return $result;
        });
    }

    private function mapReceivable(object $r, array $c, $payments, $customers, array $cc): array
    {
        $customer = $customers->get($r->{$c['customer_code']});
        return [
            'id' => (string) $r->{$c['id']},
            'customerId' => (string) $r->{$c['customer_code']},
            'customerName' => $customer ? (string) $customer->{$cc['name']} : (string) $r->{$c['customer_code']},
            'reference' => (string) $r->{$c['id']},
            'amount' => (float) $r->{$c['amount']},
            'payments' => $payments->map(fn ($i) => [
                'id' => (string) $i->id, 'amount' => (float) $i->amount, 'note' => $i->note,
                'createdAt' => (string) $i->created_at,
            ])->values()->all(),
            'createdAt' => (string) $r->{$c['date']},
        ];
    }
}
