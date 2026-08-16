import type { AttendanceEntry, AttendanceStatus, Employee, LeaveRequest, ShiftAssignment, ShiftDef } from '../types';

// Minutes late/early beyond which attendance is flagged telat / pulang cepat instead of hadir.
export const LATE_THRESHOLD_MINUTES = 10;
export const EARLY_LEAVE_THRESHOLD_MINUTES = 10;

// Parses an "HH:mm" string into minutes since midnight.
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Work duration in minutes between check-in and check-out, handling shifts that cross midnight
// (e.g. Malam 22:00-06:00) by wrapping the difference into the next day.
export function workDurationMinutes(checkIn: string, checkOut: string): number {
  const diff = toMinutes(checkOut) - toMinutes(checkIn);
  return diff >= 0 ? diff : diff + 24 * 60;
}

// Finds the shift an employee is scheduled for on a given date, if any.
export function findScheduledShift(assignments: ShiftAssignment[], shifts: ShiftDef[], employeeId: string, date: string): ShiftDef | undefined {
  const assignment = assignments.find(a => a.employeeId === employeeId && a.date === date);
  return assignment ? shifts.find(s => s.id === assignment.shiftId) : undefined;
}

// Attendance status vs the scheduled shift: telat takes priority over pulang cepat; without a
// scheduled shift there is nothing to compare against, so attendance is simply hadir.
export function computeAttendanceStatus(checkIn: string, checkOut: string | undefined, shift: ShiftDef | undefined): AttendanceStatus {
  if (!shift) return 'hadir';
  const lateMinutes = toMinutes(checkIn) - toMinutes(shift.start);
  if (lateMinutes > LATE_THRESHOLD_MINUTES) return 'telat';
  if (checkOut) {
    const earlyMinutes = toMinutes(shift.end) - toMinutes(checkOut);
    if (earlyMinutes > EARLY_LEAVE_THRESHOLD_MINUTES) return 'pulang-cepat';
  }
  return 'hadir';
}

// True when an ISO/plain date string ("YYYY-MM-DD...") falls within the given "YYYY-MM" month.
export function isInMonth(date: string, yearMonth: string): boolean {
  return date.slice(0, 7) === yearMonth;
}

export type MonthlyRecapRow = { employeeId: string; employeeName: string; hadir: number; telat: number; pulangCepat: number; izinSakitCuti: number; overtimeHours: number };

// Aggregates one employee's attendance + leave requests for a given "YYYY-MM" month into recap
// counters: attendance status tallies, approved izin/sakit/cuti days, and approved lembur hours.
export function monthlyRecap(employees: Employee[], attendance: AttendanceEntry[], leaveRequests: LeaveRequest[], yearMonth: string): MonthlyRecapRow[] {
  return employees.map(employee => {
    const row: MonthlyRecapRow = { employeeId: employee.id, employeeName: employee.name, hadir: 0, telat: 0, pulangCepat: 0, izinSakitCuti: 0, overtimeHours: 0 };
    attendance.filter(a => a.employeeId === employee.id && isInMonth(a.date, yearMonth)).forEach(a => {
      if (a.status === 'hadir') row.hadir += 1;
      else if (a.status === 'telat') row.telat += 1;
      else row.pulangCepat += 1;
    });
    leaveRequests.filter(l => l.employeeId === employee.id && l.status === 'disetujui' && isInMonth(l.startDate, yearMonth)).forEach(l => {
      if (l.type === 'lembur') row.overtimeHours += l.hours ?? 0;
      else row.izinSakitCuti += leaveDayCount(l);
    });
    return row;
  });
}

// Inclusive day count for a leave request's date range.
function leaveDayCount(request: LeaveRequest): number {
  const start = new Date(`${request.startDate}T00:00:00`).getTime();
  const end = new Date(`${request.endDate}T00:00:00`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
}
