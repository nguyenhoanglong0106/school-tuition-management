import { ArrowLeft, Phone, Mail, School, Users, MapPin, Cake, IdCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { Avatar, Skeleton } from '@/components/common/UI';
import { StudentStatusBadge } from '@/components/common/Badge';
import { formatDate } from '@/utils/formatters';

export default function StudentProfile() {
  const navigate = useNavigate();
  const { student, loading } = useCurrentStudent();

  if (loading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (!student) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} /> Quay lại</button>

      <div className="card p-6 text-center">
        <Avatar name={student.full_name} src={student.avatar_url} size={20} className="mx-auto mb-3" />
        <h1 className="text-lg font-bold text-slate-800">{student.full_name}</h1>
        <p className="text-slate-400 text-sm">{student.student_code}</p>
        <div className="mt-2"><StudentStatusBadge status={student.status} /></div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Thông tin cá nhân</h2>
        <ProfileRow icon={IdCard} label="Mã học viên" value={student.student_code} />
        <ProfileRow icon={Cake} label="Ngày sinh" value={formatDate(student.date_of_birth)} />
        <ProfileRow icon={School} label="Trường học" value={student.school_name} />
        <ProfileRow icon={School} label="Lớp" value={student.school_class} />
        <ProfileRow icon={Phone} label="Điện thoại" value={student.phone} />
        <ProfileRow icon={Mail} label="Email" value={student.email} />
        <ProfileRow icon={MapPin} label="Địa chỉ" value={student.address} />
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Thông tin phụ huynh</h2>
        <ProfileRow icon={Users} label="Họ tên phụ huynh" value={student.parent_name} />
        <ProfileRow icon={Phone} label="Điện thoại" value={student.parent_phone} />
        <ProfileRow icon={Mail} label="Email" value={student.parent_email} />
      </div>

      <p className="text-xs text-slate-400 text-center px-4">
        Để cập nhật thông tin cá nhân, vui lòng liên hệ trực tiếp với trung tâm.
      </p>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-slate-400" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}
