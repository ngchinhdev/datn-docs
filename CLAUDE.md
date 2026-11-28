# Đồ án tốt nghiệp: Nền tảng SaaS đặt lịch đa tài nguyên

File này là **trí nhớ dự án** cho Claude Code. Đọc nó đầu mỗi phiên. Chi tiết nằm trong `content/docs/`; chỉ mở file cần cho việc đang làm.

## Bối cảnh

- **Đề tài:** Xây dựng nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho cơ sở làm đẹp.
- **Sinh viên:** Nguyễn Ngọc Chính (26410176), UIT, làm một mình. **GVHD:** ThS. Nguyễn Thị Thùy Trâm.
- **Phạm vi:** chỉ cơ sở làm đẹp (salon tóc, nail, spa), D-16. Không có spa thú cưng, gói cấu hình ngành hay đối tượng được phục vụ; mỗi mục lịch hẹn là một dịch vụ cho một người.
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

## Tài liệu

Repo có hai vùng:

- **`content/docs/`: tài liệu chính thức**, phục vụ ở `/docs`, giữ lại khi xong dự án. Viết như mô tả sản phẩm đang có. Không ghi bước, PR, ai bảo gì, lịch sử thay đổi.
- **`sessions/`: vùng làm việc** (tiến độ, kế hoạch, prompt, review), xóa khi xong dự án. Trang chính thức không link tới đây.

| Cần gì | Đọc file |
|---|---|
| Phạm vi, vai trò, bài toán khó BT1–BT7, thực nghiệm E1–E8 | `content/docs/overview/scope.md` |
| Đề cương đã gửi cô (không tự ý mở rộng phạm vi so với đây) | `content/docs/overview/proposal.md` |
| Tên gọi khái niệm trong code | `content/docs/overview/glossary.md` |
| Một tính năng: quy tắc BR-xx.y, luồng, tiêu chí chấp nhận AC-xx | `content/docs/features/<tính-năng>.md` (đã có: `auth.md`) |
| Quy tắc BR-xx chưa tách theo tính năng | `content/docs/features/business-rules.md` |
| Danh sách màn hình MH-xx; đặc tả một màn | `content/docs/screens/index.md`; `content/docs/screens/<màn>.md` |
| Quy ước API, quyền và lỗi nghiệp vụ từng nhóm | `content/docs/api/index.md`, `content/docs/api/<nhóm>.md` |
| Kiến trúc, ERD, thuật toán giờ trống, cách viết test | `content/docs/architecture/` |
| Vì sao chọn A mà không chọn B (D-xx, T-xx) | `content/docs/decisions/index.md`, mỗi quyết định một file |
| Đã làm đến đâu | `sessions/progress/` (file tháng mới nhất) |
| Kế hoạch và prompt từng bước | `sessions/plans/` (`auth.md`, `ui-mock.md`, `base-setup.md`, `roadmap.md`) |
| Thiết kế: màu, chữ, component, màn hình đã chốt | `design/README.md`, `design/sapio/README.md` |

`sessions/archive/initial-analysis.md` là bản phân tích ban đầu, **rộng hơn phạm vi đồ án**: chỉ tham khảo, không làm theo.

Link giữa các trang trong `content/docs` ghi đường dẫn tới file, có đuôi `.md` (`../features/auth.md#muc`), vì Fumadocs chỉ đổi link dạng này sang URL của trang. Tên thư mục và tên file bằng tiếng Anh, nội dung bằng tiếng Việt. Trang tham chiếu API sinh từ OpenAPI không có file `.md`: link tới đó ghi `./reference/<tag>/<operationId>.mdx` (tương đối so với trang đang viết, như `./reference/auth/authLogin.mdx` trong `api/auth.md`).

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
5. (Đã bỏ theo D-16: không còn quy tắc "lõi không biết ngành".)
6. **Sổ cái:** `ledgerEntry` chỉ thêm, không sửa, không xóa; điều chỉnh bằng bút toán đảo.
7. **Lớp:** controller → application service → domain (hàm thuần) + repository (Drizzle). Domain không import Nest hay Drizzle.
8. **Schema:** định nghĩa một lần trong `packages/shared`, FE và BE cùng dùng.
9. **Test:** tên test bắt đầu bằng mã BR khi kiểm quy tắc nghiệp vụ (`it('BR-23: ...')`, `it('BR-76.4: ...')`). Không mock database trong integration/e2e.
10. **Đổi quyết định:** không âm thầm đổi thư viện hay kiến trúc. Đề xuất, chờ người dùng đồng ý, rồi ghi vào trang quyết định (D-xx hoặc T-xx).

