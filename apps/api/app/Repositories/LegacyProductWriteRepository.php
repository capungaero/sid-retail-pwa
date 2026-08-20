<?php
namespace App\Repositories;

use Illuminate\Support\Facades\DB;

// Counterpart to LegacyProductRepository: writes the same single primary-unit
// fields that repository reads (barang has satuan2/3/4 for extra units, but
// the read side does not surface them yet, so the write side stays symmetric).
final class LegacyProductWriteRepository
{
    public function save(array $data, ?string $id): string
    {
        $table = config('sid.product.table');
        $c = config('sid.product.columns');
        $unit = $data['units'][0];
        $key = $id ?? $data['code'];

        DB::table($table)->updateOrInsert([$c['id'] => $key], [
            $c['code'] => $data['code'],
            $c['barcode'] => $data['barcode'] ?? '',
            $c['name'] => $data['name'],
            $c['category'] => $data['category'],
            $c['minStock'] => $data['minStock'] ?? 0,
            $c['stock'] => $data['stock'],
            $c['cost'] => $data['cost'],
            $c['price'] => $unit['price'],
            $c['unit'] => $unit['name'],
            $c['multiplier'] => $unit['multiplier'],
        ]);

        return $key;
    }
}
