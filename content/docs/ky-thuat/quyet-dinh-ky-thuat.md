---
title: Quyết định kỹ thuật
description: Lựa chọn công nghệ, phiên bản, kiến trúc và quy ước code cho datn-saas, kèm lý do và nguồn. Nghiên cứu ngày 03/11/2026.
---

Mỗi quyết định có mã `T-xx`. Nghiên cứu tại thời điểm **03/11/2026**; khi dựng base source, kiểm tra lại phiên bản mới nhất bằng `pnpm view <package> version` và **ghim phiên bản chính xác** (không dùng `^` cho các gói lõi). Thay đổi quyết định nào thì ghi lý do ngay dưới quyết định đó.

## Tổng quan

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

---

## T-01. Runtime: Node.js 24 LTS

- Node 24 là Maintenance LTS, còn bản vá bảo mật đến 30/04/2028, sau ngày bảo vệ. **Node 22 hết bảo mật 30/04/2027, trước ngày bảo vệ** → không dùng.
- Ghi `.nvmrc` = `24` và `"engines": { "node": ">=24" }`; CI chạy Node 24.
- NestJS 12 yêu cầu Node ≥ 20.19 hoặc ≥ 22.12, nên 24 hợp lệ.
- **Đổi từ Node 26 sang 24 (03/11/2026):** máy dev đang có sẵn Node 24, người dùng chốt giữ nguyên để khỏi cài lại runtime. Code không dùng tính năng riêng của Node 26.

## T-02. Monorepo: pnpm workspaces + catalog, Turborepo

- `pnpm-workspace.yaml` khai báo `apps/*`, `packages/*`; dùng **catalog** để mọi package dùng chung một phiên bản TypeScript, Zod, Vitest.
- Gói nội bộ tham chiếu bằng `workspace:*`; gói `shared` và `scheduling-core` là gói **just-in-time**: `exports` trỏ thẳng vào `src/index.ts`, không có bước build riêng.
- Turborepo 2.x: task `build` có `dependsOn: ["^build"]` và `outputs`; `dev` để `cache: false`, `persistent: true`; CI chạy `turbo run lint typecheck test --filter=...[origin/main]` khi repo lớn.
- Giữ ít package (bắt đầu 4). Chỉ tách thêm khi thật cần.
- pnpm ghim `9.15.0` trong `packageManager`, đúng bản đang cài trên máy dev. Nâng lên pnpm mới hơn thì sửa `packageManager` và tạo lại lockfile trong cùng một commit.
- Import tương đối trong gói just-in-time ghi đuôi `.ts` (`allowImportingTsExtensions`), vì API chạy thẳng mã nguồn các gói này bằng Node (type stripping) và Node không tự đổi `.js` thành `.ts`.

## T-03. Frontend: Next.js 16.4 + React 19.3

- Next.js 16.4 (06/10/2026) ra mắt kèm React 19.3; `create-next-app` mặc định **bật Cache Components**, đây là mô hình sẽ thành mặc định ở Next 17 → dùng ngay từ đầu.
- **Chiến lược render:**
  - Trang đặt lịch công khai `/[slug]`: thông tin cơ sở, danh mục dịch vụ, giá được cache bằng `'use cache'` + `cacheTag('tenant:<id>:catalog')`, xóa cache khi chủ tiệm sửa cấu hình. **Giờ trống không bao giờ cache**, luôn render theo request hoặc lấy ở client.
  - Trang quản lý: dữ liệu theo người dùng, động; Server Component lấy dữ liệu ban đầu từ API (chuyển tiếp cookie), phần tương tác (lịch lễ tân, luồng đặt lịch) dùng **TanStack Query** ở client, Socket.IO báo thay đổi thì invalidate query.
  - **Server Actions không chứa nghiệp vụ.** Mọi quy tắc nằm ở NestJS; nếu dùng Server Action thì chỉ là lớp gọi API mỏng.
- Next 16 đổi `middleware.ts` thành **`proxy.ts`**: dùng cho chuyển hướng khi chưa đăng nhập và chuẩn hóa slug. Không kiểm tra quyền ở đây (quyền kiểm tra ở API).
- Form: `react-hook-form` + resolver Zod, dùng **chung schema** với API từ `packages/shared`.
- UI: Tailwind CSS 4 + shadcn/ui preset `base-nova` (Base UI, màu nền `neutral`, icon lucide), cùng bộ với repo mock để chuyển component sang dễ dàng.
- **Lịch lễ tân tự dựng** (CSS grid theo tài nguyên × thời gian, kéo thả bằng `dnd-kit`). Lý do: chế độ resource timeline của FullCalendar thuộc gói Premium cần license; tự dựng còn hiển thị được đoạn chờ theo đúng mô hình đoạn chiếm dụng. Kiểm tra lại license nếu muốn dùng FullCalendar.
- Bật React Compiler nếu không gặp lỗi (Next 16 hỗ trợ `reactCompiler: true`).

