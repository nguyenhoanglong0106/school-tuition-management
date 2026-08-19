import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, UserPlus, ShieldCheck, KeyRound } from 'lucide-react';
import { teacherService } from '@/services/teacherService';
import { accountService } from '@/services/accountService';
import { useToast } from '@/contexts/ToastContext';
import { Avatar, Skeleton, EmptyState } from '@/components/common/UI';
import { StudentStatusBadge, ClassStatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Form';

export default function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountModal, setAccountModal] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([teacherService.getById(id), teacherService.getTeacherClasses(id)]);
      setTeacher(t);
      setClasses(c);
    } catch {
      addToast('Không tìm thấy giáo viên', 'error');
      navigate('/admin/teachers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="card p-6"><Skeleton className="h-32" /></div></div>;
  }
  if (!teacher) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate('/admin/teachers')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={teacher.full_name} src={teacher.avatar_url} size={16} />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{teacher.full_name}</h1>
              <StudentStatusBadge status={teacher.status} />
            </div>
            <p className="text-slate-400 text-sm">{teacher.teacher_code}</p>
          </div>
          {teacher.profile_id ? (
            <span className="badge badge-success"><ShieldCheck size={12} /> Đã có tài khoản</span>
          ) : (
            <button onClick={() => setAccountModal(true)} className="btn btn-outline btn-sm">
              <UserPlus size={14} /> Tạo tài khoản đăng nhập
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <InfoItem icon={Phone} label="SĐT" value={teacher.phone} />
          <InfoItem icon={Mail} label="Email" value={teacher.email} />
          <InfoItem icon={MapPin} label="Địa chỉ" value={teacher.address} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Lớp phụ trách</h2>
        {classes.length === 0 ? (
          <EmptyState icon="📚" title="Chưa phụ trách lớp nào" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-slate-800">{c.class_name}</p>
                  <ClassStatusBadge status={c.status} />
                </div>
                <p className="text-xs text-slate-400">{c.subjects?.name} · Phòng {c.room}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {accountModal && (
        <CreateAccountModal teacher={teacher} onClose={() => setAccountModal(false)} onCreated={() => { setAccountModal(false); load(); }} />
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

function CreateAccountModal({ teacher, onClose, onCreated }) {
  const { addToast } = useToast();
  const [email, setEmail] = useState(teacher.email ?? '');
  const [password, setPassword] = useState(accountService.generateTempPassword());
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await accountService.createUserAccount({
        email, password, fullName: teacher.full_name, role: 'TEACHER', phone: teacher.phone,
      });
      await teacherService.update(teacher.id, { profile_id: result.userId });
      addToast('Đã tạo tài khoản đăng nhập cho giáo viên');
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
        <Input label="Email đăng nhập" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Input label="Mật khẩu tạm thời" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Giáo viên sẽ được yêu cầu đổi mật khẩu ngay lần đăng nhập đầu tiên.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1"><KeyRound size={16} /> {saving ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
        </div>
      </form>
    </Modal>
  );
}
