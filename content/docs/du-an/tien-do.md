---
title: Tiến độ
description: Nhật ký tiến độ theo tuần. Mỗi phiên làm việc kết thúc bằng một dòng ở đây.
---

**Quy ước:** mới nhất ở trên. Mỗi mục ghi: đã làm gì, vướng gì, việc tiếp theo. Cuối đồ án, trang này dùng làm phụ lục báo cáo.

## Tuần 1 (02/11 – 08/11/2026)

### 05/11/2026: review base `datn-saas`
- **Đã làm:** review toàn bộ base. CI trên GitHub của `main` xanh (03/11), nên A7 xong. Mở [PR #1](https://github.com/ngchinhdev/datn-saas/pull/1), CI xanh đủ các bước: bật `erasableSyntaxOnly` cho `shared` và `scheduling-core`; thêm `createPool()` có `pool.on('error')` để API không chết khi Postgres khởi động lại (có unit test); `CLAUDE.md` nhắc đọc `apps/web/AGENTS.md` và commit nhỏ.
- **Ghi chú cho sau:** (1) khi thiết kế thuật toán giờ trống (BT1), chốt lõi tính trên mốc thời gian tuyệt đối, chỉ đổi sang giờ địa phương ở rìa (hiện `Interval` là phút từ đầu ngày địa phương); (2) khi làm xác thực, kiểm tra chống CSRF của Nest với request POST từ server Next (không có header `Origin`); (3) oxlint còn nhiều cảnh báo nhiễu `react-in-jsx-scope`, có thể tắt rule này.
- **Bổ sung:** PR #1 gộp còn một commit, thêm sửa lint (tắt `react-in-jsx-scope`, cho phép import CSS). CI xanh, 0 cảnh báo.
- **Kiểm tra bảo mật dependency (828 gói trong lockfile):** không gói nào nằm trong danh sách bị chiếm quyền của các đợt Shai-Hulud (gồm đợt `keyv`/`cacheable` tháng 8/2026, 446 gói) hay đợt `chalk`/`debug` 9/2025. `pnpm audit`: 0 high/critical; 3 moderate + 1 low (`glob`, `minimatch`, `deepmerge`), đều nằm trong công cụ dev (Testcontainers, Nest CLI, shadcn CLI), không chạy ở production, chờ bản vá upstream. Gói có script cài đặt: `@scarf/scarf` (thống kê lượt cài của swagger-ui), `ssh2`, `cpu-features`, `protobufjs` (đều qua Testcontainers); đều là gói thật.
- **Đề xuất (chưa làm, cần người dùng chốt):** nâng pnpm 9.15 lên pnpm 10 để chặn script cài đặt mặc định (chỉ cho phép gói trong `onlyBuiltDependencies`) và đặt `minimumReleaseAge` để không cài bản vừa phát hành vài giờ, cách chặn chính các đợt kiểu Shai-Hulud.
- **Tiếp theo:** merge PR #1; xóa nhánh `claude/audit-tmp` trên GitHub; Phần B (app docs + mock); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 03/11/2026 (tối): dựng base `datn-saas`
- **Đã làm:** Phần A của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base), bước A1 đến A6 và A8: monorepo pnpm + Turborepo; Docker Compose (Postgres 18, Redis 8, Mailpit); `shared` (BR-61 `normalizePhone`); `scheduling-core` (phép toán khoảng, property test, coverage 100%); API NestJS 12 (config Zod, Drizzle 1.0.0-rc.5, `withTenant`, migration `btree_gist` và grant, Problem Details, Swagger, `/v1/health`); web Next.js 16.4 (shadcn, TanStack Query, trang `/` hiển thị health); script chặn từ khóa ngành; workflow CI. Mọi bước CI chạy xanh trên máy.
- **Phát hiện:** spike RLS cho thấy policy phải dùng `nullif(current_setting(...), '')` ([T-07](../ky-thuat/quyet-dinh-ky-thuat#t-07-cô-lập-dữ-liệu-rls-hai-lớp)); 20 transaction đồng thời chỉ 1 giữ được chỗ (bằng chứng sớm cho BT2). Chốt Node 24 thay cho 26 ([T-01](../ky-thuat/quyet-dinh-ky-thuat#t-01-runtime-nodejs-24-lts)), TypeScript 6.0, pnpm 9.15.
- **Vướng:** máy dev có sẵn PostgreSQL Windows chiếm cổng 5432; compose cho đổi cổng bằng `POSTGRES_PORT`.
- **Tiếp theo:** đẩy `datn-saas` lên GitHub và kiểm tra CI xanh (A7); Phần B (app docs + mock).

### 03/11/2026
- **Đã làm:** gửi đề cương cho cô Thùy Trâm. Tạo 2 repo `ngchinhdev/datn-docs` và `ngchinhdev/datn-saas`. Đưa đề cương, roadmap, nhật ký quyết định, quy tắc nghiệp vụ, thuật ngữ vào `datn-docs`. Nghiên cứu phiên bản và pattern hiện hành của Next.js, NestJS, Drizzle, Node.js; viết [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat), [Chiến lược kiểm thử](../ky-thuat/chien-luoc-kiem-thu), [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base).
- **Phát hiện:** payOS không có môi trường test → đổi sang provider giả lập ([D-09](./quyet-dinh#d-09-thanh-toán-payos-không-có-môi-trường-test)).
- **Tiếp theo:** dựng base source trên máy bằng Claude Code theo kế hoạch; song song dùng thử SimplyBook.me và một phần mềm Việt Nam (giai đoạn 0).

## Trước khi bắt đầu (26/10 – 02/11/2026)

- Khảo sát nhiều hướng đề tài (giáo dục, thuế, nhà trọ, HSK, hệ thống thi...), chốt đề tài đặt lịch đa tài nguyên ([D-01](./quyet-dinh#d-01-đề-tài-nền-tảng-đặt-lịch-đa-tài-nguyên-cho-cơ-sở-dịch-vụ-theo-lịch-hẹn)).
- Cắt phạm vi, viết roadmap 34 tuần, đề cương theo mẫu UIT.
