import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, GraduationCap } from 'lucide-react';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/contexts/SettingsContext';
import { Spinner } from '@/components/common/UI';
import { getHomePathForRole } from '@/utils/permissions';

export default function LoginPage() {
  const navigate = useNavigate();
  const { schoolName, logoUrl } = useSettings();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setError('');

    try {
      const isStudentLogin = !identifier.includes('@');
      const { user } = isStudentLogin
        ? await authService.loginStudent(identifier.trim(), password)
        : await authService.login(identifier.trim(), password);

      // Get profile to determine redirect
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

      navigate(getHomePathForRole(profile?.role), { replace: true });
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid') || msg.includes('Tài khoản')) {
        setError('Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      } else {
        setError(msg || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-secondary-400/10" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl mb-4 shadow-elevated">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
            ) : (
              <GraduationCap className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{schoolName}</h1>
          <p className="text-white/70 text-sm">Đăng nhập để tiếp tục</p>
        </div>

        {/* Login Card */}
        <div className="card p-8 shadow-elevated">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Đăng nhập</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Tài khoản học viên</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="form-input"
                placeholder="Nhập tài khoản học viên"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="form-label">Mật khẩu</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-12"
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <Spinner size="sm" className="inline-flex" />
              ) : (
                <>
                  <LogIn size={18} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Quên mật khẩu? Liên hệ giáo viên
            </p>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          &copy; {new Date().getFullYear()} {schoolName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
