---
title: T-10. Thanh toán
---

- Interface `PaymentProvider { createPayment, verifyWebhook, refund }`.
- Bản chính: `MockPaymentProvider` sinh QR VietQR để hiển thị, webhook giả lập ký HMAC-SHA256, nút "giả lập chuyển khoản" chỉ có ở dev và demo. Lý do: payOS không có sandbox ([D-09](./d09-mock-payment-provider.md)).
- Provider thật là tùy chọn sau M5.
