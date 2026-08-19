import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/UI';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import AppRoutes from '@/routes/AppRoutes';

function OfflineWatcher() {
  const online = useOnlineStatus();
  return !online ? <OfflineBanner /> : null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>
              <OfflineWatcher />
              <AppRoutes />
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
