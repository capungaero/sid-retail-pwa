<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Standalone Pengaturan > Pengguna roster — see migration 2026_08_16_070030 for why this is
// not joined to legacy `karyawan`.
final class AppUserSetting extends Model
{
    protected $table = 'app_user_settings';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'name', 'username', 'role', 'active'];
    protected $casts = ['active' => 'boolean'];
}
