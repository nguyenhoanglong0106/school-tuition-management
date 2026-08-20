import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, ClipboardCheck, School, KeyRound, LogOut, ChevronRight, Building2, Bell, NotebookPen, Layers } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Avatar } from '@/components/common/UI';
import { isPushSupported, getCurrentSubscription, enablePush, disablePush } from '@/lib/push';

const ITEMS = [
  { to: '/app/profile', label: 'Hồ sơ cá nhân', icon: User },
  { to: '/app/classes', label: 'Lớp đang học', icon: School },
  { to: '/app/exercises', label: 'Bài tập', icon: NotebookPen },
  { to: '/app/study-topics', label: 'Chuyên đề học', icon: Layers },
  { to: '/app/payments', label: 'Lịch sử thanh toán', icon: CreditCard },
  { to: '/app/attendance', label: 'Điểm danh', icon: ClipboardCheck },
];

export default function StudentMore() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { schoolName, settings } = useSettings();
  const { addToast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    getCurrentSubscription().then((sub) => setPushEnabled(!!sub));
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login', { replace: true });
  };

  const handleTogglePush = async () => {
    if (!isPushSupported()) {
      addToast('Trình duyệt này không hỗ trợ thông báo đẩy', 'error');
      return;
    }
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePush();
        setPushEnabled(false);
        addToast('Đã tắt thông báo đẩy');
      } else {
        await enablePush(profile.id);
        setPushEnabled(true);
        addToast('Đã bật thông báo đẩy');
      }
    } catch (err) {
      addToast(err.message ?? 'Không thể thay đổi cài đặt thông báo', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5 flex items-center gap-4">
        <Avatar name={profile?.full_name} src={profile?.avatar_url} size={14} />
        <div className="min-w-0">
          <p className="font-bold text-slate-800 truncate">{profile?.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
        </div>
      </div>

      <div className="card divide-y divide-slate-50">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <button key={to} onClick={() => navigate(to)} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left">
            <Icon size={18} className="text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        ))}
        <button onClick={() => navigate('/reset-password')} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left">
          <KeyRound size={18} className="text-slate-400" />
          <span className="flex-1 text-sm font-medium text-slate-700">Đổi mật khẩu</span>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
        <button onClick={handleTogglePush} disabled={pushBusy} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left disabled:opacity-60">
          <Bell size={18} className="text-slate-400" />
          <span className="flex-1 text-sm font-medium text-slate-700">Thông báo đẩy</span>
          <span
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${pushEnabled ? 'bg-primary-600' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <Building2 size={18} className="text-slate-400" />
        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-700">{schoolName}</p>
          <p>{settings?.phone} · {settings?.email}</p>
        </div>
      </div>

      <button onClick={handleLogout} className="w-full card p-4 flex items-center justify-center gap-2 text-red-500 font-medium">
        <LogOut size={18} /> Đăng xuất
      </button>
    </div>
  );
}
