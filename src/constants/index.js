// Fee status mapping
export const FEE_STATUS = {
  UNPAID: { label: 'Chưa đóng', color: 'warning' },
  PARTIAL: { label: 'Đóng một phần', color: 'info' },
  PAID: { label: 'Đã đóng', color: 'success' },
  OVERDUE: { label: 'Quá hạn', color: 'danger' },
  WAIVED: { label: 'Miễn giảm', color: 'neutral' },
};

// Payment status mapping
export const PAYMENT_STATUS = {
  PENDING: { label: 'Chờ xác nhận', color: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'success' },
  REJECTED: { label: 'Bị từ chối', color: 'danger' },
  CANCELLED: { label: 'Đã hủy', color: 'neutral' },
};

// Payment methods
export const PAYMENT_METHOD = {
  CASH: { label: 'Tiền mặt', icon: '💵' },
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: '🏦' },
  OTHER: { label: 'Khác', icon: '💳' },
};

// Student status
export const STUDENT_STATUS = {
  ACTIVE: { label: 'Đang học', color: 'success' },
  PAUSED: { label: 'Tạm nghỉ', color: 'warning' },
  STOPPED: { label: 'Đã nghỉ', color: 'danger' },
};

// Class status
export const CLASS_STATUS = {
  ACTIVE: { label: 'Đang hoạt động', color: 'success' },
  PAUSED: { label: 'Tạm dừng', color: 'warning' },
  FINISHED: { label: 'Kết thúc', color: 'neutral' },
  CANCELLED: { label: 'Đã hủy', color: 'danger' },
};

// Session status
export const SESSION_STATUS = {
  SCHEDULED: { label: 'Lịch học', color: 'info' },
  COMPLETED: { label: 'Đã học xong', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'danger' },
  RESCHEDULED: { label: 'Đổi lịch', color: 'warning' },
  MAKEUP: { label: 'Học bù', color: 'primary' },
};

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: { label: 'Có mặt', color: 'success', icon: '✅' },
  ABSENT: { label: 'Vắng mặt', color: 'danger', icon: '❌' },
  EXCUSED: { label: 'Có phép', color: 'warning', icon: '📝' },
  LATE: { label: 'Đi trễ', color: 'info', icon: '⏰' },
};

// Exercise assignment status
export const EXERCISE_ASSIGNMENT_STATUS = {
  ACTIVE: { label: 'Đang mở', color: 'success' },
  CLOSED: { label: 'Đã đóng', color: 'neutral' },
  ARCHIVED: { label: 'Lưu trữ', color: 'neutral' },
};

// Exercise submission status
export const EXERCISE_SUBMISSION_STATUS = {
  NOT_STARTED: { label: 'Chưa làm', color: 'neutral' },
  IN_PROGRESS: { label: 'Đang làm', color: 'info' },
  SUBMITTED: { label: 'Đã nộp, chờ chấm', color: 'warning' },
  LATE: { label: 'Nộp trễ', color: 'warning' },
  GRADED: { label: 'Đã chấm', color: 'success' },
};

// Fee cycle
export const FEE_CYCLE = {
  MONTHLY: 'Hàng tháng',
  PER_SESSION: 'Theo buổi trong tháng',
  COURSE: 'Theo khóa',
  CUSTOM: 'Tùy chỉnh',
};

// Notification types
export const NOTIFICATION_TYPE = {
  GENERAL: { label: 'Thông báo chung', icon: '📢' },
  CLASS: { label: 'Lớp học', icon: '📚' },
  STUDENT: { label: 'Học viên', icon: '👤' },
  TUITION: { label: 'Học phí', icon: '💰' },
  PAYMENT: { label: 'Thanh toán', icon: '💳' },
  SCHEDULE: { label: 'Lịch học', icon: '📅' },
  DOCUMENT: { label: 'Tài liệu', icon: '📄' },
  ATTENDANCE: { label: 'Điểm danh', icon: '✅' },
};

// Roles
export const ROLES = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
};

// Allowed file types for documents
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'
];

// Page sizes
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

// Months in Vietnamese
export const MONTHS_VN = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// Days of week in Vietnamese
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];
