import { useEffect, useState } from 'react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { attendanceService } from '@/services/attendanceService';
import { Select } from '@/components/common/Form';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { AttendanceStatusBadge } from '@/components/common/Badge';
import { formatDate, getCurrentMonthYear } from '@/utils/formatters';
import { MONTHS_VN } from '@/constants';

export default function StudentAttendance() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) load();
  }, [student, month, year]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        attendanceService.getAttendanceSummary(student.id, month, year),
        attendanceService.getMyAttendance(student.id, { month, year }),
      ]);
      setSummary(s);
      setRecords(r);
    } finally {
      setLoading(false);
    }
  };

  if (studentLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Điểm danh</h1>

      <div className="flex gap-3">
        <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} placeholder={null} options={MONTHS_VN.map((m, i) => ({ value: i + 1, label: m }))} className="flex-1" />
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} placeholder={null} options={[year - 1, year, year + 1].map((y) => ({ value: y, label: `${y}` }))} className="w-28" />
      </div>

      {loading ? <Skeleton className="h-24" /> : (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-600 mb-3">Tổng hợp {MONTHS_VN[month - 1]}/{year}</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-xl font-bold text-green-600">{summary.present}</p><p className="text-[11px] text-slate-400">Có mặt</p></div>
            <div><p className="text-xl font-bold text-red-500">{summary.absent}</p><p className="text-[11px] text-slate-400">Vắng</p></div>
            <div><p className="text-xl font-bold text-amber-500">{summary.excused}</p><p className="text-[11px] text-slate-400">Có phép</p></div>
            <div><p className="text-xl font-bold text-sky-500">{summary.late}</p><p className="text-[11px] text-slate-400">Đi trễ</p></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : records.length === 0 ? (
        <EmptyState icon="✅" title="Chưa có dữ liệu điểm danh trong tháng này" />
      ) : (
        <div className="space-y-2">
          {records.map((a) => (
            <div key={a.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{a.class_sessions?.classes?.class_name}</p>
                <p className="text-xs text-slate-400">{formatDate(a.class_sessions?.session_date)}</p>
              </div>
              <AttendanceStatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
