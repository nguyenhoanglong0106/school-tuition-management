import { describe, it, expect } from 'vitest';
import { calculateFinalAmount, validatePaymentAmount, computeEffectiveFeeStatus } from '@/utils/feeCalculations';

describe('calculateFinalAmount', () => {
  it('subtracts the discount from the original amount', () => {
    expect(calculateFinalAmount(900000, 100000)).toBe(800000);
  });

  it('never goes negative when discount exceeds the original fee', () => {
    expect(calculateFinalAmount(500000, 900000)).toBe(0);
  });

  it('defaults discount to 0', () => {
    expect(calculateFinalAmount(500000)).toBe(500000);
  });
});

describe('validatePaymentAmount', () => {
  it('rejects zero or negative amounts', () => {
    expect(validatePaymentAmount(0, 500000)).toMatch(/lớn hơn 0/);
    expect(validatePaymentAmount(-1000, 500000)).toMatch(/lớn hơn 0/);
  });

  it('rejects an amount greater than the remaining debt', () => {
    expect(validatePaymentAmount(600000, 500000)).toMatch(/vượt quá/);
  });

  it('accepts a valid partial or full payment', () => {
    expect(validatePaymentAmount(300000, 500000)).toBeNull();
    expect(validatePaymentAmount(500000, 500000)).toBeNull();
  });
});

describe('computeEffectiveFeeStatus', () => {
  it('keeps PAID and WAIVED as-is regardless of due date', () => {
    expect(computeEffectiveFeeStatus({ status: 'PAID', due_date: '2020-01-01', remaining_amount: 0 })).toBe('PAID');
    expect(computeEffectiveFeeStatus({ status: 'WAIVED', due_date: '2020-01-01', remaining_amount: 500000 })).toBe('WAIVED');
  });

  it('derives OVERDUE when the due date has passed and money is still owed', () => {
    expect(computeEffectiveFeeStatus({ status: 'UNPAID', due_date: '2020-01-01', remaining_amount: 500000 })).toBe('OVERDUE');
  });

  it('does not mark as overdue when fully paid off', () => {
    expect(computeEffectiveFeeStatus({ status: 'UNPAID', due_date: '2020-01-01', remaining_amount: 0 })).toBe('UNPAID');
  });

  it('keeps the stored status when due date is in the future', () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    expect(computeEffectiveFeeStatus({ status: 'PARTIAL', due_date: future, remaining_amount: 200000 })).toBe('PARTIAL');
  });
});
