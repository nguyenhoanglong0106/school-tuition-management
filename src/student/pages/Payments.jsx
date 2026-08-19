import { useCallback } from 'react';
import { Receipt } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { paymentService } from '@/services/paymentService';
import { useDataList } from '@/hooks/useDataList';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { PaymentStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { PAYMENT_METHOD } from '@/constants';

export default function StudentPayments() {
  const { student, loading: studentLoading } = useCurrentStudent();

  const fetchFn = useCallback(
    ({ page, pageSize }) => student ? paymentService.getAll({ studentId: student.id, page, pageSize }) : Promise.resolve({ data: [], count: 0 }),
    [student]
  );
  const { data, loading } = useDataList(fetchFn, [student], 50);

  if (studentLoading || loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Lịch sử thanh toán</h1>

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
