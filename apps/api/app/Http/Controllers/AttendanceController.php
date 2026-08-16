<?php
namespace App\Http\Controllers;
use App\Models\HrAttendance;
use App\Models\HrShiftAssignment;
use App\Repositories\LegacyEmployeeRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Attendance status (hadir/telat/pulang-cepat) is always computed here from the
// employee's scheduled shift, never trusted from the client — mirrors
// apps/web/src/lib/hrd.ts's computeAttendanceStatus/findScheduledShift.
final class AttendanceController
{
    private const LATE_THRESHOLD_MINUTES = 10;
    private const EARLY_LEAVE_THRESHOLD_MINUTES = 10;

    public function __construct(private readonly LegacyEmployeeRepository $employees) {}

    public function index(): JsonResponse
    {
        $entries = HrAttendance::orderByDesc('date')->get();
        $names = $this->employees->names($entries->pluck('employee_id')->all());
        return response()->json($entries->map(fn (HrAttendance $e) => $this->present($e, $names[$e->employee_id] ?? '')));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => 'required|string|max:40',
            'date' => 'required|date_format:Y-m-d',
            'checkIn' => 'required|date_format:H:i',
            'checkOut' => 'nullable|date_format:H:i',
        ]);

        $status = $this->computeStatus($data['employeeId'], $data['date'], $data['checkIn'], $data['checkOut'] ?? null);
        $entry = HrAttendance::updateOrCreate(
            ['employee_id' => $data['employeeId'], 'date' => $data['date']],
            ['check_in' => $data['checkIn'], 'check_out' => $data['checkOut'] ?? null, 'status' => $status]
        );
        return response()->json($this->present($entry, $this->employees->name($data['employeeId']) ?? ''));
    }

    private function computeStatus(string $employeeId, string $date, string $checkIn, ?string $checkOut): string
    {
        $assignment = HrShiftAssignment::where('employee_id', $employeeId)->whereDate('date', $date)->with('shift')->first();
        $shift = $assignment?->shift;
        if (!$shift) return 'hadir';

        $start = substr((string) $shift->start_time, 0, 5);
        $end = substr((string) $shift->end_time, 0, 5);
        $lateMinutes = $this->toMinutes($checkIn) - $this->toMinutes($start);
        if ($lateMinutes > self::LATE_THRESHOLD_MINUTES) return 'telat';
        if ($checkOut) {
            $earlyMinutes = $this->toMinutes($end) - $this->toMinutes($checkOut);
            if ($earlyMinutes > self::EARLY_LEAVE_THRESHOLD_MINUTES) return 'pulang-cepat';
        }
        return 'hadir';
    }

    private function toMinutes(string $hhmm): int
    {
        [$h, $m] = array_map('intval', explode(':', $hhmm));
        return $h * 60 + $m;
    }

    private function present(HrAttendance $e, string $employeeName): array
    {
        return [
            'id' => (string) $e->id, 'employeeId' => $e->employee_id, 'employeeName' => $employeeName,
            'date' => $e->date->format('Y-m-d'), 'checkIn' => substr((string) $e->check_in, 0, 5),
            'checkOut' => $e->check_out ? substr((string) $e->check_out, 0, 5) : null, 'status' => $e->status,
        ];
    }
}
