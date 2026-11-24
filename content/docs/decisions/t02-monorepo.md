---
title: "T-02. Monorepo: pnpm workspaces + catalog, Turborepo"
---

- `pnpm-workspace.yaml` khai báo `apps/*`, `packages/*`; dùng **catalog** để mọi package dùng chung một phiên bản TypeScript, Zod, Vitest.
- Gói nội bộ tham chiếu bằng `workspace:*`; gói `shared` và `scheduling-core` là gói **just-in-time**: `exports` trỏ thẳng vào `src/index.ts`, không có bước build riêng.
- Turborepo 2.x: task `build` có `dependsOn: ["^build"]` và `outputs`; `dev` để `cache: false`, `persistent: true`; CI chạy `turbo run lint typecheck test --filter=...[origin/main]` khi repo lớn.
- Giữ ít package (bắt đầu 4). Chỉ tách thêm khi thật cần.
- **pnpm 11**, ghim `11.28.11` trong `packageManager` (Corepack tự tải đúng bản). Nâng pnpm thì sửa `packageManager` và lockfile trong cùng một commit.
  - **Đổi từ pnpm 9.15 (05/11/2026)** để chống tấn công chuỗi cung ứng (đợt Shai-Hulud tháng 8/2026 cài mã độc vào hook Claude Code và `tasks.json` của VS Code). Trong `pnpm-workspace.yaml`: `minimumReleaseAge: 1440` (chỉ cài bản đã phát hành ít nhất 1 ngày) và `allowBuilds` (không gói nào được chạy script cài đặt; `strictDepBuilds` mặc định bật nên gói nào bất ngờ thêm `postinstall` sẽ làm `pnpm install` báo lỗi).
  - Thêm gói mới mà `pnpm install` báo `ERR_PNPM_IGNORED_BUILDS`: đọc script của gói, chỉ ghi `true` trong `allowBuilds` khi thật cần (thường là gói native), còn lại ghi `false`.
  - Chưa dùng pnpm 12 (viết lại bằng Rust, ổn định từ 08/2026): cài đặt và lockfile giống pnpm 11, nên nâng sau chỉ cần đổi `packageManager`.
- Import tương đối trong gói just-in-time ghi đuôi `.ts` (`allowImportingTsExtensions`), vì API chạy thẳng mã nguồn các gói này bằng Node (type stripping) và Node không tự đổi `.js` thành `.ts`. Vì type stripping chỉ xóa được cú pháp kiểu thuần, hai gói này bật `erasableSyntaxOnly`: không dùng `enum`, `namespace`, parameter property (dùng `z.enum` hoặc object `as const` thay cho `enum`).
