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

    // Manual piutang entry from Keuangan > Piutang pelanggan ("Piutang baru") - not tied to a
    // sale. Kode has no natural source to dedupe on (unlike a sale invoice), so it's generated
    // with a random suffix and retried a few times on the unlikely PK collision.
    public function create(string $customerId, float $amount, ?string $note, ?string $operator, ?string $idempotencyKey = null): array
    {
        $table = config('sid.receivable.table'); $c = config('sid.receivable.columns');
        $customerTable = config('sid.customer.table'); $cc = config('sid.customer.columns');

        return DB::transaction(function () use ($table, $c, $customerTable, $cc, $customerId, $amount, $note, $operator, $idempotencyKey) {
            $customer = DB::table($customerTable)->where($cc['id'], $customerId)->first();
            if (!$customer) throw ValidationException::withMessages(['customerId' => 'Pelanggan tidak ditemukan']);

            $kode = $this->uniqueKode($table, $c['id'], 'PWA-P-');
            DB::table($table)->insert([
                $c['id'] => $kode, $c['date'] => now()->toDateString(), $c['customer_code'] => $customerId,
                $c['amount'] => $amount, $c['note'] => $note ? mb_substr($note, 0, 50) : null, $c['operator'] => $operator,
            ]);

            $customers = collect([$customerId => $customer]);
            $receivable = DB::table($table)->where($c['id'], $kode)->first();
            $result = $this->mapReceivable($receivable, $c, collect(), $customers, $cc);
            Idempotency::store($idempotencyKey, 'finance-receivables', $result);
            return $result;
        });
    }

    private function uniqueKode(string $table, string $idColumn, string $prefix): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $kode = $prefix . now()->format('dmy') . '-' . strtoupper(Str::random(4));
            if (!DB::table($table)->where($idColumn, $kode)->exists()) return $kode;
        }
        throw new \RuntimeException('Gagal membuat kode piutang unik, coba lagi.');
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
