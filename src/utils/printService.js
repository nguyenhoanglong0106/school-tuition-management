import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { PAYMENT_METHOD } from '@/constants';

const PRINT_STYLES = `
  * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
  body { padding: 32px; color: #1e293b; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #4F46E5; padding-bottom: 16px; }
  .header h1 { margin: 0 0 4px; font-size: 20px; color: #4F46E5; }
  .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td, th { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 13px; text-align: left; }
  th { background: #f8fafc; width: 40%; }
  .amount { font-size: 16px; font-weight: bold; color: #22C55E; }
  .footer { display: flex; justify-content: space-between; margin-top: 48px; text-align: center; font-size: 12px; }
  .sign { margin-top: 60px; font-weight: bold; }
`;

function openPrintWindow(title, bodyHtml) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(`
    <!doctype html>
    <html lang="vi"><head><meta charset="UTF-8"><title>${title}</title><style>${PRINT_STYLES}</style></head>
    <body>${bodyHtml}<script>window.onload = () => { window.print(); }</script></body></html>
  `);
  win.document.close();
}

export function printReceipt(payment, fee, student, settings) {
  const html = `
    <div class="header">
      <h1>${settings?.school_name ?? 'Trung Tâm Học Thêm'}</h1>
      <p>${settings?.address ?? ''}</p>
      <p>ĐT: ${settings?.phone ?? ''} · Email: ${settings?.email ?? ''}</p>
    </div>
    <div class="title">Phiếu Thu Học Phí</div>
    <table>
      <tr><th>Mã phiếu thu</th><td>${payment.payment_code}</td></tr>
      <tr><th>Học viên</th><td>${student?.full_name ?? ''} (${student?.student_code ?? ''})</td></tr>
      <tr><th>Lớp</th><td>${fee?.classes?.class_name ?? ''}</td></tr>
      <tr><th>Kỳ học phí</th><td>${fee?.period_label ?? ''}</td></tr>
      <tr><th>Số tiền</th><td class="amount">${formatCurrency(payment.amount)}</td></tr>
      <tr><th>Ngày thu</th><td>${formatDateTime(payment.payment_date)}</td></tr>
      <tr><th>Phương thức</th><td>${PAYMENT_METHOD[payment.payment_method]?.label ?? payment.payment_method}</td></tr>
      <tr><th>Ghi chú</th><td>${payment.note ?? '—'}</td></tr>
    </table>
    <div class="footer">
      <div><div>Người nộp tiền</div><div class="sign">(Ký, ghi rõ họ tên)</div></div>
      <div><div>Người xác nhận</div><div class="sign">(Ký, ghi rõ họ tên)</div></div>
    </div>
  `;
  openPrintWindow(`Phieu-thu-${payment.payment_code}`, html);
}

export function printClassRoster(cls, students) {
  const rows = students
    .map(
      (s, i) => `<tr><td>${i + 1}</td><td>${s.students?.student_code ?? ''}</td><td>${s.students?.full_name ?? ''}</td><td>${s.students?.phone ?? ''}</td></tr>`
    )
    .join('');
  const html = `
    <div class="title">Danh Sách Học Viên Lớp ${cls.class_name}</div>
    <table>
      <thead><tr><th style="width:40px">STT</th><th>Mã HV</th><th>Họ tên</th><th>SĐT</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  openPrintWindow(`Danh-sach-${cls.class_code}`, html);
}

export function printAttendanceSheet(session, records) {
  const rows = records
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.student?.student_code ?? ''}</td><td>${r.student?.full_name ?? ''}</td><td>${r.status ?? ''}</td></tr>`)
    .join('');
  const html = `
    <div class="title">Bảng Điểm Danh</div>
    <p style="text-align:center;font-size:13px;color:#64748b">Ngày ${formatDateTime(session.session_date)} · Phòng ${session.room ?? ''}</p>
    <table>
      <thead><tr><th style="width:40px">STT</th><th>Mã HV</th><th>Họ tên</th><th>Trạng thái</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  openPrintWindow(`Diem-danh-${session.session_date}`, html);
}
