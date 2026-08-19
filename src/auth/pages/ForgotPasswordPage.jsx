import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, GraduationCap } from 'lucide-react';
import { authService } from '@/services/authService';
import { useSettings } from '@/contexts/SettingsContext';
import { Spinner } from '@/components/common/UI';

export default function ForgotPasswordPage() {
  const { schoolName } = useSettings();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">{schoolName}</h1>
        </div>

        <div className="card p-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-6 transition-colors">
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Đã gửi email!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư (bao gồm thư mục Spam).
              </p>
              <Link to="/login" className="btn-primary w-full justify-center">
                Về trang đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Quên mật khẩu?</h2>
              <p className="text-slate-500 text-sm mb-6">
                Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <Spinner size="sm" /> : 'Gửi link đặt lại mật khẩu'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