## Cách làm việc mỗi phiên

1. Đọc mục mới nhất trong `sessions/progress/` để biết đang ở đâu, rồi kế hoạch của bước trong `sessions/plans/`.
2. Thay đổi nghiệp vụ thì cập nhật trang tính năng (`content/docs/features/`) trước khi viết code. Endpoint mới hay đổi thì cập nhật trang API tương ứng.
3. Một tính năng xong khi đạt "Định nghĩa hoàn thành" trong `content/docs/architecture/testing.md` và mọi dòng AC-xx của trang tính năng có test.
4. Commit nhỏ, theo Conventional Commits (`feat(scheduling): ...`, `test(billing): ...`, `docs: ...`).
5. **Kết thúc phiên:** thêm một mục vào `sessions/progress/<năm-tháng>.md` (đã làm, vướng, tiếp theo) và commit repo docs.

## Lệnh thường dùng

Repo này (`datn-docs`):

```bash
pnpm install
pnpm dev        # http://localhost:3100/docs và /mock (3000 là web của datn-saas)
pnpm build
pnpm sync:openapi [đường dẫn]   # chép openapi.json của API vào openapi/sapio.json; chạy mỗi khi API đổi, commit cùng PR
```

Lệnh của `datn-saas` xem `datn-saas/CLAUDE.md`.

## Mock giao diện

- Nằm ở `app/mock/*` trong repo này, dùng dữ liệu giả trong `mock/fixtures/` (TypeScript), không gọi API thật.
- Có bộ chọn tenant (Salon Tóc Mây, Spa Lá Sen) và bộ chọn vai trò.
- Dùng cùng Tailwind 4 + shadcn/ui với `apps/web` để chuyển component sang dễ.
- Giao diện theo hệ thống thiết kế **Sapio** (`design/sapio/`): chỉ dùng biến trong `tokens.css` và class trong `components.css`, không tự đặt màu; không nền đen ở đâu. Màn hình tham chiếu ở `design/screens/`.
- Chia việc: phiên claude.ai lo phân tích, thiết kế, review; Claude Code trên máy lo code theo kế hoạch, làm trên nhánh riêng và mở pull request để review, không tự merge.
- Mock là bản phác của luồng. Màn xong đặc tả và mock thì đổi trạng thái thành "đã chốt" và dùng làm căn cứ để code; giảng viên xem sau, góp ý thì sửa và ghi vào `sessions/progress/`.
- **Kiểm trên máy chỉ chạy** `pnpm check:availability`, `pnpm typecheck`, `pnpm build`, `prettier --check`, và **`pnpm shot`** cho bước có giao diện. Không tự viết script Playwright hay axe nào khác, không tạo file trong thư mục tạm của hệ điều hành. Mục "Xong khi" trong kế hoạch là danh sách để người dùng kiểm.
- **Tự so với bản vẽ (bước có giao diện):** trước khi báo xong, chạy `pnpm dev` rồi `pnpm shot <route>...` cho các route của bước (ảnh 1440×900, thêm `--phone` cho 390×844, `--dark` cho theme tối), mở từng ảnh trong `.shots/` bằng công cụ đọc ảnh, so với file `design/screens/*.dc.html` tương ứng: bố cục, khoảng cách, màu chữ và link, chữ bị cắt, phần tử chồng nhau. Sửa hết chỗ lệch rồi mới báo xong; chỗ cố ý khác bản vẽ thì ghi vào mục "Tự quyết" của PR. Không commit ảnh (`.shots/` nằm trong `.gitignore`).
