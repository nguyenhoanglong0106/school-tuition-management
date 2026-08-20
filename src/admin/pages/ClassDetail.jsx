import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, UserPlus, CalendarPlus, Printer, Users as UsersIcon, Send, NotebookPen } from 'lucide-react';
import { classService } from '@/services/classService';
import { scheduleService } from '@/services/scheduleService';
import { studentService } from '@/services/studentService';
import { exerciseService } from '@/services/exerciseService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs } from '@/components/common/Tabs';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { Input, MoneyInput, Select, SearchInput as Search2 } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { ClassStatusBadge, AssignmentStatusBadge } from '@/components/common/Badge';
import { AssignExerciseModal } from '@/admin/components/AssignExerciseModal';
import { formatCurrency, formatDate, formatTime, formatDateTime, getDayOfWeekLabel } from '@/utils/formatters';
import { DAYS_OF_WEEK } from '@/constants';
import { printClassRoster } from '@/utils/printService';

const TABS = [
  { key: 'info', label: 'Thông tin' },
  { key: 'students', label: 'Học viên' },
  { key: 'schedules', label: 'Lịch học' },
  { key: 'exercises', label: 'Bài tập' },
];

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [addScheduleModal, setAddScheduleModal] = useState(false);
  const [genSessionsModal, setGenSessionsModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, sch, assign] = await Promise.all([
        classService.getById(id),
        classService.getClassStudents(id),
        classService.getSchedules(id),
        exerciseService.getAssignments({ classId: id, pageSize: 100 }),
      ]);
      setCls(c);
      setStudents(s);
      setSchedules(sch);
      setAssignments(assign.data);
    } catch {
      addToast('Không tìm thấy lớp học', 'error');
      navigate('/admin/classes');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async () => {
    try {
      await classService.removeStudentFromClass(removeTarget.id);
      addToast('Đã đưa học viên ra khỏi lớp');
      setRemoveTarget(null);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể thực hiện', 'error');
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="card p-6"><Skeleton className="h-32" /></div></div>;
  if (!cls) return null;

  const activeStudents = students.filter((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate('/admin/classes')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{cls.class_name}</h1>
              <ClassStatusBadge status={cls.status} />
            </div>
            <p className="text-slate-400 text-sm">{cls.class_code} · {cls.subjects?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(cls.tuition_fee)}</p>
            <p className="text-xs text-slate-400">Học phí / {cls.fee_cycle === 'MONTHLY' ? 'tháng' : cls.fee_cycle === 'PER_SESSION' ? 'buổi' : 'khóa'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100 text-sm">
          <div><p className="text-slate-400 text-xs">Giáo viên</p><p className="font-medium text-slate-700">{cls.teachers?.full_name ?? '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Phòng</p><p className="font-medium text-slate-700">{cls.room ?? '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Khai giảng</p><p className="font-medium text-slate-700">{formatDate(cls.start_date)}</p></div>
          <div><p className="text-slate-400 text-xs">Sĩ số</p><p className="font-medium text-slate-700">{activeStudents.length}/{cls.capacity}</p></div>
          <div><p className="text-slate-400 text-xs">Phí mỗi buổi</p><p className="font-medium text-slate-700">{cls.fee_cycle === 'PER_SESSION' ? formatCurrency(cls.session_fee) : '—'}</p></div>
        </div>
      </div>

      <div className="card">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="p-5">
          {tab === 'info' && (
            <p className="text-sm text-slate-600 whitespace-pre-line">{cls.description || 'Chưa có mô tả cho lớp học này.'}</p>
          )}

          {tab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-slate-800">Danh sách học viên ({students.length})</h3>
                <div className="flex gap-2">
                  <button onClick={() => printClassRoster(cls, students)} className="btn btn-ghost btn-sm"><Printer size={14} /> In danh sách</button>
                  {isAdmin && <button onClick={() => setAddStudentModal(true)} className="btn-primary btn-sm"><UserPlus size={14} /> Thêm học viên</button>}
                </div>
              </div>
              {students.length === 0 ? (
                <EmptyState icon={<UsersIcon size={28} />} title="Chưa có học viên trong lớp" />
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Mã HV</th><th>Họ tên</th><th>Ngày vào</th><th>Hình thức</th><th>Ưu đãi</th><th>Trạng thái</th><th></th></tr></thead>
                    <tbody>
                      {students.map((cs) => (
                        <tr key={cs.id}>
                          <td>{cs.students?.student_code}</td>
                          <td className="font-medium">{cs.students?.full_name}</td>
                          <td>{formatDate(cs.joined_date)}</td>
                          <td>{cs.billing_type_override === 'PER_SESSION' ? 'Theo buổi' : cs.billing_type_override === 'MONTHLY' ? 'Theo tháng' : 'Mặc định lớp'}</td>
                          <td>{cs.discount_amount > 0 ? formatCurrency(cs.discount_amount) : '—'}</td>
                          <td><span className={`badge ${cs.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>{cs.status}</span></td>
                          <td>
                            {isAdmin && cs.status === 'ACTIVE' && (
                              <button onClick={() => setRemoveTarget(cs)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-slate-800">Lịch học định kỳ</h3>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => setGenSessionsModal(true)} className="btn btn-outline btn-sm"><CalendarPlus size={14} /> Sinh buổi học</button>
                    <button onClick={() => setAddScheduleModal(true)} className="btn-primary btn-sm"><Plus size={14} /> Thêm lịch</button>
                  </div>
                )}
              </div>
              {schedules.length === 0 ? (
                <EmptyState icon="📅" title="Chưa có lịch học định kỳ" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schedules.map((s) => (
                    <div key={s.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{getDayOfWeekLabel(s.day_of_week)}</p>
                        <p className="text-sm text-slate-500">{formatTime(s.start_time)} - {formatTime(s.end_time)} · Phòng {s.room}</p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={async () => { await classService.deleteSchedule(s.id); addToast('Đã xóa lịch học'); load(); }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'exercises' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-slate-800">Bài tập đã giao ({assignments.length})</h3>
                <button onClick={() => setAssignModal(true)} className="btn-primary btn-sm"><Send size={14} /> Giao bài mới</button>
              </div>
              {assignments.length === 0 ? (
                <EmptyState icon={<NotebookPen size={28} />} title="Chưa giao bài tập nào cho lớp này" description='Chọn bài có sẵn trong ngân hàng bài tập và đặt hạn nộp.' />
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Bài tập</th><th>Hạn nộp</th><th>Trạng thái</th><th></th></tr></thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id} onClick={() => navigate(`/admin/assignments/${a.id}`)} className="cursor-pointer hover:bg-slate-50">
                          <td className="font-medium">{a.title_override ?? a.exercises?.title}</td>
                          <td>{formatDateTime(a.due_at)}</td>
                          <td><AssignmentStatusBadge status={a.status} /></td>
                          <td className="text-primary-600 text-sm">Xem tiến độ →</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {assignModal && (
        <AssignExerciseModal fixedClassId={id} onClose={() => setAssignModal(false)} onAssigned={() => { setAssignModal(false); load(); }} />
      )}

      {addStudentModal && (
        <AddStudentModal classId={id} existingIds={students.map((s) => s.student_id)} onClose={() => setAddStudentModal(false)} onAdded={() => { setAddStudentModal(false); load(); }} />
      )}
      {addScheduleModal && (
        <AddScheduleModal classId={id} defaultRoom={cls.room} onClose={() => setAddScheduleModal(false)} onAdded={() => { setAddScheduleModal(false); load(); }} />
      )}
      {genSessionsModal && (
        <GenerateSessionsModal classId={id} onClose={() => setGenSessionsModal(false)} onDone={() => setGenSessionsModal(false)} />
      )}

      <ConfirmDialog isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={handleRemoveStudent}
        title="Đưa học viên ra khỏi lớp" message={`Bạn có chắc muốn đưa "${removeTarget?.students?.full_name}" ra khỏi lớp này? Lịch sử học phí sẽ được giữ nguyên.`} />
    </div>
  );
}

function AddStudentModal({ classId, existingIds, onClose, onAdded }) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [billingType, setBillingType] = useState('');
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [sessionFee, setSessionFee] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await studentService.getAll({ search, status: 'ACTIVE', pageSize: 10 });
      setResults(data.filter((s) => !existingIds.includes(s.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await classService.addStudentToClass(classId, selected.id, {
        discount_amount: Number(discount) || 0,
        billing_type_override: billingType || null,
        custom_tuition_fee: billingType === 'MONTHLY' ? Number(monthlyFee) || 0 : null,
        session_fee_override: billingType === 'PER_SESSION' ? Number(sessionFee) || 0 : null,
      });
      addToast('Đã thêm học viên vào lớp');
      onAdded();
    } catch (err) {
      addToast(err.message ?? 'Không thể thêm học viên', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Thêm học viên vào lớp">
      <div className="space-y-4">
        {!selected ? (
          <>
            <Search2 value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã học viên..." />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.map((s) => (
                <button key={s.id} onClick={() => setSelected(s)} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between">
                  <span>{s.full_name}</span>
                  <span className="text-xs text-slate-400">{s.student_code}</span>
                </button>
              ))}
              {search.length >= 2 && results.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Không tìm thấy học viên phù hợp</p>}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-primary-50 flex items-center justify-between">
              <span className="font-medium text-primary-700">{selected.full_name} ({selected.student_code})</span>
              <button onClick={() => setSelected(null)} className="text-xs text-primary-600 underline">Đổi</button>
            </div>
            <MoneyInput label="Số tiền ưu đãi (nếu có)" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <Select label="Hình thức học phí" value={billingType} onChange={(e) => setBillingType(e.target.value)} options={[{ value: '', label: 'Theo mặc định của lớp' }, { value: 'MONTHLY', label: 'Theo tháng' }, { value: 'PER_SESSION', label: 'Theo buổi trong tháng' }]} />
            {billingType === 'MONTHLY' && <MoneyInput label="Phí tháng (ghi đè)" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} />}
            {billingType === 'PER_SESSION' && <MoneyInput label="Phí mỗi buổi (ghi đè)" value={sessionFee} onChange={(e) => setSessionFee(e.target.value)} />}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1">{saving ? 'Đang thêm...' : 'Thêm vào lớp'}</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function AddScheduleModal({ classId, defaultRoom, onClose, onAdded }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({ day_of_week: 2, start_time: '18:00', end_time: '19:30', room: defaultRoom ?? '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.end_time <= form.start_time) {
      addToast('Giờ kết thúc phải sau giờ bắt đầu', 'error');
      return;
    }
    setSaving(true);
    try {
      await classService.createSchedule({ class_id: classId, ...form, day_of_week: Number(form.day_of_week) });
      addToast('Đã thêm lịch học');
      onAdded();
    } catch (err) {
      addToast(err.message ?? 'Không thể thêm lịch học', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Thêm lịch học định kỳ">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Thứ" options={DAYS_OF_WEEK} value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Giờ bắt đầu" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          <Input label="Giờ kết thúc" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
        </div>
        <Input label="Phòng học" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}

function GenerateSessionsModal({ classId, onClose, onDone }) {
  const { addToast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(monthEnd);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (to < from) {
      addToast('Ngày kết thúc phải sau ngày bắt đầu', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await scheduleService.generateSessions(classId, from, to);
      addToast(`Đã sinh ${result.created_count} buổi học mới`);
      onDone();
    } catch (err) {
      addToast(err.message ?? 'Không thể sinh buổi học', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Sinh buổi học từ lịch định kỳ">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Hệ thống sẽ tự động tạo các buổi học dựa trên lịch định kỳ đã thiết lập, không tạo trùng buổi đã có.</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button onClick={handleGenerate} disabled={saving} className="btn-primary flex-1">{saving ? 'Đang sinh...' : 'Sinh buổi học'}</button>
        </div>
      </div>
    </Modal>
  );
}
