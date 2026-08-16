<?php
namespace App\Http\Controllers;
use App\Models\HrShiftAssignment;
use App\Repositories\LegacyEmployeeRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ShiftAssignmentController
{
    public function __construct(private readonly LegacyEmployeeRepository $employees) {}

    public function index(): JsonResponse
    {
        $assignments = HrShiftAssignment::orderByDesc('date')->get();
        $names = $this->employees->names($assignments->pluck('employee_id')->all());
        return response()->json($assignments->map(fn (HrShiftAssignment $a) => $this->present($a, $names[$a->employee_id] ?? '')));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => 'required|string|max:40',
            'shiftId' => 'required|integer|exists:hr_shifts,id',
            'date' => 'required|date_format:Y-m-d',
        ]);
        $assignment = HrShiftAssignment::updateOrCreate(
            ['employee_id' => $data['employeeId'], 'date' => $data['date']],
            ['shift_id' => $data['shiftId']]
        );
        return response()->json($this->present($assignment, $this->employees->name($data['employeeId']) ?? ''));
    }

    private function present(HrShiftAssignment $a, string $employeeName): array
    {
        return ['id' => (string) $a->id, 'employeeId' => $a->employee_id, 'employeeName' => $employeeName, 'shiftId' => (string) $a->shift_id, 'date' => $a->date->format('Y-m-d')];
    }
}
