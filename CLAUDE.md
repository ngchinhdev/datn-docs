# Đồ án tốt nghiệp: Nền tảng SaaS đặt lịch đa tài nguyên

File này là **trí nhớ dự án** cho Claude Code. Đọc nó đầu mỗi phiên. Chi tiết nằm trong `content/docs/`; chỉ mở file cần cho việc đang làm.

## Bối cảnh

- **Đề tài:** Xây dựng nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn.
- **Sinh viên:** Nguyễn Ngọc Chính (26410176), UIT, làm một mình. **GVHD:** ThS. Nguyễn Thị Thùy Trâm.
- **Ngành chính:** salon tóc, nail, spa. **Ngành thứ hai** (chứng minh tính tổng quát, chỉ bằng cấu hình): spa thú cưng.
- **Mốc:** bắt đầu 02/11/2026; đóng băng tính năng 16/05/2027; bảo vệ cuối 06/2027.
- **Giao tiếp:** người dùng viết tiếng Việt; trả lời và viết tài liệu bằng tiếng Việt. Code, tên biến, commit message bằng tiếng Anh.

## Hai repo, một thư mục cha

```
datn/
├── CLAUDE.md          # chỉ chứa: @datn-docs/CLAUDE.md
├── datn-docs/         # repo này: tài liệu + mock giao diện (Next.js + Fumadocs)
└── datn-saas/         # monorepo code: apps/web, apps/api, packages/*
```

Mở VS Code và Claude Code tại `datn/` để thấy cả hai repo.

## Tài liệu (nguồn sự thật)

| Cần gì | Đọc file |
|---|---|
| Phạm vi, giai đoạn, thực nghiệm E1–E9, bài toán khó BT1–BT8 | `content/docs/du-an/roadmap.md` |
| Đề cương đã gửi cô (không tự ý mở rộng phạm vi so với đây) | `content/docs/du-an/de-cuong.md` |
| Vì sao chọn A mà không chọn B (D-xx) | `content/docs/du-an/quyet-dinh.md` |
| Đã làm đến đâu | `content/docs/du-an/tien-do.md` |
| Quy tắc nghiệp vụ (BR-xx) | `content/docs/nghiep-vu/quy-tac.md` |
| Tên gọi khái niệm trong code | `content/docs/nghiep-vu/thuat-ngu.md` |
| Phiên bản, kiến trúc, pattern (T-xx) | `content/docs/ky-thuat/quyet-dinh-ky-thuat.md` |
| Cách viết test | `content/docs/ky-thuat/chien-luoc-kiem-thu.md` |
| Dựng base source từng bước | `content/docs/ky-thuat/ke-hoach-dung-base.md` |
| Code giao diện mock từng bước | `content/docs/ky-thuat/ke-hoach-ui-mock.md` |
| Thiết kế: màu, chữ, component, màn hình đã chốt | `design/README.md`, `design/sapio/README.md` |

`content/docs/nghiep-vu/phan-tich-goc.md` là bản phân tích ban đầu, **rộng hơn phạm vi đồ án**: chỉ tham khảo, không làm theo.

Link giữa các trang tài liệu ghi đường dẫn tới file, có đuôi `.md` (`../du-an/roadmap.md#muc`), vì Fumadocs chỉ đổi link dạng này sang URL của trang.

## Tóm tắt kỹ thuật (chi tiết ở T-xx)

- Node.js 24 LTS, pnpm workspaces + catalog, Turborepo. TypeScript strict, ESM.
- `apps/web`: Next.js 16 (App Router, Cache Components, `proxy.ts`), Tailwind 4, shadcn/ui, TanStack Query, react-hook-form + Zod.
- `apps/api`: NestJS 12 (ESM, Vitest), REST `/v1`, Problem Details (RFC 9457), OpenAPI tại `/docs`.
- `packages/shared`: schema Zod 4 dùng chung FE/BE. `packages/scheduling-core`: thuật toán giờ trống, hàm thuần, không phụ thuộc framework.
- PostgreSQL 18 + Drizzle ORM (ghim bản), exclusion constraint `tstzrange` (btree_gist), RLS theo `app.tenant_id`, app kết nối bằng role `app_user` không có BYPASSRLS.
- Redis + BullMQ, outbox pattern. Socket.IO. Mailpit khi dev.
- Tự viết xác thực: session token mờ trong cookie httpOnly, argon2id, OTP email cho khách.
- Thanh toán: interface `PaymentProvider` + `MockPaymentProvider` ký HMAC (payOS không có sandbox, D-09).
- Chatbot: Claude API tool use sau interface `LlmClient`; chỉ gọi API nội bộ, không tự bịa giá, giờ.
- Test: Vitest, fast-check, Testcontainers, Supertest, Testing Library + MSW, Playwright + axe, k6. Lint: oxlint + Prettier.

