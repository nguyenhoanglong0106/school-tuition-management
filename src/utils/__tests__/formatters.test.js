import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatTime, formatMonthYear, getInitials, getDayOfWeekLabel } from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formats a positive VND amount with the currency symbol', () => {
    expect(formatCurrency(900000)).toContain('900.000');
  });

  it('returns a zero-value display for null/undefined', () => {
    expect(formatCurrency(null)).toBe('0 ₫');
    expect(formatCurrency(undefined)).toBe('0 ₫');
  });

  it('never renders decimal fractions (VND has no minor unit here)', () => {
    // vi-VN uses ',' as the decimal separator and '.' as the thousands separator;
    // maximumFractionDigits: 0 means a comma should never appear in the output.
    expect(formatCurrency(800000.5)).not.toContain(',');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as dd/MM/yyyy', () => {
    expect(formatDate('2026-08-25')).toBe('25/08/2026');
  });

  it('returns a placeholder for missing input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatTime', () => {
  it('truncates seconds from a HH:mm:ss string', () => {
    expect(formatTime('18:00:00')).toBe('18:00');
  });

  it('passes through an already-short time', () => {
    expect(formatTime('09:30')).toBe('09:30');
  });
});

describe('formatMonthYear', () => {
  it('pads single-digit months', () => {
    expect(formatMonthYear(8, 2026)).toBe('Tháng 08/2026');
  });
});

describe('getInitials', () => {
  it('builds initials from first and last name', () => {
    expect(getInitials('Nguyễn Văn An')).toBe('NA');
  });

  it('handles a single-word name', () => {
    expect(getInitials('Admin')).toBe('A');
  });

  it('falls back for empty input', () => {
    expect(getInitials('')).toBe('?');
  });
});

describe('getDayOfWeekLabel', () => {
  it('maps 0-6 to Vietnamese weekday labels', () => {
    expect(getDayOfWeekLabel(0)).toBe('Chủ nhật');
    expect(getDayOfWeekLabel(2)).toBe('Thứ 3');
  });
});
