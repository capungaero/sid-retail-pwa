<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class AppStoreProfile extends Model
{
    protected $table = 'app_store_profile';
    protected $fillable = ['name', 'address', 'phone', 'tax_id', 'receipt_header', 'receipt_footer'];
}
