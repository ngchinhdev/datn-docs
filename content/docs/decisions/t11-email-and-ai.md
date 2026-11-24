---
title: T-11. Email và AI
---

- Email: Nodemailer; dev và test dùng **Mailpit** (xem email trong trình duyệt, có API để test đọc OTP).
- AI: Claude API với tool use, bọc sau interface `LlmClient` để test được bằng client giả. Tool chỉ gọi application service, không truy cập DB trực tiếp.
