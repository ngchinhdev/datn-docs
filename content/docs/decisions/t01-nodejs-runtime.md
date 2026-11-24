---
title: T-01. Runtime: Node.js 24 LTS
---

- Node 24 là Maintenance LTS, còn bản vá bảo mật đến 30/04/2028, sau ngày bảo vệ. **Node 22 hết bảo mật 30/04/2027, trước ngày bảo vệ** → không dùng.
- Ghi `.nvmrc` = `24` và `"engines": { "node": ">=24" }`; CI chạy Node 24.
- NestJS 12 yêu cầu Node ≥ 20.19 hoặc ≥ 22.12, nên 24 hợp lệ.
- **Đổi từ Node 26 sang 24 (03/11/2026):** máy dev đang có sẵn Node 24, người dùng chốt giữ nguyên để khỏi cài lại runtime. Code không dùng tính năng riêng của Node 26.
