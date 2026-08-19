import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCog, BookOpen, School, CalendarDays,
  ClipboardCheck, CreditCard, Receipt, TrendingUp, FileText,
  Bell, Landmark, Settings, LogOut, Menu, X, GraduationCap,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { authService } from '@/services/authService';
import { Avatar } from '@/components/common/UI';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/students', label: 'Học viên', icon: Users },
  { to: '/admin/teachers', label: 'Giáo viên', icon: UserCog },
  { to: '/admin/subjects', label: 'Môn học', icon: BookOpen },
  { to: '/admin/classes', label: 'Lớp học', icon: School },
  { to: '/admin/schedules', label: 'Lịch học', icon: CalendarDays },
  { to: '/admin/attendance', label: 'Điểm danh', icon: ClipboardCheck },
  { to: '/admin/fees', label: 'Học phí', icon: CreditCard },
  { to: '/admin/payments', label: 'Thanh toán', icon: Receipt },
  { to: '/admin/finance', label: 'Thu chi', icon: TrendingUp },
  { to: '/admin/documents', label: 'Tài liệu', icon: FileText },
  { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
  { to: '/admin/bank-accounts', label: 'Tài khoản NH', icon: Landmark },
  { to: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

const TEACHER_NAV_ITEMS = [
  { to: '/admin/classes', label: 'Lớp học', icon: School, exact: true },
  { to: '/admin/schedules', label: 'Lịch học', icon: CalendarDays },
  { to: '/admin/attendance', label: 'Điểm danh', icon: ClipboardCheck },
  { to: '/admin/documents', label: 'Tài liệu', icon: FileText },
  { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
];

export function AdminSidebar({ open, onClose }) {
  const { profile, isAdmin } = useAuth();
  const { schoolName, logoUrl } = useSettings();
  const navigate = useNavigate();
  const items = isAdmin ? NAV_ITEMS : TEACHER_NAV_ITEMS;

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 flex flex-col z-40 transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <GraduationCap size={20} className="text-white" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight truncate">{schoolName}</p>
              <p className="text-slate-400 text-xs">Quản lý hệ thống</p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-1 text-slate-400 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-thin">
          {items.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={profile?.full_name} src={profile?.avatar_url} size={8} />
            <div className="overflow-hidden flex-1">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-slate-400 text-xs">{profile?.role === 'ADMIN' ? 'Quản trị viên' : 'Giáo viên'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

export function AdminHeader({ onMenuClick, title }) {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center gap-4 px-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 lg:hidden"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>
      {title && (
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
          <span className="text-slate-400">Admin</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{title}</span>
        </div>
      )}
    </header>
  );
}
