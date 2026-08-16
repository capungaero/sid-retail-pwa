<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class HrShift extends Model
{
    protected $table = 'hr_shifts';
    protected $fillable = ['name', 'start_time', 'end_time'];
}
