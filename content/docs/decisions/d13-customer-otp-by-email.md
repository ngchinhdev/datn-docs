---
title: D-13. OTP của khách gửi qua email, không qua SMS
---

Chốt ngày 07/11/2026, khi review giao diện mock thấy màn hình ghi "Mã xác nhận gửi qua tin nhắn" trong khi roadmap ghi OTP qua email.

- **Chọn:** khách nhập họ tên, số điện thoại và email; mã 6 số gửi tới email (BR-16). Số điện thoại là thông tin liên hệ để cơ sở gọi khách, không phải yếu tố xác thực.
- **Vì sao không SMS:** SMS ở Việt Nam phải đăng ký brandname và trả phí từng tin; khó demo thật khi bảo vệ. Email dùng Mailpit khi dev và test được tự động (đọc mã qua API của Mailpit).
- **Để ngỏ:** code gửi mã nằm sau một interface kênh gửi (`OtpChannel`, bản đầu chỉ có email), nên sau này thêm SMS hoặc Zalo ZNS không phải sửa luồng đặt lịch.
- **Hệ quả:** đối tượng được phục vụ đã lưu chỉ hiện khi khách đã có phiên (BR-17); khách mới khai đối tượng ngay trong luồng.
