---
title: Kế hoạch dựng base source
description: Các bước dựng datn-saas (monorepo code) và app docs + mock của datn-docs, kèm điều kiện "xong khi" cho từng bước. Viết để Claude Code trên máy làm theo.
---

> **Dành cho Claude Code:** làm lần lượt từng bước. Sau mỗi bước, chạy kiểm tra ở mục **Xong khi**; chỉ sang bước sau khi đạt. Phiên bản lấy theo [Quyết định kỹ thuật](./quyet-dinh-ky-thuat), nhưng **kiểm tra bản mới nhất** bằng `pnpm view <gói> version` và ghim chính xác. Nếu một quyết định kỹ thuật không làm được (gói lỗi, xung đột), **dừng lại, báo người dùng**, đề xuất phương án và ghi vào trang quyết định sau khi chốt. Commit sau mỗi bước theo Conventional Commits.
>
> **Không làm trong base:** bảng nghiệp vụ thật (thiết kế ở giai đoạn 1, ERD), xác thực, thanh toán. Base chỉ gồm khung, hạ tầng, một "bộ xương chạy được" và test mẫu cho mỗi tầng.

## Phần 0. Chuẩn bị máy

| Việc | Lệnh kiểm tra | Xong khi |
|---|---|---|
| Node.js 26 LTS | `node -v` | `v26.x` |
| pnpm (qua Corepack) | `corepack enable && pnpm -v` | Có số phiên bản |
| Docker Desktop đang chạy | `docker info` | Không lỗi |
| Git, đã đăng nhập GitHub | `git --version`, `git ls-remote https://github.com/ngchinhdev/datn-saas` | Không lỗi |
| Thư mục cha | `datn/` chứa `datn-docs/`, `datn-saas/`, và `datn/CLAUDE.md` có dòng `@datn-docs/CLAUDE.md` | Claude Code mở tại `datn/` thấy được bối cảnh |

## Phần A. Repo `datn-saas`

### A1. Khung monorepo

- `package.json` gốc: `private: true`, `packageManager: "pnpm@<bản hiện tại>"`, `engines.node: ">=26"`, script: `dev`, `build`, `lint`, `format`, `typecheck`, `test`, `test:integration`, `test:e2e` (gọi qua `turbo run`).
- `pnpm-workspace.yaml`: `packages: [apps/*, packages/*]` và `catalog:` cho `typescript`, `zod`, `vitest`, `@types/node`.
- `turbo.json`: task `build` (`dependsOn: ["^build"]`, `outputs`), `dev` (`cache: false`, `persistent: true`), `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`.
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module`/`moduleResolution` phù hợp ESM (`NodeNext` cho api, `Bundler` cho web và package nội bộ).
- `.nvmrc` (`26`), `.editorconfig`, `.gitignore`, `.prettierrc`, `.oxlintrc.json` (plugin typescript, react, nextjs, import, vitest), `.env.example`.

**Xong khi:** `pnpm install` không lỗi; `pnpm lint` chạy được (chưa có code thì không có lỗi).

### A2. Hạ tầng dev bằng Docker Compose

- `docker-compose.yml`: `postgres:18` (cổng 5432), `redis` bản ổn định mới nhất (6379), `axllent/mailpit` (SMTP 1025, giao diện 8025). Có healthcheck và volume.
- `docker/postgres/init.sql`: tạo role `app_user` (LOGIN, **không** SUPERUSER, **không** BYPASSRLS) và cấp quyền kết nối. Chủ sở hữu bảng là role `datn_owner` (dùng cho migration).
- `.env.example`: `DATABASE_URL` (app_user), `DATABASE_OWNER_URL` (datn_owner), `REDIS_URL`, `SMTP_*`, `WEB_ORIGIN`, `API_URL`.

**Xong khi:** `docker compose up -d` lên đủ 3 dịch vụ healthy; `psql` vào được bằng cả hai role; mở `http://localhost:8025` thấy Mailpit.

### A3. `packages/shared`

- Gói just-in-time (`exports` trỏ `src/index.ts`), phụ thuộc `zod` từ catalog.
- Nội dung ban đầu: `healthResponseSchema`; hàm `normalizePhone` (chuẩn hóa `0912...`, `+84912...`, `84912...` về một dạng E.164) — đây là **BR-61**, dùng làm mẫu quy ước test.
- `vitest` cho package: `normalizePhone.spec.ts` với các ca `it('BR-61: ...')`.

