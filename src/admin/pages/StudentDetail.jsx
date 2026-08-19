import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, School, Users as UsersIcon, KeyRound, UserPlus, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { studentService } from '@/services/studentService';
import { documentService } from '@/services/documentService';
import { accountService } from '@/services/accountService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs } from '@/components/common/Tabs';
import { Avatar, Skeleton, EmptyState } from '@/components/common/UI';
import { StudentStatusBadge, FeeStatusBadge, PaymentStatusBadge, AttendanceStatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Form';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/utils/formatters';

const TABS = [
  { key: 'info', label: 'Thông tin' },
  { key: 'classes', label: 'Lớp học' },
  { key: 'fees', label: 'Học phí' },
  { key: 'payments', label: 'Thanh toán' },
  { key: 'attendance', label: 'Điểm danh' },
  { key: 'documents', label: 'Tài liệu' },
];

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAdmin, isTeacher } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [accountModal, setAccountModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [id]);

  useEffect(() => {
    loadTabData();
  }, [tab, id]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const s = await studentService.getById(id);
      setStudent(s);
    } catch {
      addToast('Không tìm thấy học viên', 'error');
      navigate('/admin/students');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (tab === 'info') return;
    setTabLoading(true);
    try {
      if (tab === 'classes') {
        const classes = await studentService.getStudentClasses(id);
        setTabData((d) => ({ ...d, classes }));
      } else if (tab === 'fees') {
        const { data: fees } = await studentService.getStudentFees(id, { pageSize: 50 });
        setTabData((d) => ({ ...d, fees }));
      } else if (tab === 'payments') {
        const { data: payments } = await supabase
          .from('payments')
          .select('*, student_fees(fee_code, period_label, classes(class_name))')
          .eq('student_id', id)
          .order('created_at', { ascending: false });
        setTabData((d) => ({ ...d, payments }));
      } else if (tab === 'attendance') {
        const attendance = await studentService.getStudentAttendance(id);
        setTabData((d) => ({ ...d, attendance }));
      } else if (tab === 'documents') {
        const classIds = (tabData.classes ?? (await studentService.getStudentClasses(id))).map((c) => c.class_id);
        const { data: documents } = await documentService.getStudentDocuments(classIds, { pageSize: 50 });
        setTabData((d) => ({ ...d, documents }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTabLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const { tempPassword } = await accountService.resetUserPassword(student.profile_id);
      setResetPassword(tempPassword);
      addToast('Đã đặt lại mật khẩu');
    } catch (err) {
      addToast(err.message ?? 'Không thể đặt lại mật khẩu', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="card p-6"><Skeleton className="h-32" /></div>
      </div>
    );
  }
  if (!student) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate('/admin/students')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={student.full_name} src={student.avatar_url} size={16} />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{student.full_name}</h1>
              <StudentStatusBadge status={student.status} />
            </div>
            <p className="text-slate-400 text-sm">{student.student_code}</p>
          </div>
          {(isAdmin || isTeacher) && (
            <div className="flex items-center gap-2">
              {student.profile_id ? (
                <>
                  <span className="badge badge-success"><ShieldCheck size={12} /> Đã có tài khoản</span>
                  <button onClick={handleResetPassword} disabled={resetting} className="btn btn-outline btn-sm">
                    <KeyRound size={14} /> {resetting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                  </button>
                </>
              ) : (
                <button onClick={() => setAccountModal(true)} className="btn btn-outline btn-sm">
                  <UserPlus size={14} /> Tạo tài khoản đăng nhập
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <InfoItem icon={Phone} label="SĐT" value={student.phone} />
          <InfoItem icon={Mail} label="Email" value={student.email} />
          <InfoItem icon={School} label="Trường / Lớp" value={[student.school_name, student.school_class].filter(Boolean).join(' · ')} />
          <InfoItem icon={MapPin} label="Địa chỉ" value={student.address} />
          <InfoItem icon={UsersIcon} label="Phụ huynh" value={student.parent_name} />
          <InfoItem icon={Phone} label="SĐT phụ huynh" value={student.parent_phone} />
          <InfoItem icon={Mail} label="Email phụ huynh" value={student.parent_email} />
          <InfoItem icon={School} label="Ngày vào học" value={formatDate(student.join_date)} />
        </div>
        {student.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
            <strong className="text-slate-700">Ghi chú:</strong> {student.notes}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="p-5">
          {tab === 'info' && <InfoTabContent student={student} />}

          {tab === 'classes' && (
            tabLoading ? <Skeleton className="h-24" /> :
            !tabData.classes?.length ? <EmptyState icon="📚" title="Chưa tham gia lớp nào" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tabData.classes.map((cs) => (
                  <div key={cs.id} className="p-4 rounded-2xl border border-slate-100">
                    <p className="font-semibold text-slate-800">{cs.classes?.class_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{cs.classes?.subjects?.name} · GV: {cs.classes?.teachers?.full_name}</p>
                    <p className="text-xs text-slate-400">Phòng {cs.classes?.room}</p>
                    {cs.discount_amount > 0 && <p className="text-xs text-green-600 mt-1">Ưu đãi: {formatCurrency(cs.discount_amount)}</p>}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'fees' && (
            tabLoading ? <Skeleton className="h-24" /> :
            !tabData.fees?.length ? <EmptyState icon="💰" title="Chưa có khoản học phí nào" /> : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Kỳ</th><th>Lớp</th><th>Phải đóng</th><th>Đã đóng</th><th>Còn lại</th><th>Hạn</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {tabData.fees.map((f) => (
                      <tr key={f.id}>
                        <td>{f.period_label}</td>
                        <td>{f.classes?.class_name}</td>
                        <td>{formatCurrency(f.final_amount)}</td>
                        <td>{formatCurrency(f.paid_amount)}</td>
                        <td className="font-semibold">{formatCurrency(f.remaining_amount)}</td>
                        <td>{formatDate(f.due_date)}</td>
                        <td><FeeStatusBadge status={f.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'payments' && (
            tabLoading ? <Skeleton className="h-24" /> :
            !tabData.payments?.length ? <EmptyState icon="💳" title="Chưa có giao dịch thanh toán" /> : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Mã GD</th><th>Kỳ</th><th>Số tiền</th><th>Phương thức</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {tabData.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.payment_code}</td>
                        <td>{p.student_fees?.period_label}</td>
                        <td className="font-semibold">{formatCurrency(p.amount)}</td>
                        <td>{p.payment_method === 'CASH' ? 'Tiền mặt' : p.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Khác'}</td>
                        <td>{formatDateTime(p.payment_date)}</td>
                        <td><PaymentStatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'attendance' && (
            tabLoading ? <Skeleton className="h-24" /> :
            !tabData.attendance?.length ? <EmptyState icon="✅" title="Chưa có dữ liệu điểm danh" /> : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Ngày</th><th>Lớp</th><th>Giờ</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
                  <tbody>
                    {tabData.attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{formatDate(a.class_sessions?.session_date)}</td>
                        <td>{a.class_sessions?.classes?.class_name}</td>
                        <td>{formatTime(a.class_sessions?.start_time)}</td>
                        <td><AttendanceStatusBadge status={a.status} /></td>
                        <td className="text-slate-400">{a.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'documents' && (
            tabLoading ? <Skeleton className="h-24" /> :
            !tabData.documents?.length ? <EmptyState icon="📄" title="Chưa có tài liệu nào" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tabData.documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl border border-slate-100">
                    <p className="font-medium text-slate-800">{doc.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(doc.created_at)}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {accountModal && (
        <CreateAccountModal
          student={student}
          onClose={() => setAccountModal(false)}
          onCreated={() => {
            setAccountModal(false);
            loadStudent();
          }}
        />
      )}
      {resetPassword && (
        <Modal isOpen onClose={() => setResetPassword('')} title="Mật khẩu mới">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Gửi mật khẩu này cho <strong>{student.full_name}</strong>. Mật khẩu chỉ hiển thị lần này.
            </p>
            <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 text-center text-xl font-bold tracking-widest text-primary-700 select-all">
              {resetPassword}
            </div>
            <p className="text-xs text-slate-400">Học viên sẽ được yêu cầu đổi mật khẩu sau khi đăng nhập.</p>
            <button onClick={() => setResetPassword('')} className="btn-primary w-full justify-center">Đã lưu mật khẩu</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="text-slate-300 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

function InfoTabContent({ student }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
      <InfoItem icon={UsersIcon} label="Ngày sinh" value={formatDate(student.date_of_birth)} />
      <InfoItem icon={UsersIcon} label="Giới tính" value={student.gender} />
      <InfoItem icon={UsersIcon} label="Mã học viên" value={student.student_code} />
      <InfoItem icon={UsersIcon} label="Ngày tạo hồ sơ" value={formatDate(student.created_at)} />
    </div>
  );
}

function CreateAccountModal({ student, onClose, onCreated }) {
  const { addToast } = useToast();
  const [loginName, setLoginName] = useState(student.login_name ?? student.student_code);
  const [password, setPassword] = useState(accountService.generateTempPassword());
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await accountService.createUserAccount({
        studentId: student.id,
        loginName,
        password,
        fullName: student.full_name,
        role: 'STUDENT',
        phone: student.phone,
      });
      addToast('Đã tạo tài khoản đăng nhập cho học viên');
      onCreated();
    } catch (err) {
      addToast(err.message ?? 'Không thể tạo tài khoản', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Tạo tài khoản đăng nhập">
      <form onSubmit={handleCreate} className="space-y-4">
        <p className="text-sm text-slate-500">
          Tạo tài khoản để <strong>{student.full_name}</strong> hoặc phụ huynh có thể đăng nhập vào ứng dụng.
        </p>
        <Input label="Tài khoản đăng nhập" required value={loginName} onChange={(e) => setLoginName(e.target.value)} />
        <div>
          <Input label="Mật khẩu" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Học viên dùng tài khoản và mật khẩu này để đăng nhập.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <KeyRound size={16} /> {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
