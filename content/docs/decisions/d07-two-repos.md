---
title: D-07. Tổ chức repo: 2 repo
---

- `datn-saas`: monorepo code (apps/web Next.js, apps/api NestJS, packages dùng chung).
- `datn-docs`: repo riêng chứa tài liệu và mock, chạy độc lập (`pnpm dev`), deploy để gửi link cho giảng viên.
- Không tách FE, BE thành 2 repo: một người làm, dùng chung schema và kiểu dữ liệu; một tính năng là một commit; vẫn deploy FE, BE độc lập được.
