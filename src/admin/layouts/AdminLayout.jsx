import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar, AdminHeader } from '@/admin/components/AdminSidebar';
import { Spinner } from '@/components/common/UI';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
            {/* Nested Suspense: only the content area shows a spinner while a
                page chunk loads — the sidebar/header never remount or flash. */}
            <Suspense fallback={<div className="flex justify-center py-24"><Spinner size="lg" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
