# Kế hoạch: đăng ký cơ sở

Đặc tả chính thức:

- Nghiệp vụ và tiêu chí chấp nhận: `content/docs/features/signup.md` (BR-74.1 đến BR-74.23, AC-24 đến AC-56)
- API: `content/docs/api/index.md`, `content/docs/api/signup.md`, và `content/docs/api/auth.md` (#1, #3)
- Màn hình: `content/docs/screens/signup.md`
- Bảng: `content/docs/architecture/erd.md` mục 2 đến 4
- Quyết định: D-15, D-16, T-16, T-17, T-22

Kế hoạch này chỉ chia việc. Trang nào ở trên nói khác kế hoạch thì làm theo trang đó, và báo lại.

## Chia PR

| Bước | Repo, nhánh | Nội dung |
|---|---|---|
| S0 | `datn-docs`, `docs/signup` | Đặc tả và sửa mock signup |
| S1 | `datn-saas`, `feat/signup-api` | Bảng, endpoint, email gửi mã, dữ liệu mẫu, test |
| S2 | `datn-saas`, `feat/signup-web` | Trang `/signup`, e2e, axe |

## S0. Đặc tả và mock

- Viết `features/signup.md`, `api/signup.md`, `screens/signup.md`; sửa `features/auth.md`, `api/auth.md` (#1, #3), `api/index.md`, `screens/index.md` (MH-02), `login.md`, `select-workspace.md`, `architecture/erd.md`, `business-rules.md` (BR-74); thêm T-22.
- Mock `/mock/signup`: bỏ `industryTemplate` và `SIGNUP_INDUSTRY`; bước 3 hỏi số Ghế, Giường, Phòng (0 đến 20); bỏ "Lưu và làm tiếp sau"; bước 4 khớp mục "Bước 4: đã tạo" của trang màn hình; mẫu thư `verifyMail` trong `mock/account-mail.ts`. Fixtures `templates` giữ nguyên cho các màn khác.

### Xong khi

- [ ] `pnpm typecheck`, `pnpm build`, `prettier --check` qua.
- [ ] `/mock/signup` đi hết 4 bước; bước 3 có ba ô số Ghế (1), Giường (0), Phòng (0), không có nút "Lưu và làm tiếp sau".
- [ ] Bước 4 chỉ có tên cơ sở, địa chỉ trang đặt lịch, ngày cuối dùng thử, lời nhắc chưa nhận đặt lịch, nút vào khu quản trị.
- [ ] Mỗi quy tắc BR-74.x của `features/signup.md` có ít nhất một dòng AC.
- [ ] PR có mục "Tự quyết".

## S1. API đăng ký

Đầu việc:

- Migration: đặt `email_verified_at = created_at` cho mọi `users` đang có (tài khoản hiện có đều đã dùng được, không bị xem là chưa xác thực). Thêm `user_id`, `revoked_at` cho `email_verifications`, bảng `trial_claims`, và các bảng của ERD mục 2 đến 4 mà transaction tạo cơ sở ghi vào (`branches`, `opening_hours`, `resource_types`, `resources`, `plans`, `subscriptions`; thêm cột còn thiếu của `tenants`, không có `monogram`). Không tạo `booking_policies` và `tenant_profiles`. RLS theo T-07.
- Domain (hàm thuần, thời gian từ `Clock`): sinh và so mã, `trialEndsAt(createdAt, timeZone)` (test thuộc tính và hai ca gần nửa đêm), tên tài nguyên "Ghế 1".
- Endpoint #1 đến #5 của `api/signup.md`; guard cho phiên chưa xác thực (`EMAIL_NOT_VERIFIED`); `GET /v1/auth/session` thêm `emailVerified`, `canCreateTrial`; `redirectTo` của đăng nhập cho tài khoản chưa xác thực; giới hạn theo IP.
- Email "Mã xác thực email Sapio" theo `verifyMail` của `datn-docs/mock/account-mail.ts`, qua hàng đợi `mail`.
- Schema Zod và mã lỗi ở `packages/shared`.
- Scalar và dữ liệu mẫu theo mục "Thử trong Scalar" của `api/signup.md`; `plans` có `basic` và `pro`; mọi cơ sở mẫu có dòng `trial_claims`; seed đặt `email_verified_at` cho mọi tài khoản trừ `chuaxacthuc@email.vn`.
- Biến môi trường mới cho khóa HMAC của mã xác thực (`SIGNUP_CODE_HMAC_KEY`), ghi vào `.env.example`; thiếu khóa thì API không khởi động.
- Xuất `openapi.json`, chạy `pnpm sync:openapi` ở `datn-docs`, thêm link "Tham chiếu" vào `api/signup.md`.
- Test AC-24 đến AC-56. Các ca chạy đồng thời (AC-46, AC-51) và hoàn tác transaction (AC-48) là integration test với Testcontainers, không mock DB.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration` qua.
- [ ] Scalar chạy được các ca trong mục "Thử trong Scalar" và cho đúng kết quả.
- [ ] Đăng ký bằng email mới, đọc mã trong Mailpit (`:8025`), nhập mã, tạo cơ sở: `GET /v1/auth/workspaces` có cơ sở mới.
- [ ] `trial_ends_at` của cơ sở tạo lúc 23:50 giờ Việt Nam là 00:00 ngày thứ 8.
- [ ] PR có mục "Tự quyết".

## S2. Web đăng ký

Đầu việc:

- Trang `/signup` bốn bước theo `screens/signup.md`, chữ ở `apps/web/messages/*.json` (T-21), mã lỗi API xử lý theo bảng "Xử lý".
- Nút "Đăng ký cơ sở của riêng bạn" ở Chọn cơ sở theo `canCreateTrial`; trang đăng nhập và Chọn cơ sở chuyển tài khoản chưa xác thực tới `/signup?step=verify`.
- e2e (đọc mã trong Mailpit): đăng ký đủ bốn bước; sửa email ở bước 2; đăng ký lại email của tài khoản chưa xác thực; slug trùng; tài khoản đã tạo cơ sở không còn nút và bị chuyển khỏi `/signup`. axe cho bốn bước, hai theme.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` qua.
- [ ] Đi hết bốn bước ở 1440px và 390px, hai theme, hai ngôn ngữ.
- [ ] PR có mục "Tự quyết".

## Prompt S1

Viết sau khi review S0.

## Prompt S2

Viết sau khi review S0.
