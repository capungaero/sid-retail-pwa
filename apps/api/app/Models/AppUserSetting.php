<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

// Standalone Pengaturan > Pengguna roster — see migration 2026_08_16_070030 for why this was
// originally kept separate from legacy `karyawan`. Extended in 2026_08_28_000001 into a second
// real login source (see AuthController::login) — Authenticatable + HasApiTokens so it can issue
// Sanctum tokens the same way the Employee model does for karyawan.
final class AppUserSetting extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'app_user_settings';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'name', 'username', 'role', 'active'];
    protected $hidden = ['password_hash'];
    protected $casts = ['active' => 'boolean'];

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    // Every audit-log call site reads `$request->user()?->nama` (the legacy Employee model's
    // display-name column) — this accessor lets an AppUserSetting-issued token's name show up
    // there too instead of silently falling back to "system", with no changes needed at any of
    // those call sites.
    public function getNamaAttribute(): string
    {
        return $this->name;
    }
}
