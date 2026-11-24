---
title: T-18. Quản trị nền tảng trên tên miền con riêng
---

Chốt ngày 22/11/2026, thay dòng "Quản trị nền tảng" trong bảng của [T-16](./t16-tenant-subdomains.md).

- **Địa chỉ:** `admin.sapio.vn` (dev: `admin.localhost:3000`). Vẫn là **một ứng dụng Next.js**: `proxy.ts` thấy tên miền `admin.` thì rewrite vào route group `/(platform)/admin/...`; mọi đường dẫn `/admin` trên `sapio.vn` trả 404. `admin` đã nằm trong danh sách slug dành riêng của BR-72.
- **Đăng nhập riêng:** trang `admin.sapio.vn/login`. Không có "Đăng ký cơ sở", không có "Giữ đăng nhập", không có tự đặt lại mật khẩu: super admin quên mật khẩu thì đặt lại bằng lệnh CLI trên server. Khóa tạm khi sai nhiều lần theo đúng BR-76.
- **Tài khoản không đi lẫn:** tài khoản có cờ `platform_admin` chỉ đăng nhập được ở `admin.sapio.vn/login`; tài khoản nhân sự chỉ đăng nhập được ở `sapio.vn/login`. Đăng nhập sai cửa báo đúng câu chung của BR-76, không nói tài khoản có tồn tại.
- **Cookie riêng:** phiên super admin là cookie `__Host-sapio_admin`, `Secure`, `HttpOnly`, `SameSite=Strict`, không có `Domain`, nên chỉ thuộc `admin.sapio.vn`. Phiên nhân sự trên `sapio.vn` và phiên khách trên `<slug>.sapio.vn` không gửi được sang đây, và ngược lại. Phiên hết khi đóng trình duyệt hoặc sau **2 giờ** không thao tác.
- **API:** route `/v1/platform/*` chỉ nhận phiên super admin; request đổi dữ liệu kiểm header `Origin` là `https://admin.sapio.vn` (T-08).
- **Mock (`datn-docs`):** vẫn chạy theo đường dẫn: `/mock/admin/login` là trang đăng nhập riêng, phiên super admin lưu tách khỏi phiên nhân sự.
- **Vì sao:** quyền của super admin trải trên mọi cơ sở. Tách tên miền và cookie thì một lỗi XSS ở trang của cơ sở hay một phiên nhân sự bị lộ không với tới quyền này, và siết riêng được thời gian phiên mà không ảnh hưởng chủ tiệm. Không tách thành ứng dụng riêng vì phải thêm một bản build, deploy và CORS mà gần như không an toàn hơn.
