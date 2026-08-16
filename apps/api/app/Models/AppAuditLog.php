<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class AppAuditLog extends Model
{
    protected $table = 'app_audit_log';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $fillable = ['id', 'action', 'description', 'actor', 'created_at'];
}