## T-04. Backend: NestJS 12, ESM, Express

- NestJS 12 (27/08/2026, bản 12.3.x): gói lõi là ESM; `nest new` hỏi chọn CJS hay ESM → **chọn ESM**. Dự án ESM mặc định dùng **Vitest** và **oxlint**.
- **Validation bằng Standard Schema:** `@Body()`, `@Query()`, `@Param()` nhận tùy chọn `schema` (Zod, Valibot, ArkType); đăng ký `StandardSchemaValidationPipe` toàn cục. Schema dùng chung từ `packages/shared` cho cả form ở FE và validation ở BE; cùng schema sinh tài liệu OpenAPI. Lưu ý: kiểu tham số handler vẫn phải khai báo bằng `z.infer<...>`.
- `@nestjs/config` 12 validate qua Standard Schema → validate biến môi trường bằng Zod, app không khởi động nếu thiếu biến.
- Nest 12.1 có sẵn cookie, chống CSRF, security header: dùng bản dựng sẵn thay vì tự cài helmet, csurf.
- Logger: `ConsoleLogger` của Nest 12 mặc định ghi log có cấu trúc; thêm request id cho mỗi request. Không dùng `@nestjs/observe` (khóa vào Nest, không cần cho đồ án).
- **Cấu trúc module theo miền nghiệp vụ:**

  | Module | Trách nhiệm |
  |---|---|
  | `tenancy` | Khách thuê, chi nhánh, gói cấu hình ngành, ngữ cảnh tenant cho mỗi request |
  | `identity` | Tài khoản, phiên đăng nhập, membership, vai trò, OTP khách |
  | `catalog` | Dịch vụ, biến thể, đoạn chiếm dụng, giá, loại tài nguyên, tài nguyên |
  | `staffing` | Nhân viên, kỹ năng, ca làm, nghỉ phép |
  | `customers` | Khách hàng, đối tượng được phục vụ, ghi chú |
  | `scheduling` | Gọi `scheduling-core` để tính giờ trống; giữ chỗ; lịch hẹn; đổi, hủy, không đến |
  | `billing` | Hóa đơn, thanh toán, `PaymentProvider`, webhook, hoàn tiền |
  | `ledger` | Sổ cái: ví, gói liệu trình, doanh thu thực hiện |
  | `commission` | Quy tắc, kỳ, bút toán hoa hồng |
  | `notifications` | Email, nhắc lịch |
  | `reporting` | Báo cáo chỉ đọc |
  | `assistant` | Chatbot (tool calling) |
  | `platform` | Outbox, hàng đợi, realtime gateway, audit log, health |

- Mỗi module tách 3 lớp: **controller** (HTTP, validation) → **application service** (transaction, quyền, điều phối) → **domain** (hàm thuần, không I/O, dễ test) + **repository** (Drizzle). Logic tiền, hoa hồng, chính sách hoàn cọc viết ở lớp domain.
- API: REST, tiền tố `/v1`; lỗi theo định dạng Problem Details (RFC 9457) với mã lỗi nghiệp vụ (ví dụ `SLOT_TAKEN`); phân trang theo cursor; OpenAPI + Swagger UI tại `/docs` (dùng cho phụ lục báo cáo).

## T-05. `packages/scheduling-core`: thuật toán thuần

- Không phụ thuộc Nest, DB, ngày giờ hệ thống. Đầu vào là dữ liệu thuần (khung giờ mở cửa, ca làm, đoạn chiếm dụng đã có, yêu cầu dịch vụ), đầu ra là danh sách giờ trống và phương án gán tài nguyên.
- Thời gian bên trong biểu diễn bằng **số phút tính từ mốc ngày theo múi giờ của cơ sở** (số nguyên), chỉ đổi sang `timestamptz` ở rìa. Tránh lỗi múi giờ và DST trong thuật toán.
- Đây là chỗ đặt property-based test (E1) và chứng minh "lõi không biết gì về ngành" (BT8).

## T-06. Cơ sở dữ liệu: PostgreSQL 18 + Drizzle ORM v1 (RC)

