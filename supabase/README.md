# Supabase — Cấu trúc Database

Thư mục này chứa toàn bộ schema, business logic, bảo mật (RLS) và dữ liệu mẫu cho hệ thống, dưới dạng migration SQL chạy tuần tự.

## Thứ tự migration

| File | Nội dung |
|---|---|
| `0001_initial_schema.sql` | 20 bảng dữ liệu (profiles, students, teachers, classes, fees, payments, finance, documents, notifications...), toàn bộ index |
| `0002_functions.sql` | Trigger `updated_at`, các hàm sinh mã (HS/GV/HP/PT), RPC giao dịch `confirm_payment`, `reject_payment`, `create_class_monthly_fees`, `generate_sessions_from_schedule`, `get_admin_dashboard_metrics`, RPC thông báo |
| `0003_rls.sql` | Bật Row Level Security trên toàn bộ bảng nghiệp vụ + policy cho ADMIN / TEACHER / STUDENT |
| `0004_storage_policies.sql` | Tạo 4 Storage bucket (`avatars`, `branding`, `documents`, `receipts`) + policy truy cập |
| `0005_seed.sql` | Dữ liệu mẫu: môn học, danh mục thu chi, giáo viên, lớp học, học viên, học phí, thanh toán... để xem giao diện có dữ liệu ngay |
| `0006_rls_hardening.sql` | Siết chặt các policy cho phép TEACHER ghi dữ liệu ngoài phạm vi lớp mình phụ trách (notifications, documents, profiles) |
| `0007_rpc_role_hardening.sql` | Thêm kiểm tra vai trò ADMIN còn thiếu bên trong 3 hàm `SECURITY DEFINER` (`create_class_monthly_fees`, `generate_sessions_from_schedule`, `get_admin_dashboard_metrics`) — các hàm này bỏ qua RLS nên bắt buộc phải tự kiểm tra quyền |
| `0008_receipts_storage_hardening.sql` | Sửa policy upload biên lai để kiểm tra đúng thư mục sở hữu (khớp với auth.uid()), tránh việc tải lên vào thư mục của người khác |
| `0009_storage_bucket_limits.sql` | Giới hạn dung lượng & định dạng file được phép ở cấp Storage bucket (`file_size_limit`, `allowed_mime_types`) — chặn ngay cả khi có người gọi thẳng API bỏ qua kiểm tra phía frontend |

Chạy toàn bộ theo đúng thứ tự này (Supabase CLI tự làm điều đó khi bạn chạy `supabase db push` — xem `scripts/setup.md`).

## Vì sao dùng RPC cho các thao tác tài chính?

`confirm_payment`, `reject_payment`, `create_class_monthly_fees` đều là `SECURITY DEFINER` function chạy trong 1 transaction PostgreSQL duy nhất: khóa dòng (`FOR UPDATE`), kiểm tra quyền, cập nhật `payments`/`student_fees`, ghi `financial_transactions`, tạo `notifications`, ghi `audit_logs` — tất cả hoặc thành công toàn bộ hoặc rollback toàn bộ. Điều này đảm bảo số liệu học phí/thu chi không bao giờ lệch nhau kể cả khi có nhiều người thao tác đồng thời.

## Vì sao KHÔNG dùng float cho tiền?

Toàn bộ cột tiền dùng `NUMERIC(15, 2)`. Frontend format hiển thị bằng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.

## RLS — nguyên tắc cốt lõi

- Mọi bảng nghiệp vụ đều `ENABLE ROW LEVEL SECURITY`.
- Vai trò được xác định qua `public.is_admin()` / `public.is_teacher()` / `public.get_student_id()` / `public.get_teacher_id()` — các hàm `SECURITY DEFINER` tra cứu bảng `profiles`, `students`, `teachers` dựa trên `auth.uid()`.
- **ADMIN**: toàn quyền trên mọi bảng.
- **TEACHER**: chỉ đọc/ghi dữ liệu của lớp mình phụ trách (`classes.teacher_id = get_teacher_id()`), không được truy cập `student_fees`, `payments`, `financial_transactions`, `financial_categories`, `bank_accounts` (ghi), `system_settings` (ghi).
- **STUDENT**: chỉ đọc dữ liệu gắn với `profile_id = auth.uid()` (qua bảng `students`), không bao giờ đọc được dữ liệu học viên khác.
- **anon** (chưa đăng nhập): chỉ đọc được `system_settings` (để hiển thị tên/logo trung tâm ở trang đăng nhập) — không truy cập được bất kỳ bảng nghiệp vụ nào khác.

## Storage buckets

| Bucket | Public? | Ghi chú |
|---|---|---|
| `avatars` | Public | Ảnh đại diện |
| `branding` | Public | Logo trung tâm |
| `documents` | **Private** | Tài liệu học tập — chỉ trả về qua Signed URL, kiểm tra học viên thuộc lớp được gán tài liệu |
| `receipts` | **Private** | Biên lai chuyển khoản — học viên chỉ xem được biên lai của chính mình (folder theo `student_id`), Admin xem tất cả |

## Edge Functions (`supabase/functions/`)

| Function | Mục đích |
|---|---|
| `create-user` | Admin tạo tài khoản đăng nhập (Auth user + `profiles`) cho học viên/giáo viên. Xác thực JWT + vai trò ADMIN trước khi dùng Service Role key. |
| `reset-user-password` | Admin đặt lại mật khẩu tạm thời cho một tài khoản, tự động buộc đổi mật khẩu ở lần đăng nhập kế tiếp. |

Service Role key **chỉ** tồn tại trong biến môi trường của Edge Function (`SUPABASE_SERVICE_ROLE_KEY`, được Supabase tự cấp cho mọi Edge Function) — không bao giờ nằm trong code frontend hay file `.env` của Vite.

## Views / RPC hiệu năng

`get_admin_dashboard_metrics()` tính toàn bộ số liệu Dashboard bằng 1 lệnh SQL phía server thay vì tải hàng trăm dòng về tính ở frontend.
