<?php
namespace App\Http\Controllers;
use App\Models\HrShift;
use Illuminate\Http\JsonResponse;

final class ShiftController
{
    public function __invoke(): JsonResponse
    {
        $shifts = HrShift::orderBy('name')->get();
        return response()->json($shifts->map(fn (HrShift $s) => [
            'id' => (string) $s->id, 'name' => $s->name,
            'start' => substr((string) $s->start_time, 0, 5), 'end' => substr((string) $s->end_time, 0, 5),
        ]));
    }
}
