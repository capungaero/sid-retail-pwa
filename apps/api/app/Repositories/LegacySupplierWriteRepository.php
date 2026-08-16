<?php
namespace App\Repositories;
use Illuminate\Support\Facades\DB;

final class LegacySupplierWriteRepository
{
    public function save(array $data, ?string $id): string
    {
        $table = config('sid.supplier.table');
        $c = config('sid.supplier.columns');
        $key = $id ?? $data['code'];

        DB::table($table)->updateOrInsert([$c['id'] => $key], [
            $c['code'] => $data['code'],
            $c['name'] => $data['name'],
            $c['phone'] => $data['phone'] ?? null,
            $c['address'] => $data['address'] ?? null,
        ]);

        return $key;
    }
}
