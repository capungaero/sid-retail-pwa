<?php
namespace App\Repositories;
use Illuminate\Support\Facades\DB;

// Read-only lookups against the legacy karyawan table, reusing the same
// config('sid.auth.*') mapping as Employee/AuthController. Never writes.
final class LegacyEmployeeRepository
{
    public function name(string $employeeId): ?string
    {
        $c = config('sid.auth.columns');
        $row = DB::table(config('sid.auth.table'))->where($c['id'], $employeeId)->first([$c['name']]);
        return $row ? (string) $row->{$c['name']} : null;
    }

    /** @return array<string,string> employeeId => name */
    public function names(array $employeeIds): array
    {
        if ($employeeIds === []) return [];
        $c = config('sid.auth.columns');
        return DB::table(config('sid.auth.table'))->whereIn($c['id'], array_unique($employeeIds))
            ->pluck($c['name'], $c['id'])->map(fn ($v) => (string) $v)->all();
    }
}
