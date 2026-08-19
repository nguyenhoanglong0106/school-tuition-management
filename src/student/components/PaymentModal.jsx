import { useState } from 'react';
import { Copy, Check, Landmark } from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { buildPaymentInfo } from '@/services/paymentQrService';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/common/Modal';
import { FileUpload } from '@/components/common/FileUpload';
import { formatCurrency } from '@/utils/formatters';

export default function PaymentModal({ fee, student, onClose, onSubmitted }) {
  const { defaultBank } = useSettings();
  const { addToast } = useToast();
  const [copied, setCopied] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [step, setStep] = useState('qr'); // qr | confirm | done
  const [saving, setSaving] = useState(false);

  const info = buildPaymentInfo(defaultBank, fee, student);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const handleConfirmTransferred = async () => {
    setSaving(true);
    try {
      const payment = await paymentService.createPayment({
        payment_code: paymentService.generatePaymentCode(),
        student_fee_id: fee.id,
        student_id: student.id,
        amount: info.amount,
        payment_method: 'BANK_TRANSFER',
        transaction_reference: info.transferContent,
        note: 'Học viên xác nhận đã chuyển khoản qua QR',
      });

      if (receipt) {
        await paymentService.uploadReceipt(payment.id, receipt, student.profile_id);
      }

      setStep('done');
      onSubmitted?.();
    } catch (err) {
      addToast(err.message ?? 'Không thể ghi nhận thanh toán', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!info) {
    return (
      <Modal isOpen onClose={onClose} title="Thanh toán học phí">
        <div className="text-center py-6">
          <Landmark size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">Trung tâm chưa cấu hình tài khoản ngân hàng nhận thanh toán. Vui lòng liên hệ trực tiếp để đóng học phí.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Thanh toán học phí">
      {step === 'done' ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-600" /></div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Đã ghi nhận!</h3>
          <p className="text-sm text-slate-500 mb-6">Trung tâm sẽ xác nhận giao dịch của bạn trong thời gian sớm nhất. Bạn sẽ nhận được thông báo khi hoàn tất.</p>
          <button onClick={onClose} className="btn-primary w-full">Đóng</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 flex justify-center">
            <img src={info.qrUrl} alt="QR chuyển khoản" className="w-56 h-56 object-contain rounded-xl bg-white" />
          </div>

          <InfoRow label="Ngân hàng" value={info.bankName} />
          <InfoRow label="Chủ tài khoản" value={info.accountHolder} />
          <InfoRow label="Số tài khoản" value={info.accountNumber} copyable onCopy={() => handleCopy(info.accountNumber, 'acc')} copied={copied === 'acc'} />
          <InfoRow label="Số tiền" value={formatCurrency(info.amount)} highlight />
          <InfoRow label="Nội dung CK" value={info.transferContent} copyable onCopy={() => handleCopy(info.transferContent, 'content')} copied={copied === 'content'} />

          {step === 'confirm' && (
            <div className="pt-2 border-t border-slate-100">
              <p className="form-label">Đính kèm biên lai (không bắt buộc)</p>
              <FileUpload file={receipt} onFileChange={setReceipt} accept="image/*,.pdf" maxSizeMB={20} label="Tải ảnh/PDF biên lai chuyển khoản" />
            </div>
          )}

          <div className="pt-2">
            {step === 'qr' ? (
              <button onClick={() => setStep('confirm')} className="btn-primary w-full">Tôi đã chuyển khoản</button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setStep('qr')} className="btn btn-ghost flex-1">Quay lại</button>
                <button onClick={handleConfirmTransferred} disabled={saving} className="btn-primary flex-1">{saving ? 'Đang gửi...' : 'Xác nhận đã chuyển'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({ label, value, copyable, onCopy, copied, highlight }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={highlight ? 'font-bold text-primary-600' : 'font-medium text-slate-700'}>{value}</span>
        {copyable && (
          <button onClick={onCopy} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
