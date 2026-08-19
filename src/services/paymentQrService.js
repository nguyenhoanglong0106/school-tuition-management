/**
 * VietQR Payment QR Service
 * Generates VietQR-compatible QR code URLs using vietqr.io public API
 * This service generates a QR that works with most Vietnamese banking apps.
 *
 * Format: https://img.vietqr.io/image/{bankCode}-{accountNumber}-{template}.png
 * With optional query params: amount, addInfo, accountName
 */

/**
 * Build a VietQR image URL for displaying in <img> tag
 * @param {object} bankAccount - bank account object from DB
 * @param {number} amount - payment amount in VND
 * @param {string} transferContent - transfer reference string (e.g. "HP HS000001 HP082026000001")
 * @returns {string} QR image URL
 */
export const buildVietQrUrl = (bankAccount, amount, transferContent) => {
  if (!bankAccount) return null;

  const { bank_code, account_number, account_holder } = bankAccount;

  // VietQR public image API
  const base = 'https://img.vietqr.io/image';
  const template = 'compact2'; // compact, compact2, print, qr_only

  const params = new URLSearchParams({
    amount: Math.round(amount),
    addInfo: transferContent,
    accountName: account_holder,
  });

  return `${base}/${bank_code}-${account_number}-${template}.png?${params.toString()}`;
};

/**
 * Build transfer content string
 * Format: "HP {studentCode} {feeCode}"
 */
export const buildTransferContent = (studentCode, feeCode) => {
  return `HP ${studentCode} ${feeCode}`;
};

/**
 * Build full payment info object for display
 */
export const buildPaymentInfo = (bankAccount, fee, student) => {
  if (!bankAccount || !fee || !student) return null;

  const transferContent = buildTransferContent(student.student_code, fee.fee_code);
  const amount = Number(fee.remaining_amount);

  return {
    bankName: bankAccount.bank_name,
    bankCode: bankAccount.bank_code,
    accountNumber: bankAccount.account_number,
    accountHolder: bankAccount.account_holder,
    amount,
    transferContent,
    qrUrl: buildVietQrUrl(bankAccount, amount, transferContent),
  };
};
