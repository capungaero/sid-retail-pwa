<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class HrAttendance extends Model
{
    protected $table = 'hr_attendance';
    protected $fillable = ['employee_id', 'date', 'check_in', 'check_out', 'status'];
    protected $casts = ['date' => 'date'];
}
