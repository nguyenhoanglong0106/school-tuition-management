# Hệ thống Quản lý Học thêm (school-tuition-management)

Phần mềm quản lý trung tâm học thêm production-ready, **chạy hoàn toàn miễn phí** (Free Tier) — không VPS, không server riêng, không Docker, không IP tĩnh.

- **Web Admin** — dành cho quản trị viên & giáo viên (`/admin`)
- **Web App / PWA** — dành cho học viên & phụ huynh, cài được lên điện thoại như app thật (`/app`)
- **Backend** — Supabase Cloud (PostgreSQL, Authentication, Storage, Realtime, Row Level Security)
- **Hosting** — Cloudflare (Workers & Pages) (static site, HTTPS tự động)

---

## 1. Kiến trúc

```
Học viên / Phụ huynh / Giáo viên / Admin
              │  WiFi / 4G / 5G — bất kỳ mạng nào
              ▼
        Cloudflare (Workers & Pages)  (React + Vite, static)
              │  HTTPS
              ▼
        Supabase Cloud
     ┌────────┼─────────┐
     ▼        ▼         ▼
 PostgreSQL  Auth     Storage
     │
     ▼
  Realtime + RLS
```

Không phụ thuộc mạng LAN, không cần VPN, không cần mở port.

## 2. Công nghệ

- React 18 + Vite (JavaScript thuần, không TypeScript)
- React Router v7, Tailwind CSS, React Hook Form + Zod
- Supabase JS Client, Recharts, date-fns, Lucide Icons
- `vite-plugin-pwa` cho Progressive Web App
- Vitest cho unit test

## 3. Cấu trúc thư mục

```
school-tuition-management/
├── public/                  # icons PWA
├── wrangler.json             # cấu hình SPA routing cho Cloudflare (Workers Static Assets)
├── src/
│   ├── admin/                # Web Admin (layouts, pages, components)
│   ├── student/               # Student PWA (layouts, pages, components)
│   ├── auth/                  # Login, Forgot/Reset/Change password, route guards
│   ├── components/common/     # Table, Modal, Form, Badge, FileUpload, ErrorBoundary...
│   ├── hooks/                  # useDataList, useCurrentStudent, useOnlineStatus
│   ├── services/                # 1 service/domain — lớp giao tiếp Supabase duy nhất
│   ├── contexts/                 # AuthContext, SettingsContext, ToastContext
│   ├── utils/                     # formatters, feeCalculations, printService, exportExcel
│   ├── constants/                  # status/enum labels tiếng Việt
│   ├── routes/                      # AppRoutes.jsx — toàn bộ route + phân quyền
│   ├── App.jsx / main.jsx
├── supabase/
│   ├── migrations/            # 0001 → 0009 (schema/RPC/RLS/storage/seed), chạy tuần tự bằng `supabase db push`
│   ├── functions/              # Edge Functions (create-user, reset-user-password)
│   ├── config.toml             # đánh dấu thư mục project cho Supabase CLI
│   └── README.md
├── scripts/
│   ├── setup.md                # Hướng dẫn khởi tạo Supabase chi tiết
│   └── deploy.md                # Hướng dẫn chạy local & deploy Cloudflare (Workers & Pages)
├── .env.example
└── package.json
```

## 4. Vai trò & phân quyền

| | ADMIN | TEACHER | STUDENT (học viên/phụ huynh) |
|---|---|---|---|
| Dashboard, Học viên, Giáo viên, Môn học | ✅ | Xem lớp/học viên của mình | ❌ |
| Lớp học, Lịch học, Điểm danh | ✅ | Chỉ lớp mình phụ trách | Chỉ xem lớp/lịch/điểm danh của mình |
| Học phí, Thanh toán, Thu chi | ✅ | ❌ | Chỉ học phí/thanh toán của mình |
| Tài liệu, Thông báo | ✅ | Chỉ lớp mình phụ trách | Chỉ tài liệu/thông báo của lớp mình |
| Cấu hình, Tài khoản ngân hàng | ✅ | ❌ | ❌ |

Phân quyền được thực thi ở **hai lớp độc lập**: UI ẩn/hiện theo vai trò, và **Supabase Row Level Security** chặn ở tầng database (không thể bypass dù có sửa code frontend). Chi tiết: `supabase/README.md`.

## 5. Bắt đầu nhanh

```bash
git clone <repo-url>
cd school-tuition-management
npm install
cp .env.example .env
npm run dev
```

→ `http://localhost:5173`

Nhưng trước khi chạy được thật sự (đăng nhập, dữ liệu), bạn cần khởi tạo Supabase trước — xem **`scripts/setup.md`** (chỉ làm 1 lần).

## 6. Việc bạn cần làm thủ công (rất ít)

