<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// New table (app_payment_instruments) — not a legacy table, no config/sid.php mapping needed.
final class PaymentInstrument extends Model
{
    protected $table = 'app_payment_instruments';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $fillable = ['id', 'kind', 'reference', 'amount', 'status', 'note', 'created_at', 'cleared_at'];
}
