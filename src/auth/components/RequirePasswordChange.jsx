import { useAuth } from '@/contexts/AuthContext';
import ChangePasswordPage from '@/auth/pages/ChangePasswordPage';

// Blocks access to protected areas until a flagged account sets a new password.
export function RequirePasswordChange({ children }) {
  const { profile } = useAuth();
  if (profile?.must_change_password) {
    return <ChangePasswordPage />;
  }
  return children;
}
