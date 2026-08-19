import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, ShieldAlert, FileQuestion, ServerCrash } from 'lucide-react';

const VARIANTS = {
  403: {
    icon: ShieldAlert,
    title: 'Không có quyền truy cập',
    message: 'Bạn không có quyền xem trang này. Nếu đây là nhầm lẫn, vui lòng liên hệ quản trị viên.',
  },
  404: {
    icon: FileQuestion,
    title: 'Không tìm thấy trang',
    message: 'Trang bạn tìm không tồn tại hoặc đã bị di chuyển.',
  },
  500: {
    icon: ServerCrash,
    title: 'Đã xảy ra lỗi hệ thống',
    message: 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.',
  },
};

export default function ErrorPage({ code = 404 }) {
  const navigate = useNavigate();
  const v = VARIANTS[code] ?? VARIANTS[404];
  const Icon = v.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-6">
          <Icon size={36} className="text-primary-600" />
        </div>
        <p className="text-5xl font-extrabold text-slate-200 mb-2">{code}</p>
        <h1 className="text-xl font-bold text-slate-800 mb-2">{v.title}</h1>
        <p className="text-slate-500 text-sm mb-8">{v.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-ghost">
            <ArrowLeft size={16} />
            Quay lại
          </button>
          <Link to="/" className="btn-primary">
            <Home size={16} />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
