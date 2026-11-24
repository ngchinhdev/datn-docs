---
title: D-09. Thanh toán: payOS không có môi trường test
---

- **Ngày:** 03/11/2026. Thay đổi so với roadmap ban đầu ("PayOS chế độ thử").
- payOS ghi rõ không cung cấp môi trường sandbox/staging riêng; muốn thử phải thanh toán thật số tiền nhỏ, đăng ký tài khoản cá nhân có xác minh CCCD.
- **Quyết định:** thiết kế cổng thanh toán qua một interface `PaymentProvider`. Bản chính dùng `MockPaymentProvider`: sinh mã QR VietQR tĩnh để hiển thị, webhook giả lập **có chữ ký HMAC** và nút "giả lập chuyển khoản" trong môi trường dev và demo. Tích hợp provider thật (payOS bằng giao dịch nhỏ, hoặc API test callback của VietQR) là tùy chọn khi còn thời gian.
- Tính idempotent và đối soát vẫn chứng minh được đầy đủ bằng provider giả lập (E3).
