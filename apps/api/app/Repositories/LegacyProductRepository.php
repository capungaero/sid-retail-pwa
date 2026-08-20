<?php
namespace App\Repositories;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class LegacyProductRepository
{
    public function search(string $search = ''): array
    {
        $table = config('sid.product.table'); $c = config('sid.product.columns');
        // Left join a NEW table (app_product_photos, no FK) keyed by kode to surface photoUrl —
        // never reads/writes anything on the legacy `barang` table itself for this.
        $query = DB::table($table)
            ->leftJoin('app_product_photos', 'app_product_photos.product_code', '=', "$table.{$c['code']}")
            ->select(array_merge(array_values(array_unique($c)), ['app_product_photos.path as photo_path']));
        if ($search !== '') $query->where(function ($q) use ($search, $c): void {
            $like = '%'.addcslashes($search, '%_').'%' ;
            $q->where($c['name'], 'like', $like)->orWhere($c['code'], 'like', $like)->orWhere($c['barcode'], $search);
        });
        return $query->limit(100)->get()->map(fn ($row) => $this->map((array) $row, $c))->all();
    }

    private function map(array $r, array $c): array
    {
        return ['id'=>(string)$r[$c['id']], 'code'=>(string)$r[$c['code']], 'barcode'=>(string)($r[$c['barcode']]??''), 'name'=>(string)$r[$c['name']], 'category'=>(string)($r[$c['category']]??''), 'stock'=>(float)$r[$c['stock']], 'minStock'=>(float)($r[$c['minStock']]??0), 'cost'=>(float)$r[$c['cost']], 'active'=>true, 'units'=>[['name'=>(string)($r[$c['unit']]?:'Pcs'),'multiplier'=>(float)($r[$c['multiplier']]?:1),'price'=>(float)$r[$c['price']]]], 'photoUrl'=>!empty($r['photo_path']) ? Storage::disk('public')->url($r['photo_path']) : null];
    }
}