**Xong khi:** `pnpm --filter @datn/shared test` xanh.

### A4. `packages/scheduling-core`

- Gói just-in-time, **không phụ thuộc gì ngoài TypeScript**.
- Nội dung ban đầu: kiểu `Interval = { start: number; end: number }` (phút, nửa mở `[start, end)`), các hàm `normalize`, `union`, `intersect`, `subtract` cho danh sách khoảng. Đây là nền móng của thuật toán giờ trống (BT1).
- Test: unit test các ca biên; **property test bằng fast-check** (ví dụ: `subtract(A, B)` không giao với `B` và nằm trong `A`; `intersect` giao hoán).

**Xong khi:** test xanh; coverage của package ≥ 90%.

### A5. `apps/api` (NestJS 12)

1. Tạo bằng CLI: `pnpm dlx @nestjs/cli@latest new api --directory apps/api --package-manager pnpm --skip-git`, **chọn ESM**. Giữ cấu hình Vitest mà CLI sinh ra (đã xử lý decorator); bỏ cấu hình lint riêng nếu trùng với oxlint gốc.
2. Đổi tên package thành `@datn/api`, thêm phụ thuộc `@datn/shared`, `@datn/scheduling-core` (`workspace:*`).
3. **Config:** `@nestjs/config` validate biến môi trường bằng schema Zod; thiếu biến thì không khởi động.
4. **DB:** module `database` tạo pool `pg` + Drizzle (v1 RC, ghim bản); helper `withTenant(tenantId, fn)` mở transaction và gọi `select set_config('app.tenant_id', $1, true)`. `drizzle.config.ts` dùng `DATABASE_OWNER_URL`.
5. **Migration đầu tiên** (SQL tùy chỉnh): `CREATE EXTENSION IF NOT EXISTS btree_gist;` và grant mặc định cho `app_user`. **Chưa tạo bảng nghiệp vụ.**
6. **Khung HTTP:** tiền tố `/v1`; `StandardSchemaValidationPipe` toàn cục; exception filter trả Problem Details (RFC 9457); CORS chỉ cho `WEB_ORIGIN` có credentials; security header và cookie theo tính năng có sẵn của Nest 12.1; OpenAPI + Swagger UI tại `/docs`.
7. **Health:** `GET /v1/health` trả `{ status, db, redis }`, kiểm tra kết nối thật; response khớp `healthResponseSchema` của `shared`.
8. **Test mẫu cho từng tầng:**
   - Unit: một test cho exception filter hoặc config.
   - **Integration "spike" (Testcontainers, Postgres 18):** chạy migration, tạo bảng tạm trong test có `tenant_id`, `resource_id`, `tstzrange` với exclusion constraint và RLS; chứng minh (a) chèn hai khoảng chồng nhau cùng tài nguyên bị từ chối, (b) 20 transaction đồng thời chèn cùng khoảng chỉ 1 thành công, (c) kết nối bằng `app_user` với `app.tenant_id` = A không đọc được dòng của B. Đây là bằng chứng sớm cho BT2 và BT6, giúp giảm rủi ro trước khi thiết kế bảng thật.
   - API e2e (Supertest + Testcontainers): `GET /v1/health` trả 200 và đúng schema.

**Xong khi:** `pnpm --filter @datn/api test`, `test:integration`, `test:e2e` đều xanh; `pnpm --filter @datn/api dev` chạy ở cổng 4000, mở `http://localhost:4000/docs` thấy Swagger.

### A6. `apps/web` (Next.js 16)

1. Tạo bằng `pnpm create next-app@latest apps/web`: TypeScript, Tailwind CSS, App Router, thư mục `src/`, Turbopack, alias `@/*`, **không chọn linter** (đã có oxlint ở gốc). Giữ Cache Components mặc định.
2. Đổi tên package thành `@datn/web`, thêm `@datn/shared`.
3. `pnpm dlx shadcn@latest init`; thêm vài component cơ bản (button, card).
4. Provider TanStack Query ở client; helper `apiFetch` phía server chuyển tiếp cookie tới API; `NEXT_PUBLIC_API_URL`/`API_URL` validate bằng Zod.
5. Trang `/`: Server Component gọi `GET /v1/health`, hiển thị trạng thái API, DB, Redis (bộ xương chạy được toàn tuyến).
6. Test:
   - Vitest + Testing Library + MSW: test một component hiển thị trạng thái health (dữ liệu giả bằng MSW, kiểu lấy từ `shared`).
   - Playwright + `@axe-core/playwright`: smoke test mở `/`, thấy "API: ok", không có lỗi truy cập mức nghiêm trọng.

