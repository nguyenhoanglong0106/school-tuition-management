import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/constants';

// Skeleton loader
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-3xl">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      {description && <p className="text-slate-400 text-sm mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// Pagination
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1 && !onPageSizeChange) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          Hiển thị <span className="font-medium">{from}–{to}</span> / <span className="font-medium">{total}</span>
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-sm text-slate-500">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}/trang</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn btn-ghost btn-sm p-2"
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
          let p;
          if (totalPages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn btn-ghost btn-sm p-2"
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      )}
    </div>
  );
}

// Loading spinner
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <svg
        className={`animate-spin text-primary-600 ${sizes[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

// Avatar with initials fallback
export function Avatar({ src, name, size = 10, className = '' }) {
  const getInitials = (n) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };

  // Tailwind's JIT scanner only picks up class names it can see literally in
  // source text -- a template-built `w-${size}` is invisible to it, so any
  // size without that exact literal string used elsewhere in the codebase
  // silently gets no width/height at all (this is what made the size=14
  // avatar balloon to fill its card). Inline px sizing sidesteps that
  // entirely, matching Tailwind's own 1 unit = 4px spacing scale.
  const px = size * 4;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  const colors = [
    'from-indigo-400 to-indigo-600',
    'from-cyan-400 to-cyan-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-emerald-400 to-emerald-600',
    'from-orange-400 to-orange-600',
  ];
  const colorIdx = (name ?? '').charCodeAt(0) % colors.length;

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      style={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      <span>{getInitials(name)}</span>
    </div>
  );
}

// Error boundary fallback
export function ErrorFallback({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-4xl mb-4">😵</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Đã xảy ra lỗi</h3>
      <p className="text-slate-400 text-sm mb-6 max-w-sm">{error?.message ?? 'Không thể tải nội dung'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Thử lại
        </button>
      )}
    </div>
  );
}

// Network offline banner
export function OfflineBanner() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-sm text-center py-2 px-4 font-medium">
      📶 Không có kết nối Internet. Vui lòng kiểm tra WiFi hoặc 4G/5G và thử lại.
    </div>
  );
}
