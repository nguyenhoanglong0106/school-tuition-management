# Hướng dẫn chạy Local & Deploy Production

Không cần VPS, không cần Docker, không cần server 24/7. Toàn bộ backend chạy trên Supabase Cloud (Free Tier), frontend là static site deploy lên Cloudflare Pages (Free Tier).

## Chạy local (development)

```bash
git clone <repo-url>
cd school-tuition-management
npm install
cp .env.example .env
# điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env
npm run dev
```

Mở trình duyệt: `http://localhost:5173`

- `http://localhost:5173/login`
- `http://localhost:5173/admin`
- `http://localhost:5173/app`

## Build production (kiểm tra trước khi deploy)

```bash
npm run build
npm run preview
```

`npm run build` xuất ra thư mục `dist/` — đây chính là nội dung Cloudflare Pages sẽ deploy.

## Deploy lên Cloudflare Pages

### 1. Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/school-tuition-management.git
git push -u origin main
```

> `.env` đã được `.gitignore` loại trừ — không bao giờ bị đẩy lên GitHub.

### 2. Tạo Pages Project

1. Vào https://dash.cloudflare.com → **Workers & Pages** → **Create application** → tab **Pages** → **Connect to Git**.
2. Chọn repository `school-tuition-management` vừa push.
3. Cấu hình build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment variables** (mục "Add variable", áp dụng cho cả Production và Preview):
   - `VITE_SUPABASE_URL` = URL project Supabase của bạn
   - `VITE_SUPABASE_ANON_KEY` = anon public key
   - `VITE_APP_NAME`, `VITE_TIMEZONE`, `VITE_DEFAULT_LOCALE`, `VITE_MAX_FILE_SIZE_MB` (xem `.env.example`, tùy chọn)
5. Bấm **Save and Deploy**.

Cloudflare tự build và trả về URL dạng `https://school-tuition-management.pages.dev`.

### 3. Kiểm tra SPA routing

File `public/_redirects` (đã có sẵn trong project) đảm bảo các route như `/admin/students`, `/app/fees` khi refresh trực tiếp không bị lỗi 404:

```
/* /index.html 200
```

Cloudflare Pages tự nhận file này, không cần cấu hình thêm.

### 4. Gắn domain riêng (tùy chọn)

Trong Pages project → **Custom domains** → **Set up a custom domain** → nhập domain (ví dụ `hocthem.example.com`) → làm theo hướng dẫn trỏ DNS. HTTPS được Cloudflare tự cấp và gia hạn miễn phí, không cần thao tác thêm.

Nếu không có domain riêng, dùng luôn domain miễn phí `*.pages.dev`.

## Kết quả

Sau khi deploy, hệ thống truy cập được từ WiFi nhà, WiFi trường, WiFi công cộng, 4G, 5G — bất kỳ mạng Internet nào, không cần VPN, không cần mở port, không cần IP tĩnh.

## Cập nhật sau này

Mỗi lần `git push` lên nhánh `main`, Cloudflare Pages tự động build và deploy lại — không cần thao tác thủ công.

Nếu bạn thay đổi schema database (thêm migration mới trong `supabase/migrations/`), chạy lại:

```bash
supabase db push
```

Migration cũ không bị chạy lại (Supabase CLI theo dõi migration đã áp dụng), chỉ file mới được thực thi.
