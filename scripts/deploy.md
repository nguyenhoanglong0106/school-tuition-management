# Hướng dẫn chạy Local & Deploy Production

Không cần VPS, không cần Docker, không cần server 24/7. Toàn bộ backend chạy trên Supabase Cloud (Free Tier), frontend là static site deploy lên Cloudflare (Workers & Pages) (Free Tier).

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

`npm run build` xuất ra thư mục `dist/` — đây chính là nội dung Cloudflare (Workers & Pages) sẽ deploy.

## Deploy lên Cloudflare (Workers & Pages)

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

### 2. Tạo project trên Cloudflare

Cloudflare hiện đã gộp "Pages" vào chung sản phẩm **Workers & Pages** — không còn tab "Pages" riêng, chỉ có một luồng "Create application" duy nhất, tự nhận diện và deploy như một Worker có phục vụ file tĩnh ("Workers Static Assets").

1. Vào https://dash.cloudflare.com → **Workers & Pages** → **Create application**.
2. Ở bước chọn nguồn code, chọn kết nối tới **repository GitHub bạn đã tự push** (`school-tuition-management`). **Quan trọng**: phải chọn đúng repo có sẵn của bạn — nếu màn hình ghi "A Git repository will be created for you", đó là nhánh khác (tự tạo repo mới từ template), không phải cái bạn cần.
3. Cấu hình build (nếu không tự nhận diện, điền tay):
   - **Build command**: `npm run build`
   - **Deploy command**: để mặc định (Cloudflare tự dùng `npx wrangler deploy`, đọc cấu hình từ file `wrangler.json` có sẵn trong project)
4. **Environment variables** — thêm đúng 2 biến bắt buộc (các biến còn lại trong `.env.example` là tùy chọn):
   - `VITE_SUPABASE_URL` = URL project Supabase của bạn
   - `VITE_SUPABASE_ANON_KEY` = anon public key
5. Bấm **Save and Deploy**.

Cloudflare build xong sẽ trả về URL — thường có dạng `https://school-tuition-management.<tên-subdomain-của-bạn>.workers.dev` (không phải `.pages.dev` như trước đây, vì giờ chạy trên nền Workers). Dùng đúng URL Cloudflare hiển thị cho bạn sau khi deploy thành công.

### 3. SPA routing (đã cấu hình sẵn, không cần làm gì thêm)

File `wrangler.json` ở gốc project khai báo:
```json
"assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
```
Đây là cách Cloudflare hiện khuyến nghị để các route như `/admin/students`, `/app/fees` khi refresh trực tiếp không bị lỗi 404 (thay cho file `_redirects` kiểu Pages cũ — cách cũ bị engine deploy mới của Cloudflare từ chối với lỗi "Invalid _redirects configuration: Infinite loop detected").

### 4. Gắn domain riêng (tùy chọn)

Trong project vừa tạo → **Domains** (hoặc **Custom domains**) → **Add** → nhập domain (ví dụ `hocthem.example.com`) → làm theo hướng dẫn trỏ DNS. HTTPS được Cloudflare tự cấp và gia hạn miễn phí, không cần thao tác thêm.

Nếu không có domain riêng, dùng luôn domain miễn phí Cloudflare cấp sẵn (dạng `*.workers.dev`).

## Kết quả

Sau khi deploy, hệ thống truy cập được từ WiFi nhà, WiFi trường, WiFi công cộng, 4G, 5G — bất kỳ mạng Internet nào, không cần VPN, không cần mở port, không cần IP tĩnh.

## Cập nhật sau này

Mỗi lần `git push` lên nhánh `main`, Cloudflare (Workers & Pages) tự động build và deploy lại — không cần thao tác thủ công.

Nếu bạn thay đổi schema database (thêm migration mới trong `supabase/migrations/`), chạy lại:

```bash
supabase db push
```

Migration cũ không bị chạy lại (Supabase CLI theo dõi migration đã áp dụng), chỉ file mới được thực thi.
