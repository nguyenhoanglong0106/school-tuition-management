import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, School, CalendarDays, CreditCard, TrendingUp, TrendingDown,
  Receipt, AlertCircle, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Skeleton, EmptyState } from '@/components/common/UI';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { financeService } from '@/services/financeService';

function MetricCard({ label, value, icon: Icon, colorClass, subValue, subLabel, to }) {
  const content = (
    <div className="stat-card group hover:shadow-elevated transition-all duration-200">
      <div className={`stat-icon ${colorClass}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="overflow-hidden">
        <p className="text-sm text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {subValue !== undefined && (
          <p className="text-xs text-slate-400 mt-0.5">{subLabel}: {subValue}</p>
        )}
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [metricsResult, chart, payments] = await Promise.all([
        supabase.rpc('get_admin_dashboard_metrics'),
        financeService.getMonthlyChartData(),
        supabase
          .from('payments')
          .select('*, students(full_name, student_code), student_fees(period_label, classes(class_name))')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setMetrics(metricsResult.data);
      setChartData(chart);
      setPendingPayments(payments.data ?? []);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const m = metrics ?? {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-slate-500 text-sm">
          {new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}
        </p>
      </div>

      {/* Metrics Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5"><Skeleton className="h-20" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Tổng học viên" value={m.total_students ?? 0} icon={Users} colorClass="bg-gradient-to-br from-indigo-400 to-indigo-600" subValue={m.active_students} subLabel="Đang học" to="/admin/students" />
          <MetricCard label="Lớp đang hoạt động" value={m.total_classes ?? 0} icon={School} colorClass="bg-gradient-to-br from-cyan-400 to-cyan-600" to="/admin/classes" />
          <MetricCard label="Lịch học hôm nay" value={m.today_sessions ?? 0} icon={CalendarDays} colorClass="bg-gradient-to-br from-violet-400 to-violet-600" subValue={m.today_absent_count} subLabel="Vắng" />
          <MetricCard label="Chờ xác nhận" value={m.pending_payments_count ?? 0} icon={Clock} colorClass="bg-gradient-to-br from-amber-400 to-amber-600" to="/admin/payments" />

          <MetricCard label="Phải thu tháng này" value={formatCurrency(m.month_expected_fees)} icon={CreditCard} colorClass="bg-gradient-to-br from-blue-400 to-blue-600" to="/admin/fees" />
          <MetricCard label="Đã thu" value={formatCurrency(m.month_collected_fees)} icon={Receipt} colorClass="bg-gradient-to-br from-green-400 to-green-600" to="/admin/fees" />
          <MetricCard label="Còn nợ" value={formatCurrency(m.month_remaining_fees)} icon={AlertCircle} colorClass="bg-gradient-to-br from-orange-400 to-orange-600" subValue={m.overdue_fees_count} subLabel="Quá hạn" to="/admin/fees" />
          <MetricCard label="Lợi nhuận tháng" value={formatCurrency(m.month_profit)} icon={m.month_profit >= 0 ? TrendingUp : TrendingDown} colorClass={m.month_profit >= 0 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-red-400 to-red-600'} to="/admin/finance" />
        </div>
      )}

      {/* Chart & Pending Payments */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Thu chi 12 tháng gần nhất</h2>
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelStyle={{ color: '#334155' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Thu" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chi" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pending Payments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Chờ xác nhận</h2>
            <Link to="/admin/payments?status=PENDING" className="text-xs text-primary-600 hover:underline">
              Xem tất cả
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-48" />
          ) : pendingPayments.length === 0 ? (
            <EmptyState icon="✅" title="Không có giao dịch chờ" description="Tất cả thanh toán đã được xử lý" />
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((p) => (
                <Link
                  key={p.id}
                  to="/admin/payments"
                  className="block p-3 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {p.students?.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {p.student_fees?.classes?.class_name} · {p.student_fees?.period_label}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-primary-600">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(p.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
