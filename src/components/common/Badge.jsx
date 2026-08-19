import { clsx } from 'clsx';

// Badge component with semantic colors based on status
export function Badge({ label, color = 'neutral', className = '' }) {
  const colorClasses = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    primary: 'badge-primary',
    neutral: 'badge-neutral',
  };

  return (
    <span className={clsx('badge', colorClasses[color] ?? 'badge-neutral', className)}>
      {label}
    </span>
  );
}

// Status badge auto-mapped from constants
import { FEE_STATUS, PAYMENT_STATUS, STUDENT_STATUS, CLASS_STATUS, SESSION_STATUS, ATTENDANCE_STATUS } from '@/constants';

export function FeeStatusBadge({ status }) {
  const s = FEE_STATUS[status] ?? { label: status, color: 'neutral' };
  return <Badge label={s.label} color={s.color} />;
}

export function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, color: 'neutral' };
  return <Badge label={s.label} color={s.color} />;
}

export function StudentStatusBadge({ status }) {
  const s = STUDENT_STATUS[status] ?? { label: status, color: 'neutral' };
  return <Badge label={s.label} color={s.color} />;
}

export function ClassStatusBadge({ status }) {
  const s = CLASS_STATUS[status] ?? { label: status, color: 'neutral' };
  return <Badge label={s.label} color={s.color} />;
}

export function SessionStatusBadge({ status }) {
  const s = SESSION_STATUS[status] ?? { label: status, color: 'neutral' };
  return <Badge label={s.label} color={s.color} />;
}

export function AttendanceStatusBadge({ status }) {
  const s = ATTENDANCE_STATUS[status] ?? { label: status, color: 'neutral' };
  return <Badge label={s.label} color={s.color} />;
}