**Xong khi:** `pnpm dev` ở gốc chạy cả web (3000) và api (4000); trang `/` hiển thị trạng thái xanh; test component và Playwright xanh.

### A7. Chặn từ khóa ngành và CI

- Script `scripts/check-industry-keywords.mjs`: quét `packages/scheduling-core` và các module lõi của api, báo lỗi nếu gặp từ khóa ngành (danh sách trong script). Gọi trong `pnpm lint`.
- `.github/workflows/ci.yml`: Node 26, pnpm cache, `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` → `test:integration` → `test:e2e` (Playwright cài trình duyệt, lưu trace khi lỗi).

**Xong khi:** đẩy lên GitHub, workflow CI xanh.

### A8. Hoàn tất

- Cập nhật `datn-saas/CLAUDE.md` mục "Lệnh thường dùng" cho đúng script thật.
- Cập nhật `README.md`: yêu cầu cài đặt, `docker compose up -d`, `pnpm dev`, các cổng.
- Ghi một dòng vào [Tiến độ](../du-an/tien-do) ở repo docs; tick mục tương ứng trong Roadmap giai đoạn 0.

## Phần B. App docs + mock trong `datn-docs`

### B1. Dựng app

- Repo đã có `content/docs`, `assets`, `CLAUDE.md`, `README.md`. Tạo app Next.js 16 + Fumadocs trong **thư mục tạm** (theo hướng dẫn manual installation của Fumadocs hoặc `create-fumadocs-app`), rồi chép vào gốc repo, **giữ nguyên** `content/docs`.
- Fumadocs MDX là ESM-only: dùng `next.config.mjs`. Tài liệu phục vụ ở `/docs`.
- Kiểm tra Fumadocs đọc được file `.md` hiện có. Nếu không, đổi sang `.mdx` và sửa các ký tự `<`, `{` bị MDX hiểu nhầm.
- Chép `assets/de-cuong-chi-tiet.docx` vào `public/files/` và thêm link tải ở trang Đề cương.

**Xong khi:** `pnpm dev` mở `http://localhost:3000/docs` đọc được đủ các trang, mục lục đúng thứ tự `meta.json`, tìm kiếm hoạt động, link giữa các trang không gãy.

### B2. Khung mock

- Tailwind 4 + `shadcn@latest init` (cùng cấu hình với `apps/web`).
- `app/mock/layout.tsx`: thanh trên cùng có **bộ chọn tenant** (Salon Tóc Mây, Spa thú cưng Pawpaw) và bộ chọn vai trò (Khách, Lễ tân, Chủ cơ sở).
- `app/mock/page.tsx`: danh sách màn hình mock, mỗi màn hình có trạng thái (chưa làm, đang làm, đã chốt).
- `mock/fixtures/`: dữ liệu giả bằng TypeScript cho 2 tenant: chi nhánh, giờ mở cửa, tài nguyên, nhân viên, dịch vụ có đoạn chiếm dụng (nhuộm tóc có đoạn chờ; tắm sấy có lồng sấy), khách, thú cưng, vài lịch hẹn. Kiểu dữ liệu đặt tên theo [Thuật ngữ](../nghiep-vu/thuat-ngu).
- Chưa vẽ màn hình nghiệp vụ: hai màn hình đầu tiên (trang đặt lịch của khách, lịch lễ tân) làm ở giai đoạn 1.

**Xong khi:** `/mock` hiển thị danh sách và đổi được tenant; build không lỗi.

### B3. Deploy

- Người dùng kết nối repo `datn-docs` với Vercel; mỗi lần đẩy lên `main` tự deploy. Gửi link cho giảng viên khi cần.

**Xong khi:** link Vercel mở được `/docs` và `/mock`.

## Câu lệnh gợi ý cho phiên Claude Code đầu tiên

```
Đọc CLAUDE.md và các tài liệu nó chỉ tới. Thực hiện Phần A trong
datn-docs/content/docs/ky-thuat/ke-hoach-dung-base.md, lần lượt từng bước,
kiểm tra mục "Xong khi" trước khi sang bước sau, commit sau mỗi bước.
Dừng lại hỏi mình nếu có quyết định kỹ thuật không làm được.
```

Phiên sau: thay "Phần A" bằng "Phần B".
