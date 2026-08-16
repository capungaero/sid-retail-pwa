<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class HrLeaveRequest extends Model
{
    protected $table = 'hr_leave_requests';
    protected $fillable = ['employee_id', 'type', 'start_date', 'end_date', 'hours', 'reason', 'status'];
    protected $casts = ['start_date' => 'date', 'end_date' => 'date'];
}
