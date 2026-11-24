---
title: T-16. Trang khách của mỗi cơ sở trên tên miền con
---

Chốt ngày 07/11/2026, thay phần "trang khách" của T-15. Khu nội bộ, quản trị nền tảng và mock giữ như T-15.

| Phần | Địa chỉ (ví dụ với tên miền `sapio.vn`) |
|---|---|
| Trang giới thiệu, đăng ký, đăng nhập nhân sự | `sapio.vn/`, `sapio.vn/signup`, `sapio.vn/login` |
| Khu nội bộ của một cơ sở | `sapio.vn/app/toc-may/calendar` (như T-15) |
| Quản trị nền tảng | ~~`sapio.vn/admin`~~ → `admin.sapio.vn` (đổi ở [T-18](./t18-admin-subdomain.md)) |
| API | `api.sapio.vn/v1/...` |
| **Trang khách của một cơ sở** | **`toc-may.sapio.vn/`, `toc-may.sapio.vn/book`, `toc-may.sapio.vn/me`** |

- **Một ứng dụng Next.js phục vụ tất cả.** `proxy.ts` đọc tên miền của request:
  - Là tên miền con chứa slug hợp lệ: rewrite vào route group trang khách `/(site)/[tenant]/...`. Người dùng không thấy đường dẫn nội bộ này.
  - Slug không tồn tại: trang "Không tìm thấy cơ sở".
  - Cơ sở bị khóa: trang báo cơ sở tạm ngưng (MH-10).
- **Cookie tách theo tên miền:**
  - Trang khách gọi API qua đường cùng origin `/api/*`, Next rewrite sang `api.<domain>`.
  - Cookie phiên khách đặt tên `__Host-...`, `Secure`, `HttpOnly`, `Path=/`, `SameSite=Lax` và **không có `Domain`**. Vì vậy mỗi cơ sở có phiên khách riêng, đúng BR-17 ("phiên gắn với cơ sở").
  - Cookie phiên nhân sự chỉ thuộc tên miền gốc, nên trang khách của bất kỳ cơ sở nào cũng không nhận được.
  - Request đổi dữ liệu kiểm header `Origin` (T-08).
- **Public Suffix List:** chưa cần. Cơ sở chỉ nhập chữ, ảnh và màu; không tự đăng HTML hay chạy mã trên tên miền con. Sau này nếu cho cơ sở tự sửa HTML, phải đăng tên miền lên Public Suffix List trước.
- **Dev:** dùng `toc-may.localhost:3000`. Chrome, Edge và Firefox tự trỏ `*.localhost` về máy, không cần sửa file hosts.
- **Triển khai:**
  - Cần một tên miền thật, thêm `*.<domain>` vào Vercel.
  - Vercel cấp **một** chứng chỉ wildcard cho mọi cơ sở. Để làm được việc này, tên miền phải dùng nameserver của Vercel, hoặc ủy quyền bản ghi `_acme-challenge` cho Vercel.
  - Chưa có tên miền thì đặt biến môi trường `TENANT_ROUTING=path`: trang khách chạy ở `/<slug>/...` như T-15, phần còn lại giữ nguyên.
- **Slug là một nhãn DNS:** BR-72 thêm luật không bắt đầu hoặc kết thúc bằng gạch ngang, và thêm các tên dành riêng cho tên miền con (`www`, `api`, `app`, `admin`, `mail`, `status`, `blog`, `cdn`).
- **Tên miền riêng của tiệm** (`datlich.tocmay.vn`) để sau, ghi vào chương Hướng phát triển. Cách làm khi đó:
  - Thêm bảng `tenant_domains`.
  - Thêm bước xác minh bằng bản ghi TXT.
  - Gắn tên miền vào dự án Vercel bằng Vercel SDK để tự cấp HTTPS.
  - `proxy.ts` tra bảng này trước khi rewrite.
  - Thêm thẻ canonical để trang không bị trùng nội dung giữa hai địa chỉ.
- **Vì sao chọn tên miền con thay cho `sapio.vn/toc-may`:** link mang tên tiệm ở đầu, trông "của tiệm" hơn khi in lên mã QR hoặc dán lên Facebook. Cookie của khách tách hẳn theo cơ sở. Cách này cũng là bước đệm cho tên miền riêng sau này. Đổi lại phải có tên miền thật khi triển khai, và proxy phức tạp hơn.
- Tham khảo: [Vercel, Configuring Custom Domains](https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains).
