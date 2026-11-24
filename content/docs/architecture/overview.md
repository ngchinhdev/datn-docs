---
title: Tổng quan kiến trúc
description: Các phần của hệ thống và vai trò của từng phần.
---

```
datn/                      ← thư mục cha trên máy (không phải repo)
├── CLAUDE.md              ← import datn-docs/CLAUDE.md
├── datn-docs/             ← repo tài liệu + mock (Next.js + Fumadocs)
└── datn-saas/             ← repo code (monorepo)
    ├── apps/web           ← Next.js 16: trang đặt lịch công khai + trang quản lý
    ├── apps/api           ← NestJS 12: toàn bộ nghiệp vụ, REST + WebSocket
    ├── packages/shared    ← Zod schema, enum, kiểu dữ liệu dùng chung FE/BE
    └── packages/scheduling-core ← thuật toán tính giờ trống, thuần TypeScript
```
