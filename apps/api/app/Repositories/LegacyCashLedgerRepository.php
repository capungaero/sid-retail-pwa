<?php
namespace App\Repositories;
use App\Support\Idempotency;
use Illuminate\Support\Facades\DB;

// mutasikas has no stored running balance or auto-increment id — see config/sid.php for the
// column-repurposing convention this repository relies on.
final class LegacyCashLedgerRepository
{
    public function all(): array
    {
        $table = config('sid.cash_ledger.table'); $c = config('sid.cash_ledger.columns');
        $rows = DB::table($table)->select(array_values($c))->orderBy($c['id'])->get();
        $balance = 0.0;
        return $rows->map(function ($r) use ($c, &$balance) {
            $amount = (float) $r->{$c['amount']};
            $direction = $r->{$c['direction']} === 'out' ? 'out' : 'in';
            $balance += $direction === 'in' ? $amount : -$amount;
            return $this->mapRow($r, $c, $direction, $amount, $balance);
        })->all();
    }

    // Locks the whole table (full-scan FOR UPDATE takes InnoDB next-key locks covering the
    // gap after the last row) so concurrent cash entries serialize instead of racing on
    // balanceAfter, then inserts the new row and returns it with its computed balance.
    public function create(string $direction, float $amount, string $category, ?string $note, ?string $operator, ?string $idempotencyKey = null): array
    {
        $table = config('sid.cash_ledger.table'); $c = config('sid.cash_ledger.columns');
        return DB::transaction(function () use ($table, $c, $direction, $amount, $category, $note, $operator, $idempotencyKey) {
            $rows = DB::table($table)->select(array_values($c))->orderBy($c['id'])->lockForUpdate()->get();
            $balance = 0.0;
            foreach ($rows as $r) {
                $rowAmount = (float) $r->{$c['amount']};
                $balance += $r->{$c['direction']} === 'out' ? -$rowAmount : $rowAmount;
            }
            $balance += $direction === 'in' ? $amount : -$amount;

            // Sequence number is the running MAX across ALL rows (not scoped to today - matches
            // existing ids like MK26082600001 that don't reset the suffix per day), not a row
            // COUNT: count() breaks the moment any row is inserted out of band (a manual repair,
            // a gap left by a deleted row) - the next count-based id can then collide with one
            // already taken, and every future insert fails the same way until fixed.
            $maxSeq = $rows->reduce(fn ($max, $r) => max($max, (int) substr((string) $r->{$c['id']}, -5)), 0);
            $id = 'MK'.now()->format('ymd').str_pad((string) ($maxSeq + 1), 5, '0', STR_PAD_LEFT);
            $today = now()->toDateString();
            DB::table($table)->insert([
                $c['id'] => $id, $c['date'] => $today, $c['direction'] => $direction, $c['category'] => $category,
                $c['note'] => $note, $c['amount'] => $amount, $c['operator'] => $operator,
            ]);

            $result = $this->mapRow((object) [
                $c['id'] => $id, $c['direction'] => $direction, $c['category'] => $category,
                $c['note'] => $note, $c['amount'] => $amount, $c['date'] => $today,
            ], $c, $direction, $amount, $balance);
            Idempotency::store($idempotencyKey, 'finance-cash-entries', $result);
            return $result;
        });
    }

    private function mapRow(object $r, array $c, string $direction, float $amount, float $balance): array
    {
        return [
            'id' => (string) $r->{$c['id']}, 'direction' => $direction, 'amount' => $amount,
            'category' => (string) ($r->{$c['category']} ?? ''), 'note' => $r->{$c['note']} !== null && $r->{$c['note']} !== '' ? (string) $r->{$c['note']} : null,
            'balanceAfter' => $balance, 'createdAt' => (string) $r->{$c['date']},
        ];
    }
}
