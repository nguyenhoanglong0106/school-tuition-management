import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCheck, Save, Printer, ClipboardCheck, Ban } from 'lucide-react';
import { scheduleService } from '@/services/scheduleService';
import { classService } from '@/services/classService';
import { attendanceService } from '@/services/attendanceService';
import { useToast } from '@/contexts/ToastContext';
import { Select } from '@/components/common/Form';
import { ConfirmDialog } from '@/components/common/Modal';
import { Avatar, Skeleton, EmptyState } from '@/components/common/UI';
import { ATTENDANCE_STATUS } from '@/constants';
import { formatDate, formatTime } from '@/utils/formatters';
import { printAttendanceSheet } from '@/utils/printService';

// Static class strings so Tailwind's content scanner can find & generate them
// (dynamically built class names like `ring-${color}-300` are invisible to the JIT scanner).
const ACTIVE_RING_CLASSES = {
  success: 'badge-success ring-2 ring-offset-1 ring-green-300',
  danger: 'badge-danger ring-2 ring-offset-1 ring-red-300',
  warning: 'badge-warning ring-2 ring-offset-1 ring-amber-300',
  info: 'badge-info ring-2 ring-offset-1 ring-sky-300',
};

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [sessionId, setSessionId] = useState(searchParams.get('sessionId') ?? '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    classService.getAll({ pageSize: 100, status: 'ACTIVE' }).then((r) => setClasses(r.data));
  }, []);

  // If arriving with a direct sessionId, resolve its class/date for the pickers
  useEffect(() => {
    const sid = searchParams.get('sessionId');
    if (sid) {
      scheduleService.getSessionById(sid).then((s) => {
        setClassId(s.class_id);
        setDate(s.session_date);
        setSessionId(sid);
      }).catch(() => {});
    }
  }, [searchParams]);

  const loadSessionOptions = async () => {
    if (!classId || !date) { setSessionOptions([]); return; }
    const r = await scheduleService.getSessions({ classId, dateFrom: date, dateTo: date, pageSize: 20 });
    setSessionOptions(r.data);
    if (r.data.length === 1) setSessionId(r.data[0].id);
    else if (!r.data.find((s) => s.id === sessionId)) setSessionId('');
  };

  useEffect(() => {
    loadSessionOptions();
  }, [classId, date]);

  useEffect(() => {
    if (!sessionId) { setRows([]); return; }
    loadAttendance();
  }, [sessionId]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getSessionStudentsForAttendance(sessionId);
      setRows(data.map((d) => ({ ...d, status: d.attendance?.status ?? null, note: d.attendance?.note ?? '' })));
    } finally {
      setLoading(false);
    }
  };

  const markAll = (status) => setRows((rs) => rs.map((r) => ({ ...r, status })));
  const setStatus = (studentId, status) => setRows((rs) => rs.map((r) => (r.student.id === studentId ? { ...r, status } : r)));

  const handleSave = async () => {
    if (saving) return; // guard against double-submit
    setSaving(true);
    try {
      const records = rows.filter((r) => r.status).map((r) => ({ student_id: r.student.id, status: r.status, note: r.note }));
      await attendanceService.bulkMarkAttendance(sessionId, records);
      await scheduleService.completeSession(sessionId);
      addToast('Đã lưu điểm danh');
      loadAttendance();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu điểm danh', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSession = async () => {
    if (cancelling) return; // guard against double-submit
    setCancelling(true);
    try {
      await scheduleService.cancelSession(sessionId);
      addToast('Đã hủy buổi học');
      setShowCancelConfirm(false);
      await loadSessionOptions();
    } catch (err) {
      addToast(err.message ?? 'Không thể hủy buổi học', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const currentSession = sessionOptions.find((s) => s.id === sessionId);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Điểm danh</h1>
          <p className="text-slate-500 text-sm mt-1">Chọn lớp và ngày để điểm danh buổi học</p>
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Lớp học" value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Chọn lớp" options={classes.map((c) => ({ value: c.id, label: c.class_name }))} />
        <div>
          <label className="form-label">Ngày</label>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Select label="Buổi học" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="Chọn buổi học"
          options={sessionOptions.map((s) => ({ value: s.id, label: `${formatTime(s.start_time)} - ${formatTime(s.end_time)} (${s.status})` }))} />
      </div>

      {!sessionId ? (
        <div className="card"><EmptyState icon={<ClipboardCheck size={32} />} title="Chưa chọn buổi học" description="Vui lòng chọn lớp, ngày và buổi học để bắt đầu điểm danh." /></div>
      ) : loading ? (
        <div className="card p-5"><Skeleton className="h-64" /></div>
      ) : (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-slate-800">{formatDate(currentSession?.session_date)} · {rows.length} học viên</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => printAttendanceSheet(currentSession ?? { session_date: date }, rows)} className="btn btn-ghost btn-sm"><Printer size={14} /> In</button>
              <button onClick={() => markAll('PRESENT')} className="btn btn-outline btn-sm"><CheckCheck size={14} /> Tất cả có mặt</button>
              {currentSession?.status === 'SCHEDULED' && (
                <button onClick={() => setShowCancelConfirm(true)} className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"><Ban size={14} /> Hủy buổi học</button>
              )}
            </div>
          </div>

          {currentSession?.status === 'CANCELLED' ? (
            <EmptyState icon={<Ban size={32} />} title="Buổi học đã bị hủy" description="Buổi học này đã bị hủy. Không thể điểm danh cho buổi học đã hủy." />
          ) : rows.length === 0 ? (
            <EmptyState icon="👥" title="Lớp chưa có học viên nào" />
          ) : (
            <>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.student.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                    <Avatar name={r.student.full_name} src={r.student.avatar_url} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{r.student.full_name}</p>
                      <p className="text-xs text-slate-400">{r.student.student_code}</p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {Object.entries(ATTENDANCE_STATUS).map(([key, s]) => (
                        <button
                          key={key}
                          onClick={() => setStatus(r.student.id, key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            r.status === key ? ACTIVE_RING_CLASSES[s.color] : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button onClick={handleSave} disabled={saving || rows.length === 0} className="btn-primary w-full sm:w-auto">
                  <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelSession}
        title="Hủy buổi học"
        message="Bạn có chắc chắn muốn hủy buổi học này? Sau khi hủy, buổi học sẽ không thể dùng để điểm danh nữa."
        confirmLabel="Hủy buổi học"
        confirmClass="btn-danger"
        loading={cancelling}
      />
    </div>
  );
}