- PostgreSQL 18, image chính thức trong Docker Compose và Testcontainers. Bật extension `btree_gist` (cần cho exclusion constraint có `tenant_id WITH =`). Khóa chính dùng `default uuidv7()`, hàm có sẵn từ PostgreSQL 18.
- **Drizzle ORM:** bản v1 đang ở **1.0.0-rc.5** (21/10/2026), roadmap ghi 99,5%; dòng 0.x vẫn có bản vá. Chọn **v1 RC, ghim chính xác phiên bản**, nâng lên v1 stable khi phát hành. Lý do: tránh phải chuyển từ 0.x sang v1 giữa chừng (relational queries v2, định dạng migration mới).
- Migration bằng `drizzle-kit`. Những thứ drizzle-kit không biểu diễn được (exclusion constraint, trigger chặn UPDATE/DELETE sổ cái, `FORCE ROW LEVEL SECURITY`, grant cho role) viết bằng **migration SQL tùy chỉnh** và có test đi kèm.
- **Quy ước dữ liệu:**
  - Thời điểm: `timestamptz` (UTC). Mỗi chi nhánh có `timezone` (mặc định `Asia/Ho_Chi_Minh`).
  - Tiền: số nguyên **đồng** (`bigint`, kiểu number ở TypeScript); VND không có phần thập phân.
  - Khóa chính: UUIDv7. Mọi bảng nghiệp vụ có `tenant_id`.
  - Thời gian tính toán ngày giờ ở ứng dụng: `date-fns` + `@date-fns/tz`. Mọi chỗ cần "bây giờ" lấy qua dịch vụ `Clock` để test được.

## T-07. Cô lập dữ liệu: RLS hai lớp

- App kết nối DB bằng role `app_user` **không phải chủ bảng, không có `BYPASSRLS`**; migration chạy bằng role chủ sở hữu. Bật `ENABLE` và `FORCE ROW LEVEL SECURITY` trên mọi bảng có `tenant_id`.
- Policy (cả `USING` và `WITH CHECK`): `tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`. Sau transaction có `set_config(..., true)`, kết nối trong pool giữ giá trị `''` chứ không phải `NULL`; thiếu `nullif` thì truy vấn ngoài `withTenant()` báo lỗi ép kiểu thay vì trả về 0 dòng. Mỗi thao tác chạy trong transaction qua helper `withTenant(tenantId, tx => ...)`, helper gọi `select set_config('app.tenant_id', $1, true)` (tham số hóa, không nối chuỗi) trước khi chạy truy vấn.
- Tenant của request được guard xác định từ phiên đăng nhập hoặc slug công khai, giữ trong ngữ cảnh request (ví dụ `nestjs-cls`).
- Định nghĩa policy bằng `pgPolicy` của Drizzle khi được; phần còn lại ở migration SQL.

## T-08. Xác thực: tự xây bằng phiên trong cookie

- **Nhân viên:** email + mật khẩu (băm bằng argon2id, gói `@node-rs/argon2` có sẵn bản build cho Windows). Đăng nhập tạo **session token ngẫu nhiên**, lưu bản băm trong bảng `sessions`, gửi về bằng cookie `httpOnly`, `Secure`, `SameSite=Lax`. Thu hồi phiên được ngay (đăng xuất, đổi mật khẩu).
- **Khách hàng:** OTP qua email theo từng khách thuê → phiên khách gắn với `tenant` đó.
- Triển khai web và api **cùng site** (ví dụ `app.<domain>` và `api.<domain>`) để cookie hoạt động; môi trường dev dùng `localhost` khác cổng. CORS chỉ cho phép origin của web, có `credentials`.
- Giới hạn tần suất (`@nestjs/throttler`) cho đăng nhập và gửi OTP.
- **Vì sao không dùng Better Auth:** tích hợp NestJS là gói cộng đồng (`@thallesp/nestjs-better-auth`), chưa rõ hỗ trợ Nest 12; mô hình membership theo tenant và OTP khách vẫn phải tự làm. **Vì sao không dùng JWT:** khó thu hồi, không cần cho kiến trúc một backend.

## T-09. Hàng đợi, outbox, realtime

- **BullMQ** qua `@nestjs/bullmq` + Redis: job dọn giữ chỗ hết hạn, nhắc lịch (delayed job), xử lý outbox, gửi email.
- **Outbox:** sự kiện ghi trong cùng transaction với thay đổi nghiệp vụ; worker lấy bằng `SELECT ... FOR UPDATE SKIP LOCKED`, xử lý idempotent, đánh dấu đã xong.
- **Socket.IO** qua `@nestjs/websockets`: phòng theo `tenant:branch`; server chỉ gửi "có thay đổi lịch" để client tải lại, không gửi dữ liệu nhạy cảm qua socket. Xác thực socket bằng cùng cookie phiên.

