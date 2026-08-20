import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, CreditCard, FileText, User, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { notificationService } from '@/services/notificationService';
import { Spinner } from '@/components/common/UI';

const BOTTOM_NAV = [
  { to: '/app', label: 'Trang chủ', icon: Home, exact: true },
  { to: '/app/schedule', label: 'Lịch học', icon: CalendarDays },
  { to: '/app/fees', label: 'Học phí', icon: CreditCard },
  { to: '/app/documents', label: 'Tài liệu', icon: FileText },
  { to: '/app/more', label: 'Tài khoản', icon: User },
];

export default function StudentLayout() {
  const { profile } = useAuth();
  const { schoolName, logoUrl } = useSettings();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadUnread();
    const channel = notificationService.subscribeToNotifications(profile?.id, () => loadUnread());
    return () => notificationService.unsubscribe(channel);
  }, [profile?.id]);

  const loadUnread = async () => {
    const count = await notificationService.getUnreadCount();
    setUnread(count);
  };

  return (
    // Scrolling is contained to <main> only (h-screen + overflow-hidden on the
    // shell) instead of letting the whole document scroll. A document-level
    // scroll makes iOS Safari's address bar collapse/expand as you scroll,
    // which visibly jumps/flickers any `position: fixed` element (the bottom
    // nav) as the visual viewport height changes underneath it. Keeping header
    // and nav as plain flex children of a viewport-locked shell (same pattern
    // AdminLayout already uses) sidesteps that entirely — they never need
    // `sticky`/`fixed` because they're simply never part of the scrolling area.
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top header */}
      <header className="flex-shrink-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-white text-xs font-bold">{schoolName?.charAt(0)}</span>}
          </div>
          <p className="font-semibold text-slate-800 text-sm truncate flex-1">{schoolName}</p>
          <button onClick={() => navigate('/app/notifications')} className="relative p-2 rounded-xl hover:bg-slate-100">
            <Bell size={19} className="text-slate-500" />
            {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-lg w-full mx-auto px-4 py-4">
          <Suspense fallback={<div className="flex justify-center py-24"><Spinner size="lg" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 z-30 bg-white border-t border-slate-100 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {BOTTOM_NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
