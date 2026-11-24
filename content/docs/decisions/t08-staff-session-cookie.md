---
title: "T-08. Xác thực: tự xây bằng phiên trong cookie"
---

- **Nhân viên:** email + mật khẩu (băm bằng argon2id, gói `@node-rs/argon2` có sẵn bản build cho Windows). Đăng nhập tạo **session token ngẫu nhiên**, lưu bản băm trong bảng `sessions`, gửi về bằng cookie `httpOnly`, `Secure`, `SameSite=Lax`. Thu hồi phiên được ngay (đăng xuất, đổi mật khẩu).
- **Mật khẩu** theo BR-73 (NIST SP 800-63B-4): kiểm độ dài, so với danh sách khoảng 100.000 mật khẩu phổ biến đóng gói kèm API (không gọi dịch vụ ngoài), không có luật ép loại ký tự.
- **Khách hàng:** OTP qua email theo từng khách thuê → phiên khách gắn với `tenant` đó.
- ~~Triển khai web và api **cùng site** (ví dụ `app.<domain>` và `api.<domain>`) để cookie hoạt động; môi trường dev dùng `localhost` khác cổng. CORS chỉ cho phép origin của web, có `credentials`.~~ Thay bởi [T-20](./t20-same-origin-api.md).
- Giới hạn tần suất (`@nestjs/throttler`) cho đăng nhập và gửi OTP.
- **Vì sao không dùng Better Auth:** tích hợp NestJS là gói cộng đồng (`@thallesp/nestjs-better-auth`), chưa rõ hỗ trợ Nest 12; mô hình membership theo tenant và OTP khách vẫn phải tự làm. **Vì sao không dùng JWT:** khó thu hồi, không cần cho kiến trúc một backend.
