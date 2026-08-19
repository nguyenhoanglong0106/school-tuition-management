import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { scheduleService } from '@/services/scheduleService';
import { classService } from '@/services/classService';
import { teacherService } from '@/services/teacherService';
import { Select } from '@/components/common/Form';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { SessionStatusBadge } from '@/components/common/Badge';
import { formatTime, getDayOfWeekLabel } from '@/utils/formatters';

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toISODate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

export default function Schedules() {
  const navigate = useNavigate();
  const [view, setView] = useState('week'); // week | month
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    classService.getAll({ pageSize: 100 }).then((r) => setClasses(r.data));
    teacherService.getAll({ pageSize: 100, status: 'ACTIVE' }).then((r) => setTeachers(r.data));
  }, []);

  const range = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchorDate);
      return { from: toISODate(start), to: toISODate(addDays(start, 6)), start };
    }
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const gridStart = startOfWeek(start);
    const gridEnd = addDays(startOfWeek(end), 6);
    return { from: toISODate(gridStart), to: toISODate(gridEnd), start, gridStart };
  }, [view, anchorDate]);

  useEffect(() => {
    load();
  }, [range.from, range.to, classId, teacherId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await scheduleService.getSessions({
        classId: classId || null, teacherId: teacherId || null,
        dateFrom: range.from, dateTo: range.to, pageSize: 300,
      });
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      (map[s.session_date] ??= []).push(s);
    });
    return map;
  }, [sessions]);

  const goToday = () => { setAnchorDate(new Date()); setSelectedDay(null); };
  const navigateRange = (dir) => {
    setAnchorDate((d) => view === 'week' ? addDays(d, dir * 7) : new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch học</h1>
          <p className="text-slate-500 text-sm mt-1">Xem và quản lý lịch học theo tuần hoặc tháng</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${view === 'week' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}>Tuần</button>
          <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${view === 'month' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}>Tháng</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateRange(-1)} className="btn btn-ghost btn-sm p-2"><ChevronLeft size={16} /></button>
          <button onClick={goToday} className="btn btn-outline btn-sm">Hôm nay</button>
          <button onClick={() => navigateRange(1)} className="btn btn-ghost btn-sm p-2"><ChevronRight size={16} /></button>
          <span className="text-sm font-medium text-slate-600 ml-2">
            {view === 'week'
              ? `${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(range.start)} - ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(addDays(range.start, 6))}`
              : new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(anchorDate)}
          </span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Tất cả lớp"
            options={classes.map((c) => ({ value: c.id, label: c.class_name }))} className="w-full sm:w-48" />
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} placeholder="Tất cả giáo viên"
            options={teachers.map((t) => ({ value: t.id, label: t.full_name }))} className="w-full sm:w-48" />
        </div>
      </div>

      {loading ? (
        <div className="card p-6"><Skeleton className="h-64" /></div>
      ) : view === 'week' ? (
        <WeekView start={range.start} sessionsByDate={sessionsByDate} onSessionClick={(s) => navigate(`/admin/attendance?sessionId=${s.id}`)} />
      ) : (
        <MonthView gridStart={range.gridStart} month={anchorDate.getMonth()} sessionsByDate={sessionsByDate} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      )}

      {view === 'month' && selectedDay && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Buổi học ngày {new Intl.DateTimeFormat('vi-VN').format(new Date(selectedDay))}</h3>
          {(sessionsByDate[selectedDay] ?? []).length === 0 ? (
            <EmptyState icon={<CalendarDays size={28} />} title="Không có buổi học nào" />
          ) : (
            <div className="space-y-2">
              {(sessionsByDate[selectedDay] ?? []).map((s) => <SessionRow key={s.id} session={s} onClick={() => navigate(`/admin/attendance?sessionId=${s.id}`)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeekView({ start, sessionsByDate, onSessionClick }) {
  const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  const todayStr = toISODate(new Date());
  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
      {days.map((d) => {
        const dateStr = toISODate(d);
        const daySessions = (sessionsByDate[dateStr] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return (
          <div key={dateStr} className={`card p-3 min-h-[140px] ${dateStr === todayStr ? 'ring-2 ring-primary-500' : ''}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase">{getDayOfWeekLabel(d.getDay())}</p>
            <p className={`text-lg font-bold mb-2 ${dateStr === todayStr ? 'text-primary-600' : 'text-slate-700'}`}>{d.getDate()}</p>
            <div className="space-y-1.5">
              {daySessions.map((s) => <SessionRow key={s.id} session={s} compact onClick={() => onSessionClick(s)} />)}
              {daySessions.length === 0 && <p className="text-xs text-slate-300">Không có lịch</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ gridStart, month, sessionsByDate, selectedDay, onSelectDay }) {
  const cells = Array.from({ length: 42 }).map((_, i) => addDays(gridStart, i));
  const todayStr = toISODate(new Date());
  return (
    <div className="card p-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const dateStr = toISODate(d);
          const count = (sessionsByDate[dateStr] ?? []).length;
          const isCurrentMonth = d.getMonth() === month;
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-colors
                ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                ${dateStr === todayStr ? 'ring-2 ring-primary-500' : ''}
                ${selectedDay === dateStr ? 'bg-primary-600 text-white' : 'hover:bg-slate-50'}`}
            >
              <span>{d.getDate()}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${selectedDay === dateStr ? 'bg-white/30' : 'bg-primary-100 text-primary-600'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SessionRow({ session, compact, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors ${compact ? 'p-1.5' : 'p-3'}`}>
      <p className={`font-medium text-primary-700 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{session.classes?.class_name}</p>
      <p className={`text-primary-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{formatTime(session.start_time)}-{formatTime(session.end_time)} · {session.room}</p>
      {!compact && <SessionStatusBadge status={session.status} />}
    </button>
  );
}
