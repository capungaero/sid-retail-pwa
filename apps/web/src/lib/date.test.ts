import { describe, expect, it } from 'vitest';
import { todayKey, todayYearMonth } from './date';

describe('todayKey', () => {
  it('formats using local calendar fields, not a UTC conversion', () => {
    // 00:30 local on Jan 5 — a UTC-converting implementation (toISOString) would read this as
    // Jan 4 whenever local time is ahead of UTC (e.g. WIB, UTC+7), which is exactly the bug this
    // helper exists to avoid: a sale made in the early hours of the local day disappearing from
    // "today" until the UTC day catches up.
    expect(todayKey(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
  });
  it('zero-pads single-digit months and days', () => {
    expect(todayKey(new Date(2026, 8, 9, 12, 0))).toBe('2026-09-09');
  });
});

describe('todayYearMonth', () => {
  it('formats using local calendar fields', () => {
    expect(todayYearMonth(new Date(2026, 0, 5, 0, 30))).toBe('2026-01');
  });
});
