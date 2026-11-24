---
title: T-20. Trình duyệt gọi API cùng origin qua /api
---

- **Ngày:** 24/11/2026. Thay cho dòng "web và api cùng site, CORS có `credentials`" của [T-08](./t08-staff-session-cookie.md).
- **Quyết định:** trình duyệt chỉ gọi `/api/*` trên chính tên miền của trang: `sapio.vn`, `admin.sapio.vn` và `<slug>.sapio.vn`. Next.js rewrite sang `api.<domain>`, còn dev là `localhost:4000`. Trang khách đã làm như vậy từ [T-16](./t16-tenant-subdomains.md), nay áp cho mọi khu.
- **Hệ quả:**
  - Cookie phiên có tiền tố `__Host-` và không có `Domain`, nên chỉ thuộc đúng tên miền của trang. `proxy.ts` và Server Component đọc được cookie để kiểm phiên khi render.
  - Không cần CORS. API vẫn kiểm header `Origin` theo danh sách tin cậy cho request đổi dữ liệu.
  - Server Component gọi thẳng API qua mạng nội bộ, chuyển tiếp cookie của request.
- **Vì sao không để trình duyệt gọi thẳng `api.sapio.vn`:** cookie đặt bởi `api.sapio.vn` thì `sapio.vn` không đọc được. Như vậy `proxy.ts` không kiểm được phiên, và phải mở CORS có `credentials`.
