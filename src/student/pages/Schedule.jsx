import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { studentService } from '@/services/studentService';
import { scheduleService } from '@/services/scheduleService';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import { SessionStatusBadge } from '@/components/common/Badge';
import { formatDate, formatTime, getDayOfWeekLabel } from '@/utils/formatters';

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function toISODate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

export default function StudentSchedule() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [view, setView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [classIds, setClassIds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (student) {
      studentService.getStudentClasses(student.id).then((cs) => setClassIds(cs.map((c) => c.class_id)));
    }
  }, [student]);

  const range = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchorDate);
      return { from: toISODate(start), to: toISODate(addDays(start, 6)), start };
    }
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    return { from: toISODate(start), to: toISODate(end), start };
  }, [view, anchorDate]);

  useEffect(() => {
    if (classIds.length === 0) { setSessions([]); setLoading(false); return; }
    load();
  }, [classIds, range.from, range.to]);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(classIds.map((cid) => scheduleService.getSessions({ classId: cid, dateFrom: range.from, dateTo: range.to, pageSize: 100 })));
      const all = results.flatMap((r) => r.data).sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time));
      setSessions(all);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    sessions.forEach((s) => { (map[s.session_date] ??= []).push(s); });
    return map;
  }, [sessions]);

  if (studentLoading) return <Skeleton className="h-64" />;

  const todayStr = toISODate(new Date());

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Lịch học</h1>
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'week' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}>Tuần</button>
          <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'month' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}>Tháng</button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setAnchorDate((d) => view === 'week' ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium text-slate-600">
          {view === 'week' ? `${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(range.start)} - ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(addDays(range.start, 6))}` : new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(anchorDate)}
        </span>
        <button onClick={() => setAnchorDate((d) => view === 'week' ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronRight size={18} /></button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : sessions.length === 0 ? (
        <EmptyState icon="📅" title="Không có buổi học nào trong khoảng thời gian này" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, list]) => (
            <div key={date}>
              <p className={`text-xs font-semibold mb-2 ${date === todayStr ? 'text-primary-600' : 'text-slate-400'}`}>
                {date === todayStr ? 'Hôm nay · ' : ''}{getDayOfWeekLabel(new Date(date).getDay())}, {formatDate(date)}
              </p>
              <div className="space-y-2">
                {list.map((s) => (
                  <button key={s.id} onClick={() => setSelected(s)} className="w-full card p-4 flex items-center justify-between text-left">
                    <div>
                      <p className="font-medium text-slate-800">{s.classes?.class_name}</p>
                      <p className="text-xs text-slate-400">{formatTime(s.start_time)} - {formatTime(s.end_time)} · Phòng {s.room}</p>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title="Chi tiết buổi học">
          <div className="space-y-3">
            <Row label="Lớp" value={selected.classes?.class_name} />
            <Row label="Môn học" value={selected.classes?.subjects?.name} />
            <Row label="Giáo viên" value={selected.classes?.teachers?.full_name} />
            <Row label="Ngày" value={formatDate(selected.session_date)} />
            <Row label="Giờ" value={`${formatTime(selected.start_time)} - ${formatTime(selected.end_time)}`} />
            <Row label="Phòng" value={selected.room} />
            <Row label="Trạng thái" value={<SessionStatusBadge status={selected.status} />} />
            {selected.notes && <Row label="Ghi chú" value={selected.notes} />}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value || '—'}</span>
    </div>
  );
}
