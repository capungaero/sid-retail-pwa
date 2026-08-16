import { describe, expect, it } from 'vitest';
import { computeAttendanceStatus, findScheduledShift, isInMonth, monthlyRecap, toMinutes, workDurationMinutes } from './hrd';
import type { AttendanceEntry, Employee, LeaveRequest, ShiftAssignment, ShiftDef } from '../types';

describe('toMinutes', () => {
  it('converts HH:mm into minutes since midnight', () => {
    expect(toMinutes('07:00')).toBe(420);
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('23:59')).toBe(1439);
  });
});

describe('workDurationMinutes', () => {
  it('computes a same-day duration', () => {
    expect(workDurationMinutes('07:00', '15:00')).toBe(480);
  });
  it('wraps overnight shifts (check-out after midnight)', () => {
    expect(workDurationMinutes('22:00', '06:00')).toBe(480);
  });
  it('returns 0 when check-in equals check-out', () => {
    expect(workDurationMinutes('08:00', '08:00')).toBe(0);
  });
});

const pagi: ShiftDef = { id: 'shift-pagi', name: 'Pagi', start: '07:00', end: '15:00' };
const malam: ShiftDef = { id: 'shift-malam', name: 'Malam', start: '22:00', end: '06:00' };

describe('findScheduledShift', () => {
  const assignments: ShiftAssignment[] = [{ id: 'sa-1', employeeId: 'emp-1', employeeName: 'Budi', shiftId: 'shift-pagi', date: '2026-08-10' }];
  const shifts = [pagi, malam];
  it('returns the shift assigned to the employee on that date', () => {
    expect(findScheduledShift(assignments, shifts, 'emp-1', '2026-08-10')).toEqual(pagi);
  });
  it('returns undefined when no assignment exists for that employee/date', () => {
    expect(findScheduledShift(assignments, shifts, 'emp-1', '2026-08-11')).toBeUndefined();
    expect(findScheduledShift(assignments, shifts, 'emp-2', '2026-08-10')).toBeUndefined();
  });
});

describe('computeAttendanceStatus', () => {
  it('is hadir with no scheduled shift to compare against', () => {
    expect(computeAttendanceStatus('09:00', '17:00', undefined)).toBe('hadir');
  });
  it('is hadir when within the late/early thresholds', () => {
    expect(computeAttendanceStatus('07:05', '15:00', pagi)).toBe('hadir');
    expect(computeAttendanceStatus('06:55', '14:52', pagi)).toBe('hadir');
  });
  it('is telat when check-in is more than the threshold late', () => {
    expect(computeAttendanceStatus('07:20', '15:00', pagi)).toBe('telat');
  });
  it('is pulang-cepat when check-out is more than the threshold early and check-in was on time', () => {
    expect(computeAttendanceStatus('06:58', '14:30', pagi)).toBe('pulang-cepat');
  });
  it('prioritizes telat over pulang-cepat when both apply', () => {
    expect(computeAttendanceStatus('07:30', '14:20', pagi)).toBe('telat');
  });
  it('is hadir when there is no check-out yet, even if check-in was on time', () => {
    expect(computeAttendanceStatus('06:58', undefined, pagi)).toBe('hadir');
  });
  it('handles an overnight shift correctly', () => {
    expect(computeAttendanceStatus('22:25', '06:00', malam)).toBe('telat');
  });
});

describe('isInMonth', () => {
  it('matches dates within the given year-month', () => {
    expect(isInMonth('2026-08-14', '2026-08')).toBe(true);
    expect(isInMonth('2026-08-14T10:00:00.000Z', '2026-08')).toBe(true);
  });
  it('rejects dates outside the given year-month', () => {
    expect(isInMonth('2026-07-31', '2026-08')).toBe(false);
  });
});

describe('monthlyRecap', () => {
  const employees: Employee[] = [{ id: 'emp-1', name: 'Budi Santoso', role: 'Kasir' }, { id: 'emp-2', name: 'Siti Rahma', role: 'Pramuniaga' }];
  const attendance: AttendanceEntry[] = [
    { id: 'att-1', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-08-10', checkIn: '06:55', checkOut: '15:05', status: 'hadir' },
    { id: 'att-2', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-08-11', checkIn: '07:20', checkOut: '15:00', status: 'telat' },
    { id: 'att-3', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-08-12', checkIn: '06:58', checkOut: '14:30', status: 'pulang-cepat' },
    // Outside the target month, should not be counted.
    { id: 'att-4', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-07-05', checkIn: '07:00', checkOut: '15:00', status: 'hadir' },
    { id: 'att-5', employeeId: 'emp-2', employeeName: 'Siti Rahma', date: '2026-08-10', checkIn: '15:00', checkOut: '22:00', status: 'hadir' }
  ];
  const leaveRequests: LeaveRequest[] = [
    { id: 'leave-1', employeeId: 'emp-2', employeeName: 'Siti Rahma', type: 'sakit', startDate: '2026-08-05', endDate: '2026-08-06', status: 'disetujui', createdAt: '2026-08-04T00:00:00.000Z' },
    // Not approved yet, should not count toward the recap.
    { id: 'leave-2', employeeId: 'emp-2', employeeName: 'Siti Rahma', type: 'cuti', startDate: '2026-08-20', endDate: '2026-08-22', status: 'diajukan', createdAt: '2026-08-14T00:00:00.000Z' },
    { id: 'leave-3', employeeId: 'emp-1', employeeName: 'Budi Santoso', type: 'lembur', startDate: '2026-08-12', endDate: '2026-08-12', hours: 3, status: 'disetujui', createdAt: '2026-08-12T00:00:00.000Z' }
  ];
  const recap = monthlyRecap(employees, attendance, leaveRequests, '2026-08');

  it('tallies attendance status counts per employee within the month', () => {
    const budi = recap.find(r => r.employeeId === 'emp-1')!;
    expect(budi.hadir).toBe(1);
    expect(budi.telat).toBe(1);
    expect(budi.pulangCepat).toBe(1);
  });
  it('counts approved leave days as izinSakitCuti, using the inclusive day range', () => {
    const siti = recap.find(r => r.employeeId === 'emp-2')!;
    expect(siti.izinSakitCuti).toBe(2);
  });
  it('ignores leave requests that are not yet approved', () => {
    const siti = recap.find(r => r.employeeId === 'emp-2')!;
    expect(siti.izinSakitCuti).toBe(2); // only the 2-day sakit, not the 3-day cuti still diajukan
  });
  it('sums approved lembur hours separately from izin/sakit/cuti days', () => {
    const budi = recap.find(r => r.employeeId === 'emp-1')!;
    expect(budi.overtimeHours).toBe(3);
    expect(budi.izinSakitCuti).toBe(0);
  });
  it('returns one row per employee even with no activity', () => {
    expect(recap).toHaveLength(2);
  });
});
