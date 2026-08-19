import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Layers, Download } from 'lucide-react';
import { feeService } from '@/services/feeService';
import { classService } from '@/services/classService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { DataTable } from '@/components/common/DataTable';
import { Pagination, EmptyState } from '@/components/common/UI';
import { Select, Input } from '@/components/common/Form';
import { Modal } from '@/components/common/Modal';
import { FeeStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate, getCurrentMonthYear } from '@/utils/formatters';
import { FEE_STATUS, MONTHS_VN } from '@/constants';
import { exportToExcel } from '@/utils/exportExcel';

export default function Fees() {
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [status, setStatus] = useState('');
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [batchModal, setBatchModal] = useState(false);

  useEffect(() => {
    classService.getAll({ pageSize: 100 }).then((r) => setClasses(r.data));
  }, []);

  useEffect(() => {
    feeService.getMonthSummary(month, year).then(setSummary);
  }, [month, year]);

  const fetchFn = useCallback(
    ({ page, pageSize }) => feeService.getAll({ classId: classId || null, month, year, status: status || null, page, pageSize }),
    [classId, month, year, status]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [classId, month, year, status]);

  const handleExport = () => {
    exportToExcel(
      data.map((f) => ({
        'Mã HV': f.students?.student_code, 'Học viên': f.students?.full_name, Lớp: f.classes?.class_name,
        Kỳ: f.period_label, 'Phải thu': f.final_amount, 'Đã đóng': f.paid_amount, 'Còn lại': f.remaining_amount,
        Hạn: formatDate(f.due_date), 'Trạng thái': FEE_STATUS[feeService.computeEffectiveStatus(f)]?.label,
      })),
      `cong-no-hoc-phi-${month}-${year}`, 'Học phí'
    );
  };

  const columns = [
    { key: 'student', header: 'Học viên', render: (f) => <div><p className="font-medium text-slate-800">{f.students?.full_name}</p><p className="text-xs text-slate-400">{f.students?.student_code}</p></div> },
    { key: 'class', header: 'Lớp', render: (f) => f.classes?.class_name ?? '—' },
    { key: 'period', header: 'Kỳ', render: (f) => f.period_label },
    { key: 'final_amount', header: 'Phải thu', render: (f) => formatCurrency(f.final_amount) },
    { key: 'paid_amount', header: 'Đã đóng', render: (f) => formatCurrency(f.paid_amount) },
    { key: 'remaining_amount', header: 'Còn lại', render: (f) => <span className="font-semibold">{formatCurrency(f.remaining_amount)}</span> },
    { key: 'due_date', header: 'Hạn', render: (f) => formatDate(f.due_date) },
    { key: 'status', header: 'Trạng thái', render: (f) => <FeeStatusBadge status={feeService.computeEffectiveStatus(f)} /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Học phí</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi công nợ học phí toàn trung tâm</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-ghost"><Download size={16} /> Xuất Excel</button>
          <button onClick={() => setBatchModal(true)} className="btn-primary"><Layers size={16} /> Tạo học phí hàng loạt</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Phải thu" value={summary?.total_expected} color="text-primary-600" />
        <SummaryCard label="Đã thu" value={summary?.total_collected} color="text-green-600" />
        <SummaryCard label="Còn nợ" value={summary?.total_remaining} color="text-amber-600" />
        <SummaryCard label="Quá hạn" value={summary?.count_overdue} isCount color="text-red-600" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Tất cả lớp" options={classes.map((c) => ({ value: c.id, label: c.class_name }))} className="sm:w-56" />
        <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} options={MONTHS_VN.map((m, i) => ({ value: i + 1, label: m }))} placeholder={null} className="sm:w-40" />
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} options={[year - 1, year, year + 1].map((y) => ({ value: y, label: `Năm ${y}` }))} placeholder={null} className="sm:w-36" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Tất cả trạng thái" options={Object.entries(FEE_STATUS).map(([value, s]) => ({ value, label: s.label }))} className="sm:w-52" />
      </div>

      <DataTable columns={columns} data={data} loading={loading}
        emptyState={<EmptyState icon={<CreditCard size={32} />} title="Chưa có khoản học phí nào cho kỳ này" description='Nhấn "Tạo học phí hàng loạt" để bắt đầu.' />} />

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {batchModal && (
        <BatchFeeModal classes={classes} onClose={() => setBatchModal(false)} onDone={() => { setBatchModal(false); reload(); feeService.getMonthSummary(month, year).then(setSummary); }} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, isCount }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{isCount ? (value ?? 0) : formatCurrency(value ?? 0)}</p>
    </div>
  );
}

function BatchFeeModal({ classes, onClose, onDone }) {
  const { addToast } = useToast();
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [dueDate, setDueDate] = useState(new Date(curYear, curMonth - 1, 25).toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId) return;
    setSaving(true);
    try {
      const result = await feeService.createMonthlyFees(classId, month, year, dueDate);
      addToast(`Đã tạo ${result.created_count} khoản học phí (bỏ qua ${result.skipped_count} trùng lặp)`);
      onDone();
    } catch (err) {
      addToast(err.message ?? 'Không thể tạo học phí', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Tạo học phí hàng loạt">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Lớp học" required value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Chọn lớp" options={classes.map((c) => ({ value: c.id, label: c.class_name }))} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tháng" value={month} onChange={(e) => setMonth(Number(e.target.value))} placeholder={null} options={MONTHS_VN.map((m, i) => ({ value: i + 1, label: m }))} />
          <Select label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value))} placeholder={null} options={[year - 1, year, year + 1].map((y) => ({ value: y, label: `${y}` }))} />
        </div>
        <Input label="Hạn đóng" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <p className="text-xs text-slate-400">Hệ thống sẽ tự tạo học phí cho toàn bộ học viên đang học trong lớp, áp dụng mức phí riêng và ưu đãi (nếu có), bỏ qua các khoản đã tồn tại.</p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving || !classId} className="btn-primary flex-1">{saving ? 'Đang tạo...' : 'Tạo học phí'}</button>
        </div>
      </form>
    </Modal>
  );
}