## T-10. Thanh toán

- Interface `PaymentProvider { createPayment, verifyWebhook, refund }`.
- Bản chính: `MockPaymentProvider` sinh QR VietQR để hiển thị, webhook giả lập ký HMAC-SHA256, nút "giả lập chuyển khoản" chỉ có ở dev và demo. Lý do: payOS không có sandbox ([D-09](../du-an/quyet-dinh#d-09-thanh-toán-payos-không-có-môi-trường-test)).
- Provider thật là tùy chọn sau M5.

## T-11. Email và AI

- Email: Nodemailer; dev và test dùng **Mailpit** (xem email trong trình duyệt, có API để test đọc OTP).
- AI: Claude API với tool use, bọc sau interface `LlmClient` để test được bằng client giả. Tool chỉ gọi application service, không truy cập DB trực tiếp.

## T-12. Chất lượng code

- **TypeScript 6.0** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; `tsconfig.base.json` ở gốc. Chưa dùng TypeScript 7 (compiler viết lại bằng Go) vì `@nestjs/cli` 12 còn phụ thuộc `typescript ~6.0`.
- **oxlint** cho cả repo (mặc định của Nest 12; Next 16 đã bỏ lệnh `next lint`), bật plugin typescript, react, nextjs, import, vitest. **Prettier** để format.
- Script CI chặn từ khóa ngành (`hair`, `nail`, `pet`, `tóc`, `thú cưng`...) trong `packages/scheduling-core` và các module lõi (BT8).
- Commit theo Conventional Commits (`feat(scheduling): ...`), mỗi commit chạy được test.
- Pre-commit hook bằng **husky + lint-staged**: Prettier và oxlint trên file đã stage, kiểm từ khóa ngành, `typecheck`, unit test. Integration và e2e để CI chạy.

## T-13. Triển khai và CI

- `docker-compose.yml` ở gốc `datn-saas`: `postgres:18`, `redis`, `mailpit`. Chạy app bằng `pnpm dev` trên máy.
- GitHub Actions: cài đặt → lint → typecheck → unit → integration (Testcontainers chạy được trên runner Ubuntu có Docker) → e2e Playwright (theo nhánh `main` và PR). Lưu trace Playwright khi lỗi.
- Demo: web trên Vercel; api, Postgres, Redis bằng Docker trên một VPS hoặc Railway.

## T-14. Repo `datn-docs`

- Next.js 16 + **Fumadocs** (hỗ trợ Next 16, Tailwind 4): nội dung Markdown trong `content/docs`, phục vụ ở `/docs`; prototype ở `/mock/*`.
- Mock dùng cùng Tailwind 4 + shadcn/ui với `apps/web`, dữ liệu giả là fixture TypeScript trong repo, có cả tenant salon và spa thú cưng.
- Fumadocs MDX là ESM-only: file cấu hình là `next.config.mjs`.

## Nguồn

- [Next.js 16.4](https://nextjs.org/blog/next-16-4) · [Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy) · [Upgrade to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [NestJS v12.0.0 release](https://github.com/nestjs/nest/releases/tag/v12.0.0) · [InfoQ: NestJS 12 roadmap](https://infoq.com/news/2026/04/nestjs-12-roadmap-esm) · [InfoQ: NestJS 12 observability](https://infoq.com/news/2026/10/nestjs-12-observability) · [NestJS migration guide](https://docs.nestjs.com/migration-guide) · [endoflife.date: NestJS](https://endoflife.date/nestjs)
- [endoflife.date: Node.js](https://endoflife.date/nodejs)
- [Drizzle latest releases](https://orm.drizzle.team/docs/latest-releases) · [Drizzle RLS](https://orm.drizzle.team/docs/rls) · [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) · [PostgreSQL Range Types](https://www.postgresql.org/docs/current/rangetypes.html)
- [Better Auth NestJS integration](https://better-auth.com/docs/integrations/nestjs)
- [payOS: Môi trường test](https://payos.vn/docs/moi-truong-test) · [VietQR Test Callback](https://api.vietqr.vn/en/v1/vietqr-apis/test-callback)
- [Fumadocs: Next.js manual installation](https://www.fumadocs.dev/docs/manual-installation/next)
- [PkgPulse: JS monorepos 2026 best practices](https://www.pkgpulse.com/guides/javascript-monorepos-2026-best-practices-pitfalls)
