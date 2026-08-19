// Pure fee/payment calculation helpers shared by the UI and kept in sync
// with the equivalent logic in supabase/migrations/0002_functions.sql.

export function calculateFinalAmount(originalAmount, discountAmount = 0) {
  return Math.max(0, Number(originalAmount) - Number(discountAmount));
}

// Returns an error message string, or null when the amount is valid.
export function validatePaymentAmount(amount, remainingAmount) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return 'Số tiền thanh toán phải lớn hơn 0';
  if (amt > Number(remainingAmount)) return 'Số tiền vượt quá số còn nợ';
  return null;
}

// A fee's stored status only turns OVERDUE via confirm_payment(); until then
// we derive it for display so the UI never shows a stale UNPAID/PARTIAL badge.
export function computeEffectiveFeeStatus(fee) {
  if (fee.status === 'PAID' || fee.status === 'WAIVED') return fee.status;
  if (fee.due_date && new Date(fee.due_date) < new Date() && Number(fee.remaining_amount) > 0) {
    return 'OVERDUE';
  }
  return fee.status;
}
