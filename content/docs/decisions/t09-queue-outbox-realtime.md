---
title: T-09. Hàng đợi, outbox, realtime
---

- **BullMQ** qua `@nestjs/bullmq` + Redis: job dọn giữ chỗ hết hạn, nhắc lịch (delayed job), xử lý outbox, gửi email.
- **Outbox:** sự kiện ghi trong cùng transaction với thay đổi nghiệp vụ; worker lấy bằng `SELECT ... FOR UPDATE SKIP LOCKED`, xử lý idempotent, đánh dấu đã xong.
- **Socket.IO** qua `@nestjs/websockets`: phòng theo `tenant:branch`; server chỉ gửi "có thay đổi lịch" để client tải lại, không gửi dữ liệu nhạy cảm qua socket. Xác thực socket bằng cùng cookie phiên.
