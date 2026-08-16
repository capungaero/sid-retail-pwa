<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

// Maps to the legacy `karyawan` table via config/sid.php so Sanctum can issue
// tokens to legacy employee identities without a duplicate `users` table.
final class Employee extends Authenticatable
{
    use HasApiTokens;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $hidden = ['password', 'pwd_del_trx'];

    public function __construct(array $attributes = [])
    {
        $this->table = config('sid.auth.table');
        $this->primaryKey = config('sid.auth.columns.id');
        parent::__construct($attributes);
    }
}
