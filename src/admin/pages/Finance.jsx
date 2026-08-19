import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Plus, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { financeService } from '@/services/financeService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { DataTable } from '@/components/common/DataTable';
import { Pagination, EmptyState, Skeleton } from '@/components/common/UI';
import { Select, Input, Textarea } from '@/components/common/Form';
import { Modal } from '@/components/common/Modal';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportExcel';

const RANGE_PRESETS = {
  today: () => { const d = new Date().toISOString().split('T')[0]; return { from: d, to: d }; },
  week: () => { const now = new Date(); const day = now.getDay() || 7; const start = new Date(now); start.setDate(now.getDate() - day + 1); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }; },
  month: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }; },
  year: () => { const now = new Date(); return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().split('T')[0] }; },
};

export default function Finance() {
  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState(RANGE_PRESETS.month());
  const [type, setType] = useState('');
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);

  useEffect(() => {
    if (preset !== 'custom') setRange(RANGE_PRESETS[preset]());
  }, [preset]);

  useEffect(() => {
    financeService.getSummary(range.from, range.to).then(setSummary);
  }, [range]);

  useEffect(() => {
    setChartLoading(true);
    financeService.getMonthlyChartData().then((d) => { setChartData(d); setChartLoading(false); });
  }, []);

  const fetchFn = useCallback(
    ({ page, pageSize }) => financeService.getAll({ type: type || null, dateFrom: range.from, dateTo: range.to, page, pageSize }),
    [type, range]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [type, range]);

  const handleExport = () => {
    exportToExcel(
      data.map((t) => ({ 'Mã GD': t.transaction_code, Loại: t.type === 'INCOME' ? 'Thu' : 'Chi', 'Danh mục': t.financial_categories?.name, 'Số tiền': t.amount, Ngày: formatDate(t.transaction_date), 'Diễn giải': t.description })),
      'thu-chi', 'Thu chi'
    );
  };

  const columns = [
    { key: 'code', header: 'Mã GD', render: (t) => t.transaction_code },
    { key: 'type', header: 'Loại', render: (t) => <span className={`badge ${t.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`}>{t.type === 'INCOME' ? 'Thu' : 'Chi'}</span> },
    { key: 'category', header: 'Danh mục', render: (t) => t.financial_categories?.name ?? '—' },
    { key: 'amount', header: 'Số tiền', render: (t) => <span className={`font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}</span> },
    { key: 'date', header: 'Ngày', render: (t) => formatDate(t.transaction_date) },
    { key: 'description', header: 'Diễn giải', render: (t) => <span className="text-slate-500">{t.description || '—'}</span> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thu chi</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi dòng tiền của trung tâm</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-ghost"><Download size={16} /> Xuất Excel</button>
          <button onClick={() => setAddModal(true)} className="btn-primary"><Plus size={16} /> Thêm khoản chi</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Tổng thu" value={summary?.income} icon={TrendingUp} color="from-green-400 to-green-600" />
        <SummaryCard label="Tổng chi" value={summary?.expense} icon={TrendingDown} color="from-red-400 to-red-600" />
        <SummaryCard label="Lợi nhuận" value={summary?.profit} icon={Wallet} color={summary?.profit >= 0 ? 'from-primary-400 to-primary-600' : 'from-orange-400 to-orange-600'} />
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Biểu đồ Thu / Chi 12 tháng</h2>
        {chartLoading ? <Skeleton className="h-64" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Thu" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Chi" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={preset} onChange={(e) => setPreset(e.target.value)} placeholder={null}
          options={[{ value: 'today', label: 'Hôm nay' }, { value: 'week', label: 'Tuần này' }, { value: 'month', label: 'Tháng này' }, { value: 'year', label: 'Năm nay' }, { value: 'custom', label: 'Tùy chỉnh' }]} className="sm:w-44" />
        {preset === 'custom' && (
          <>
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="sm:w-44" />
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="sm:w-44" />
          </>
        )}
        <Select value={type} onChange={(e) => setType(e.target.value)} placeholder="Tất cả" options={[{ value: 'INCOME', label: 'Thu' }, { value: 'EXPENSE', label: 'Chi' }]} className="sm:w-40" />
      </div>

      <DataTable columns={columns} data={data} loading={loading} emptyState={<EmptyState icon={<Wallet size={32} />} title="Chưa có giao dịch nào trong khoảng thời gian này" />} />
      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {addModal && <AddExpenseModal onClose={() => setAddModal(false)} onDone={() => { setAddModal(false); reload(); financeService.getSummary(range.from, range.to).then(setSummary); }} />}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon bg-gradient-to-br ${color}`}><Icon size={22} className="text-white" /></div>
      <div><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(value ?? 0)}</p></div>
    </div>
  );
}

function AddExpenseModal({ onClose, onDone }) {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category_id: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], payment_method: 'CASH', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    financeService.getCategories('EXPENSE').then(setCategories);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (amt <= 0) { addToast('Số tiền phải lớn hơn 0', 'error'); return; }
    setSaving(true);
    try {
      await financeService.createTransaction({
        ...form, amount: amt, type: 'EXPENSE',
        transaction_code: financeService.generateTransactionCode('EXPENSE'),
      });
      addToast('Đã ghi nhận khoản chi');
      onDone();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu khoản chi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Thêm khoản chi">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Danh mục" required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <Input label="Số tiền" type="number" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Ngày chi" type="date" required value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
        <Select label="Phương thức" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} options={[{ value: 'CASH', label: 'Tiền mặt' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }]} />
        <Textarea label="Diễn giải" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu khoản chi'}</button>
        </div>
      </form>
    </Modal>
  );
}
