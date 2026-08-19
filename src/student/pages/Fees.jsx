import { useCallback, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { studentService } from '@/services/studentService';
import { feeService } from '@/services/feeService';
import { useDataList } from '@/hooks/useDataList';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { FeeStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import PaymentModal from '@/student/components/PaymentModal';

const TABS = [
  { key: 'UNPAID', label: 'Chưa đóng' },
  { key: 'PAID', label: 'Đã đóng' },
  { key: '', label: 'Tất cả' },
];

export default function StudentFees() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [tab, setTab] = useState('UNPAID');
  const [payingFee, setPayingFee] = useState(null);

  const fetchFn = useCallback(
    ({ page, pageSize }) => student ? studentService.getStudentFees(student.id, { status: tab || undefined, page, pageSize }) : Promise.resolve({ data: [], count: 0 }),
    [student, tab]
  );
  const { data, loading, reload } = useDataList(fetchFn, [student, tab], 50);

  if (studentLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Học phí</h1>

      <div className="flex bg-slate-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={<CreditCard size={32} />} title="Không có khoản học phí nào" />
      ) : (
        <div className="space-y-3">
          {data.map((fee) => (
            <div key={fee.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{fee.classes?.class_name}</p>
                  <p className="text-xs text-slate-400">Học phí {fee.period_label}</p>
                </div>
                <FeeStatusBadge status={feeService.computeEffectiveStatus(fee)} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center py-3 bg-slate-50 rounded-xl">
                <div><p className="text-xs text-slate-400">Phải đóng</p><p className="text-sm font-semibold text-slate-700">{formatCurrency(fee.final_amount)}</p></div>
                <div><p className="text-xs text-slate-400">Đã đóng</p><p className="text-sm font-semibold text-green-600">{formatCurrency(fee.paid_amount)}</p></div>
                <div><p className="text-xs text-slate-400">Còn lại</p><p className="text-sm font-semibold text-amber-600">{formatCurrency(fee.remaining_amount)}</p></div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-slate-400">Hạn đóng: {formatDate(fee.due_date)}</p>
                {fee.remaining_amount > 0 && fee.status !== 'WAIVED' && (
                  <button onClick={() => setPayingFee(fee)} className="btn-primary btn-sm">Thanh toán</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payingFee && (
        <PaymentModal fee={payingFee} student={student} onClose={() => setPayingFee(null)} onSubmitted={() => { reload(); }} />
      )}
    </div>
  );
}
