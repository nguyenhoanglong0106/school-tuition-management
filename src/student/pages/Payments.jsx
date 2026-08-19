import { useCallback, useState } from 'react';
import { Check, Copy, Landmark, Receipt } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { paymentService } from '@/services/paymentService';
import { useDataList } from '@/hooks/useDataList';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { PaymentStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { PAYMENT_METHOD } from '@/constants';
import { useSettings } from '@/contexts/SettingsContext';

export default function StudentPayments() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { defaultBank } = useSettings();
  const [copied, setCopied] = useState('');

  const fetchFn = useCallback(
    ({ page, pageSize }) => student ? paymentService.getAll({ studentId: student.id, page, pageSize }) : Promise.resolve({ data: [], count: 0 }),
    [student]
  );
  const { data, loading } = useDataList(fetchFn, [student], 50);

  const copyValue = (value, key) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  if (studentLoading || loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Lịch sử thanh toán</h1>

      {defaultBank ? (
        <div className="card p-4 border-primary-100 bg-primary-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={18} className="text-primary-600" />
            <h2 className="font-semibold text-slate-800">Thông tin chuyển khoản</h2>
          </div>
          <div className="space-y-2">
            <PaymentInfoRow label="Ngân hàng" value={defaultBank.bank_name} />
            <PaymentInfoRow label="Chủ tài khoản" value={defaultBank.account_holder} />
            <PaymentInfoRow label="Số tài khoản" value={defaultBank.account_number} copyable onCopy={() => copyValue(defaultBank.account_number, 'account')} copied={copied === 'account'} />
            <PaymentInfoRow label="Nội dung gợi ý" value={`HP ${student?.student_code ?? ''}`} copyable onCopy={() => copyValue(`HP ${student?.student_code ?? ''}`, 'content')} copied={copied === 'content'} />
          </div>
          <p className="text-xs text-slate-500 mt-3">Khi chọn một khoản học phí để thanh toán, hệ thống sẽ hiển thị QR và nội dung chuyển khoản chính xác.</p>
        </div>
      ) : (
        <div className="card p-4 flex items-center gap-3 text-sm text-slate-500">
          <Landmark size={20} className="text-slate-300" />
          Trung tâm chưa cấu hình tài khoản nhận thanh toán.
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState icon={<Receipt size={32} />} title="Chưa có giao dịch nào" />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-slate-800">{p.payment_code}</p>
                <PaymentStatusBadge status={p.status} />
              </div>
              <p className="text-xs text-slate-400">{p.student_fees?.classes?.class_name} · {p.student_fees?.period_label}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                <span className="text-xs text-slate-400">{PAYMENT_METHOD[p.payment_method]?.label} · {formatDateTime(p.payment_date)}</span>
                <span className="font-bold text-primary-600">{formatCurrency(p.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentInfoRow({ label, value, copyable, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5 text-right">
        <span className="font-medium text-slate-700">{value || '—'}</span>
        {copyable && (
          <button type="button" onClick={onCopy} className="p-1 rounded-lg text-slate-400 hover:bg-white" aria-label={`Sao chép ${label}`}>
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
