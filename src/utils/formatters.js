// Currency formatter - VND
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

// Date formatter - dd/MM/yyyy
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d);
  } catch {
    return '—';
  }
};

// Time formatter - HH:mm
export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  // timeStr can be "18:00:00" or "18:00"
  return timeStr.substring(0, 5);
};

// DateTime formatter
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d);
  } catch {
    return '—';
  }
};

// Month/Year
export const formatMonthYear = (month, year) => {
  return `Tháng ${String(month).padStart(2, '0')}/${year}`;
};

// File size
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Relative time
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return formatDate(dateStr);
};

// Day of week in Vietnamese
export const getDayOfWeekLabel = (dow) => {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[dow] ?? '—';
};

// Get initials for avatar
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Get current month/year in VN timezone
export const getCurrentMonthYear = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

// Strip diacritics/unsafe characters for use as a Supabase Storage object key
// — it 400s with "Invalid key" on non-ASCII bytes (e.g. "QUY CHẾ.docx").
// original_name/title columns keep the real Vietnamese filename for display.
export const sanitizeFileName = (name) => {
  const dotIdx = name.lastIndexOf('.');
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const ext = dotIdx > 0 ? name.slice(dotIdx) : '';
  const safeBase = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics (á, ế, ệ, ...)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D') // NFD doesn't decompose đ/Đ, handle separately
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, '');
  return (safeBase || 'file') + safeExt;
};

// Pluralize with Vietnamese
export const truncateText = (text, maxLen = 50) => {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
};
