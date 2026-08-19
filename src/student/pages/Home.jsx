import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Wallet, ClipboardCheck, Bell, FileText, ChevronRight } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { scheduleService } from '@/services/scheduleService';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { notificationService } from '@/services/notificationService';
import { documentService } from '@/services/documentService';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { FeeStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate, formatTime, getCurrentMonthYear } from '@/utils/formatters';

export default function StudentHome() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) loadAll();
  }, [student]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const classes = await studentService.getStudentClasses(student.id);
      const classIds = classes.map((c) => c.class_id);
      const { month, year } = getCurrentMonthYear();

      const [upcoming, fees, attSummary, unread, docs] = await Promise.all([
        scheduleService.getUpcomingSessions(14).then((r) => r.data.filter((s) => classIds.includes(s.class_id)).slice(0, 1)),
        studentService.getStudentFees(student.id, { status: 'UNPAID', pageSize: 1 }),
        attendanceService.getAttendanceSummary(student.id, month, year),
        notificationService.getUnreadCount(),
        documentService.getStudentDocuments(classIds, { pageSize: 3 }),
      ]);

      setData({ nextSession: upcoming[0] ?? null, unpaidFee: fees.data[0] ?? null, attSummary, unread, docs: docs.data });
    } finally {
      setLoading(false);
    }
  };

  if (studentLoading || loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-20" /></div>)}
      </div>
    );
  }

  if (!student) {
    return <EmptyState icon="👤" title="Chưa liên kết hồ sơ học viên" description="Vui lòng liên hệ trung tâm để được hỗ trợ liên kết tài khoản." />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-slate-400 text-sm">Xin chào,</p>
        <h1 className="text-xl font-bold text-slate-800">{student.full_name} 👋</h1>
      </div>

      {/* Next session */}
      <Link to="/app/schedule" className="card p-5 block bg-gradient-to-br from-primary-600 to-secondary-600 text-white">
        <div className="flex items-center gap-2 mb-2 text-white/80 text-xs font-medium uppercase tracking-wide">
          <CalendarClock size={14} /> Lịch học tiếp theo
        </div>
        {data.nextSession ? (
          <>
            <p className="text-lg font-bold">{data.nextSession.classes?.class_name}</p>
            <p className="text-white/80 text-sm mt-1">
              {formatTime(data.nextSession.start_time)} - {formatTime(data.nextSession.end_time)} · {formatDate(data.nextSession.session_date)}
            </p>
          </>
        ) : (
          <p className="text-white/80 text-sm">Không có buổi học nào sắp tới</p>
        )}
      </Link>

      {/* Fee card */}
      <Link to="/app/fees" className="card p-5 block">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide"><Wallet size={14} /> Học phí</div>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
        {data.unpaidFee ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">{data.unpaidFee.classes?.class_name}</p>
              <p className="text-xs text-slate-400">{data.unpaidFee.period_label}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-amber-600">{formatCurrency(data.unpaidFee.remaining_amount)}</p>
              <FeeStatusBadge status={data.unpaidFee.status} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-green-600 font-medium">✓ Không có khoản học phí nào chưa thanh toán</p>
        )}
      </Link>

      {/* Attendance summary */}
      <Link to="/app/attendance" className="card p-5 block">
        <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-medium uppercase tracking-wide"><ClipboardCheck size={14} /> Điểm danh tháng này</div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-lg font-bold text-green-600">{data.attSummary.present}</p><p className="text-[11px] text-slate-400">Có mặt</p></div>
          <div><p className="text-lg font-bold text-red-500">{data.attSummary.absent}</p><p className="text-[11px] text-slate-400">Vắng</p></div>
          <div><p className="text-lg font-bold text-amber-500">{data.attSummary.excused}</p><p className="text-[11px] text-slate-400">Có phép</p></div>
          <div><p className="text-lg font-bold text-sky-500">{data.attSummary.late}</p><p className="text-[11px] text-slate-400">Đi trễ</p></div>
        </div>
      </Link>

      {/* Notifications */}
      <Link to="/app/notifications" className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Bell size={18} className="text-primary-600" /></div>
          <div>
            <p className="font-semibold text-slate-800">Thông báo</p>
            <p className="text-xs text-slate-400">{data.unread > 0 ? `${data.unread} thông báo chưa đọc` : 'Không có thông báo mới'}</p>
          </div>
        </div>
        {data.unread > 0 && <span className="badge badge-danger">{data.unread}</span>}
      </Link>

      {/* Documents */}
      <Link to="/app/documents" className="card p-5 block">
        <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-medium uppercase tracking-wide"><FileText size={14} /> Tài liệu mới</div>
        {data.docs.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có tài liệu nào</p>
        ) : (
          <div className="space-y-2">
            {data.docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate">{d.title}</span>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{formatDate(d.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}
