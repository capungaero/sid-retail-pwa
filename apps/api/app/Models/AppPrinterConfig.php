<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class AppPrinterConfig extends Model
{
    protected $table = 'app_printer_config';
    protected $fillable = ['name', 'connection', 'paper_width'];
}
