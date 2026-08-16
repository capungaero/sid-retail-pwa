<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class AppRolePermission extends Model
{
    protected $table = 'app_role_permissions';
    protected $primaryKey = 'role';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['role', 'permissions'];
    protected $casts = ['permissions' => 'array'];
}
