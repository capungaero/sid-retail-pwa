<?php
namespace App\Repositories;
use Illuminate\Support\Facades\DB;

final class LegacySupplierRepository
{
    public function search(string $search = ''): array
    {
        $table = config('sid.supplier.table'); $c = config('sid.supplier.columns');
        $query = DB::table($table)->select(array_values(array_unique($c)));
        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_').'%';
            $query->where(function ($q) use ($like, $c): void { $q->where($c['name'], 'like', $like)->orWhere($c['code'], 'like', $like); });
        }
        return $query->limit(100)->get()->map(fn ($row) => $this->map((array) $row, $c))->all();
    }

    private function map(array $r, array $c): array
    {
        return ['id' => (string)$r[$c['id']], 'code' => (string)$r[$c['code']], 'name' => (string)$r[$c['name']], 'phone' => $r[$c['phone']] !== null && $r[$c['phone']] !== '' ? (string)$r[$c['phone']] : null, 'address' => $r[$c['address']] !== null && $r[$c['address']] !== '' ? (string)$r[$c['address']] : null];
    }
}
