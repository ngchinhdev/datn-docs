---
title: Tiến độ
description: Nhật ký tiến độ theo tuần. Mỗi phiên làm việc kết thúc bằng một dòng ở đây.
---

**Quy ước:** mới nhất ở trên. Mỗi mục ghi: đã làm gì, vướng gì, việc tiếp theo. Cuối đồ án, trang này dùng làm phụ lục báo cáo.

## Tuần 1 (02/11 – 08/11/2026)

### 05/11/2026 (tối): app docs + mock `datn-docs`
- **Đã làm:** Phần B, bước B1 và B2 của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md). B1: Next.js 16.4.5 + Fumadocs 16.17 (cài thủ công, API `fumadocs-mdx/macro`), tài liệu ở `/docs`, tìm kiếm tiếng Việt chạy được, đọc thẳng file `.md`; pnpm 11.28.11 với `minimumReleaseAge` và `allowBuilds` giống `datn-saas` (`esbuild: false`). Link tải đề cương `.docx` ở trang Đề cương. B2: shadcn `base-nova` cùng `components.json` với `apps/web`, Fumadocs dùng preset `shadcn.css` nên tài liệu và mock chung một theme; `/mock` có bộ chọn tenant và vai trò trên query string (`/mock?tenant=pawpaw&role=receptionist`), danh sách 4 màn hình của roadmap, fixtures cho Salon Tóc Mây và Spa thú cưng Pawpaw.
- **Phát hiện:** Fumadocs chỉ đổi link sang URL khi link trỏ tới file có đuôi `.md`; link không đuôi làm gãy các link ở trang `/docs`. Đã đổi mọi link tương đối sang dạng `./trang.md` và ghi quy ước vào `CLAUDE.md`. Mục lục roadmap có một anchor sai (`#7-quy-tắc-nghiệp-vụ-ban-đầu`), đã sửa. `minimumReleaseAge` chặn bản Fumadocs vừa ra trong ngày, pnpm tự chọn bản trước đó.
- **Ghi chú cho sau:** fixtures dùng ID dễ đọc (`may-mai`) thay cho UUIDv7 để dễ đối chiếu. Trạng thái lịch hẹn trong fixtures (`confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`) là giả định, cần chốt khi thiết kế ERD. `assets/de-cuong-chi-tiet.docx` và `public/files/` là hai bản, sửa đề cương thì cập nhật cả hai.
- **Tiếp theo:** B3 (kết nối Vercel, kiểm `/docs` và `/mock` trên link deploy); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 05/11/2026: review base `datn-saas`
- **Đã làm:** review toàn bộ base. CI trên GitHub của `main` xanh (03/11), nên A7 xong. Mở [PR #1](https://github.com/ngchinhdev/datn-saas/pull/1), CI xanh đủ các bước: bật `erasableSyntaxOnly` cho `shared` và `scheduling-core`; thêm `createPool()` có `pool.on('error')` để API không chết khi Postgres khởi động lại (có unit test); `CLAUDE.md` nhắc đọc `apps/web/AGENTS.md` và commit nhỏ.
- **Ghi chú cho sau:** (1) khi thiết kế thuật toán giờ trống (BT1), chốt lõi tính trên mốc thời gian tuyệt đối, chỉ đổi sang giờ địa phương ở rìa (hiện `Interval` là phút từ đầu ngày địa phương); (2) khi làm xác thực, kiểm tra chống CSRF của Nest với request POST từ server Next (không có header `Origin`); (3) oxlint còn nhiều cảnh báo nhiễu `react-in-jsx-scope`, có thể tắt rule này.
- **Bổ sung:** PR #1 gộp còn một commit, thêm sửa lint (tắt `react-in-jsx-scope`, cho phép import CSS). CI xanh, 0 cảnh báo.
- **Kiểm tra bảo mật dependency (828 gói trong lockfile):** không gói nào nằm trong danh sách bị chiếm quyền của các đợt Shai-Hulud (gồm đợt `keyv`/`cacheable` tháng 8/2026, 446 gói) hay đợt `chalk`/`debug` 9/2025. `pnpm audit`: 0 high/critical; 3 moderate + 1 low (`glob`, `minimatch`, `deepmerge`), đều nằm trong công cụ dev (Testcontainers, Nest CLI, shadcn CLI), không chạy ở production, chờ bản vá upstream. Gói có script cài đặt: `@scarf/scarf` (thống kê lượt cài của swagger-ui), `ssh2`, `cpu-features`, `protobufjs` (đều qua Testcontainers); đều là gói thật.
- **pnpm 11:** [PR #2](https://github.com/ngchinhdev/datn-saas/pull/2) nâng pnpm 9.15 lên 11.28.11, đặt `minimumReleaseAge` và `allowBuilds` ([T-02](../ky-thuat/quyet-dinh-ky-thuat.md#t-02-monorepo-pnpm-workspaces--catalog-turborepo)). CI xanh, lockfile cũ dùng được nguyên, qua kiểm tra chuỗi cung ứng của pnpm.
- **Tiếp theo:** merge PR #1 và PR #2; trên máy chạy `pnpm install` (Corepack tự tải pnpm 11); xóa nhánh `claude/audit-tmp` trên GitHub; Phần B (app docs + mock); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 03/11/2026 (tối): dựng base `datn-saas`
- **Đã làm:** Phần A của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md), bước A1 đến A6 và A8: monorepo pnpm + Turborepo; Docker Compose (Postgres 18, Redis 8, Mailpit); `shared` (BR-61 `normalizePhone`); `scheduling-core` (phép toán khoảng, property test, coverage 100%); API NestJS 12 (config Zod, Drizzle 1.0.0-rc.5, `withTenant`, migration `btree_gist` và grant, Problem Details, Swagger, `/v1/health`); web Next.js 16.4 (shadcn, TanStack Query, trang `/` hiển thị health); script chặn từ khóa ngành; workflow CI. Mọi bước CI chạy xanh trên máy.
- **Phát hiện:** spike RLS cho thấy policy phải dùng `nullif(current_setting(...), '')` ([T-07](../ky-thuat/quyet-dinh-ky-thuat.md#t-07-cô-lập-dữ-liệu-rls-hai-lớp)); 20 transaction đồng thời chỉ 1 giữ được chỗ (bằng chứng sớm cho BT2). Chốt Node 24 thay cho 26 ([T-01](../ky-thuat/quyet-dinh-ky-thuat.md#t-01-runtime-nodejs-24-lts)), TypeScript 6.0, pnpm 9.15.
- **Vướng:** máy dev có sẵn PostgreSQL Windows chiếm cổng 5432; compose cho đổi cổng bằng `POSTGRES_PORT`.
- **Tiếp theo:** đẩy `datn-saas` lên GitHub và kiểm tra CI xanh (A7); Phần B (app docs + mock).

### 03/11/2026
- **Đã làm:** gửi đề cương cho cô Thùy Trâm. Tạo 2 repo `ngchinhdev/datn-docs` và `ngchinhdev/datn-saas`. Đưa đề cương, roadmap, nhật ký quyết định, quy tắc nghiệp vụ, thuật ngữ vào `datn-docs`. Nghiên cứu phiên bản và pattern hiện hành của Next.js, NestJS, Drizzle, Node.js; viết [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md), [Chiến lược kiểm thử](../ky-thuat/chien-luoc-kiem-thu.md), [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md).
- **Phát hiện:** payOS không có môi trường test → đổi sang provider giả lập ([D-09](./quyet-dinh.md#d-09-thanh-toán-payos-không-có-môi-trường-test)).
- **Tiếp theo:** dựng base source trên máy bằng Claude Code theo kế hoạch; song song dùng thử SimplyBook.me và một phần mềm Việt Nam (giai đoạn 0).

## Trước khi bắt đầu (26/10 – 02/11/2026)

- Khảo sát nhiều hướng đề tài (giáo dục, thuế, nhà trọ, HSK, hệ thống thi...), chốt đề tài đặt lịch đa tài nguyên ([D-01](./quyet-dinh.md#d-01-đề-tài-nền-tảng-đặt-lịch-đa-tài-nguyên-cho-cơ-sở-dịch-vụ-theo-lịch-hẹn)).
- Cắt phạm vi, viết roadmap 34 tuần, đề cương theo mẫu UIT.
