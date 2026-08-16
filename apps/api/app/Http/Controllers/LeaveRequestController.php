<?php
namespace App\Http\Controllers;
use App\Models\HrLeaveRequest;
use App\Repositories\LegacyEmployeeRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LeaveRequestController
{
    public function __construct(private readonly LegacyEmployeeRepository $employees) {}

    public function index(): JsonResponse
    {
        $requests = HrLeaveRequest::orderByDesc('created_at')->get();
        $names = $this->employees->names($requests->pluck('employee_id')->all());
        return response()->json($requests->map(fn (HrLeaveRequest $r) => $this->present($r, $names[$r->employee_id] ?? '')));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => 'required|string|max:40',
            'type' => 'required|in:izin,sakit,cuti,lembur',
            'startDate' => 'required|date_format:Y-m-d',
            'endDate' => 'required|date_format:Y-m-d|after_or_equal:startDate',
            'hours' => 'nullable|numeric|min:0',
            'reason' => 'nullable|string|max:255',
        ]);
        $leave = HrLeaveRequest::create([
            'employee_id' => $data['employeeId'], 'type' => $data['type'],
            'start_date' => $data['startDate'], 'end_date' => $data['endDate'],
            'hours' => $data['hours'] ?? null, 'reason' => $data['reason'] ?? null, 'status' => 'diajukan',
        ]);
        return response()->json($this->present($leave, $this->employees->name($data['employeeId']) ?? ''));
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:diajukan,disetujui,ditolak']);
        $leave = HrLeaveRequest::findOrFail($id);
        $leave->update(['status' => $data['status']]);
        return response()->json($this->present($leave, $this->employees->name($leave->employee_id) ?? ''));
    }

    private function present(HrLeaveRequest $r, string $employeeName): array
    {
        return [
            'id' => (string) $r->id, 'employeeId' => $r->employee_id, 'employeeName' => $employeeName,
            'type' => $r->type, 'startDate' => $r->start_date->format('Y-m-d'), 'endDate' => $r->end_date->format('Y-m-d'),
            'hours' => $r->hours !== null ? (float) $r->hours : null, 'reason' => $r->reason, 'status' => $r->status,
            'createdAt' => $r->created_at->toIso8601String(),
        ];
    }
}
