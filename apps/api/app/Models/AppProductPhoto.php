<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// New table (app_product_photos) — not a legacy table, no config/sid.php mapping needed.
// product_code is a plain string key matching barang.kode, no FK constraint (see migration).
final class AppProductPhoto extends Model
{
    protected $table = 'app_product_photos';
    protected $primaryKey = 'product_code';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['product_code', 'path', 'mime', 'size_bytes'];
}