## Quy tắc bắt buộc

1. **Tiền:** số nguyên VND (`bigint`), không dùng số thực.
2. **Thời gian:** lưu `timestamptz` UTC; hiển thị theo múi giờ chi nhánh (`Asia/Ho_Chi_Minh`). Nghiệp vụ không gọi `Date.now()`, dùng `Clock`.
3. **ID:** UUIDv7.
4. **Đa khách thuê:** mọi bảng nghiệp vụ có `tenant_id` + RLS (ENABLE và FORCE). Truy vấn nghiệp vụ đi qua `withTenant()`. Không có đường tắt bỏ qua RLS trong code ứng dụng.
5. **Lõi không biết ngành:** `scheduling-core` và các module lõi không chứa từ khóa ngành (tóc, nail, chó, mèo...). Khác biệt ngành nằm trong `industryTemplate` (dữ liệu). Có script kiểm tra trong lint.
6. **Sổ cái:** `ledgerEntry` chỉ thêm, không sửa, không xóa; điều chỉnh bằng bút toán đảo.
7. **Lớp:** controller → application service → domain (hàm thuần) + repository (Drizzle). Domain không import Nest hay Drizzle.
8. **Schema:** định nghĩa một lần trong `packages/shared`, FE và BE cùng dùng.
9. **Test:** tên test bắt đầu bằng mã BR khi kiểm quy tắc nghiệp vụ (`it('BR-23: ...')`). Không mock database trong integration/e2e.
10. **Đổi quyết định:** không âm thầm đổi thư viện hay kiến trúc. Đề xuất, chờ người dùng đồng ý, rồi ghi vào trang quyết định (D-xx hoặc T-xx).

## Cách làm việc mỗi phiên

1. Đọc `tien-do.md` (mục mới nhất) để biết đang ở đâu.
2. Làm việc theo roadmap. Thay đổi nghiệp vụ thì cập nhật `quy-tac.md` trước khi viết code.
3. Một tính năng xong khi đạt "Định nghĩa hoàn thành" trong `chien-luoc-kiem-thu.md`.
4. Commit nhỏ, theo Conventional Commits (`feat(scheduling): ...`, `test(billing): ...`, `docs: ...`).
5. **Kết thúc phiên:** thêm một mục vào `tien-do.md` (đã làm, vướng, tiếp theo) và commit repo docs.

## Lệnh thường dùng

Repo này (`datn-docs`):

```bash
pnpm install
pnpm dev        # http://localhost:3100/docs và /mock (3000 là web của datn-saas)
pnpm build
```

Lệnh của `datn-saas` xem `datn-saas/CLAUDE.md`.

## Mock giao diện

- Nằm ở `app/mock/*` trong repo này, dùng dữ liệu giả trong `mock/fixtures/` (TypeScript), không gọi API thật.
- Có bộ chọn tenant (Salon Tóc Mây, Spa thú cưng Pawpaw) và bộ chọn vai trò.
- Dùng cùng Tailwind 4 + shadcn/ui với `apps/web` để chuyển component sang dễ.
- Giao diện theo hệ thống thiết kế **Sapio** (`design/sapio/`): chỉ dùng biến trong `tokens.css` và class trong `components.css`, không tự đặt màu; không nền đen ở đâu. Màn hình tham chiếu ở `design/screens/`.
- Chia việc: phiên claude.ai lo phân tích, thiết kế, review; Claude Code trên máy lo code theo kế hoạch, làm trên nhánh riêng và mở pull request để review, không tự merge.
- Mock là bản phác để chốt luồng với giảng viên; khi chốt, đổi trạng thái màn hình thành "đã chốt".
