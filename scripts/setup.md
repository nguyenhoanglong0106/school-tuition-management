# Hướng dẫn khởi tạo Supabase (một lần duy nhất)

## Bước 1 — Tạo tài khoản & project Supabase

1. Vào https://supabase.com → **Start your project** → đăng ký/đăng nhập.
2. **New Project** → đặt tên (ví dụ `school-tuition-management`) → chọn **Region** gần Việt Nam nhất (Singapore) → đặt Database Password (lưu lại nơi an toàn, không dùng trong app) → **Create new project**.
3. Đợi ~2 phút để project khởi tạo xong.

## Bước 2 — Lấy API keys

Vào **Project Settings → API**:

- `Project URL` → dùng cho `VITE_SUPABASE_URL`
- `anon public` key → dùng cho `VITE_SUPABASE_ANON_KEY`
- `service_role` key → **KHÔNG copy vào frontend**, chỉ dùng ở Bước 5 khi deploy Edge Functions (Supabase tự cấp biến này cho Edge Function, bạn không cần nhập tay).

## Bước 3 — Cài Supabase CLI

```bash
npm install -g supabase
```

## Bước 4 — Chạy migration (tạo toàn bộ database)

Trong thư mục gốc của project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

`YOUR_PROJECT_REF` lấy từ URL project: `https://supabase.com/dashboard/project/<PROJECT_REF>`.

Lệnh `db push` sẽ tự động chạy toàn bộ file trong `supabase/migrations/` theo đúng thứ tự (0001 → 0009), tạo:

- 20 bảng dữ liệu + index
- Toàn bộ RPC / function nghiệp vụ
- Row Level Security + policy
- 4 Storage bucket (`avatars`, `branding`, `documents`, `receipts`) + policy
- Dữ liệu mẫu (môn học, lớp, học viên demo...) để xem giao diện có dữ liệu ngay

**Bạn không cần tự viết hay copy bất kỳ câu SQL nào.**

### Nếu không muốn cài Supabase CLI

Vào **Supabase Dashboard → SQL Editor → New query**, mở lần lượt từng file trong `supabase/migrations/` theo đúng thứ tự (0001 → 0009), copy toàn bộ nội dung, dán vào SQL Editor và bấm **Run**. Làm tuần tự từng file, không bỏ qua file nào.

## Bước 5 — (Tùy chọn) Deploy Edge Functions

Cần thiết nếu bạn muốn Admin tạo tài khoản đăng nhập trực tiếp từ giao diện (nút "Tạo tài khoản đăng nhập" ở trang chi tiết học viên/giáo viên).

```bash
supabase functions deploy create-user
supabase functions deploy reset-user-password
```

Nếu bỏ qua bước này, bạn vẫn dùng được toàn bộ hệ thống — chỉ riêng 2 nút trên sẽ báo lỗi. Xem Bước 6 để tạo tài khoản thủ công thay thế.

## Bước 6 — Tạo tài khoản ADMIN đầu tiên

Đây là thao tác thủ công **duy nhất** bắt buộc phải làm qua Dashboard (Supabase không cho phép tạo Auth user bằng migration SQL vì lý do bảo mật).

1. **Authentication → Users → Add user → Create new user**.
2. Nhập Email + Password, tick **Auto Confirm User** → **Create user**.
3. Copy **User UID** vừa tạo (cột đầu bảng).
4. Vào **SQL Editor**, chạy:

```sql
insert into public.profiles (id, role, full_name, email, is_active, must_change_password)
values ('DÁN_USER_UID_VÀO_ĐÂY', 'ADMIN', 'Quản trị viên', 'DÁN_EMAIL_VỪA_TẠO', true, false);
```

5. Đăng nhập bằng email/password vừa tạo tại `/login` → chuyển vào `/admin`.

Từ tài khoản Admin này, bạn có thể vào **Học viên / Giáo viên → chi tiết → "Tạo tài khoản đăng nhập"** để tạo thêm tài khoản Giáo viên và Học viên khác ngay trên giao diện (cần đã hoàn thành Bước 5), không cần lặp lại thao tác SQL thủ công này nữa.

## Bước 7 — Kiểm tra RLS hoạt động đúng

Trong **SQL Editor**, chạy thử (thay UID bằng UID học viên khác):

```sql
select * from public.students where id = 'uid-cua-hoc-vien-khac';
```

Khi chạy với vai trò `authenticated` giả lập là một Student khác, kết quả phải trả về **rỗng** — xác nhận RLS chặn đúng.

## Bước 8 — Điền `.env`

```bash
cp .env.example .env
```

Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` lấy từ Bước 2. Xem `scripts/deploy.md` để chạy local và deploy lên Cloudflare Pages.
