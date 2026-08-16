<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class HrShiftAssignment extends Model
{
    protected $table = 'hr_shift_assignments';
    protected $fillable = ['employee_id', 'shift_id', 'date'];
    protected $casts = ['date' => 'date'];

    public function shift()
    {
        return $this->belongsTo(HrShift::class, 'shift_id');
    }
}