1. Tạo tài khoản + project Supabase (2 phút) — `scripts/setup.md` bước 1
2. Copy 2 biến môi trường (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) vào `.env`
3. Chạy `supabase db push` — tự động tạo toàn bộ 20 bảng, RLS, Storage, dữ liệu mẫu
4. Tạo 1 tài khoản Admin đầu tiên qua Supabase Dashboard (thao tác không thể tự động hóa vì lý do bảo mật của Supabase) — `scripts/setup.md` bước 6
5. Push code lên GitHub, deploy lên Cloudflare (Workers & Pages) — `scripts/deploy.md`
6. Gắn domain riêng nếu muốn

**Không cần** tự viết SQL, tự tạo bảng, tự sửa source để chạy được.

## 7. Sau khi deploy

Cloudflare cấp cho bạn 1 URL dạng `https://<ten-du-an>.<subdomain-cua-ban>.workers.dev` (hoặc domain riêng nếu đã gắn):

```
<url-cloudflare-cap>/login
<url-cloudflare-cap>/admin
<url-cloudflare-cap>/app
```

Học viên mở link `/app` trên điện thoại → trình duyệt gợi ý **"Thêm vào màn hình chính"** → dùng như app thật, không cần App Store.

## 8. Các module đã hoàn thành

- **Xác thực**: Login, Forgot/Reset password, bắt buộc đổi mật khẩu lần đầu, Protected/Role Route
- **Học viên & Giáo viên**: CRUD đầy đủ, mã tự sinh (HS000001, GV000001), soft delete, tạo tài khoản đăng nhập qua Edge Function
- **Lớp học**: CRUD, gán giáo viên/môn học, quản lý học viên trong lớp (thêm/chuyển/ưu đãi riêng), lịch học định kỳ
- **Lịch & Buổi học**: sinh buổi học tự động từ lịch định kỳ, đổi lịch/hủy/học bù, calendar tuần & tháng
- **Điểm danh**: đánh dấu hàng loạt, 4 trạng thái, chống lưu trùng, in bảng điểm danh
- **Học phí**: tạo hàng loạt theo lớp/tháng (không trùng), 5 trạng thái (chưa đóng/một phần/đã đóng/quá hạn/miễn giảm), ưu đãi riêng từng học viên
- **Thanh toán**: QR VietQR động, upload biên lai, RPC transaction-safe `confirm_payment`/`reject_payment`, in phiếu thu
- **Thu chi**: tự động ghi Income khi xác nhận thanh toán, thêm chi thủ công, biểu đồ 12 tháng
- **Tài liệu**: upload có kiểm soại định dạng/kích thước, Signed URL theo phân quyền lớp, bucket private
- **Thông báo**: tự động khi có học phí mới/thanh toán được xác nhận-từ chối/lịch đổi..., Realtime + fallback fetch
- **Dashboard**: số liệu tính bằng RPC phía server (không tải hàng trăm dòng ra frontend), biểu đồ Thu/Chi
- **Cấu hình thương hiệu**: tên/logo/slogan/màu — load từ database, không hard-code
- **PWA**: cài lên điện thoại, hoạt động standalone, cache app shell, banner mất mạng
- **Xuất Excel & In ấn**: danh sách học viên/lớp/công nợ, phiếu thu, bảng điểm danh
- **Bảo mật**: RLS toàn bộ bảng, Edge Function xác thực JWT + vai trò trước khi dùng Service Role key

## 9. Lệnh hữu ích

```bash
npm run dev       # chạy local, http://localhost:5173
npm run build     # build production ra dist/
npm run preview   # xem thử bản build production
npm run test      # chạy unit test (Vitest)
npm run lint      # kiểm tra code (ESLint)
```

## 10. Checklist trước khi bàn giao

```
[ ] Tạo Supabase Project
[ ] Chạy migration (supabase db push)
[ ] Tạo Auth Admin đầu tiên
[ ] Điền .env
[ ] Test local (npm run dev)
[ ] Push GitHub
[ ] Tạo Cloudflare (Workers & Pages) project
[ ] Add Environment Variables trên Cloudflare
[ ] Deploy
[ ] Test /admin (đăng nhập Admin)
[ ] Test /app (đăng nhập Student)
[ ] Đổi mật khẩu mặc định
[ ] Cập nhật tài khoản ngân hàng thật (Cấu hình → Tài khoản ngân hàng)
[ ] Cập nhật branding thật (Cấu hình → Tên/Logo/Slogan/Địa chỉ)
```

## 11. Tài liệu chi tiết

- **`scripts/setup.md`** — khởi tạo Supabase từng bước, kèm ảnh chụp thao tác Dashboard
- **`scripts/deploy.md`** — chạy local & deploy Cloudflare (Workers & Pages) từng bước
- **`supabase/README.md`** — giải thích schema, RLS, RPC, Storage, Edge Functions

## 12. Giới hạn Free Tier cần biết

Supabase Free Tier: 500MB database, 1GB file storage, project tự tạm dừng (pause) sau 7 ngày không có traffic — chỉ cần mở lại 1 lần trong Dashboard là hoạt động lại bình thường, dữ liệu không mất. Cloudflare (Workers & Pages) Free Tier: không giới hạn băng thông, 500 lượt build/tháng — dư sức cho một trung tâm học thêm quy mô vừa và nhỏ.
