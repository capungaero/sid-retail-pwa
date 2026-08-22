<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class AppPaymentMethod extends Model
{
    protected $table = 'app_payment_methods';
    protected $fillable = ['code', 'name', 'type', 'legacy_kas_code', 'active', 'sort_order'];
    protected $casts = ['active' => 'boolean', 'sort_order' => 'integer'];
}
