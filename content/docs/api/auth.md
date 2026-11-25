---
title: Xác thực
description: Đăng nhập, phiên, đăng xuất, chọn cơ sở, quên và đặt lại mật khẩu của nhân sự và quản trị nền tảng.
---

Nghiệp vụ ở [Xác thực nhân sự](../features/auth.md). Quy ước chung (cookie, lỗi, `Origin`) ở [Quy ước API](./index.md).

## Danh sách

| # | Endpoint | Quyền | Thành công | Lỗi nghiệp vụ | Quy tắc |
|---|---|---|---|---|---|
| 1 | `POST /v1/auth/login` | Công khai | 200, đặt cookie | `INVALID_CREDENTIALS`, `LOGIN_LOCKED` | BR-76 |
| 2 | `POST /v1/auth/logout` | Công khai | 204, xóa cookie | | BR-76.12 |
| 3 | `GET /v1/auth/session` | Nhân sự | 200 | `UNAUTHENTICATED` | BR-76.9, 76.10 |
| 4 | `GET /v1/auth/workspaces` | Nhân sự | 200 | | BR-79 |
| 5 | `POST /v1/auth/workspaces/{slug}/enter` | Nhân sự | 200 | `NOT_FOUND` | BR-79 |
| 6 | `POST /v1/auth/password/forgot` | Công khai | 202 | | BR-77.1, 77.3 |
| 7 | `POST /v1/auth/password/reset/check` | Công khai | 200 | `RESET_LINK_INVALID` | BR-77.2, 77.6 |
| 8 | `POST /v1/auth/password/reset` | Công khai | 200, đặt cookie | `RESET_LINK_INVALID` | BR-73, BR-77 |
| 9 | `POST /v1/platform/auth/login` | Công khai | 200, đặt cookie | `INVALID_CREDENTIALS`, `LOGIN_LOCKED` | BR-76, T-18 |
| 10 | `POST /v1/platform/auth/logout` | Công khai | 204, xóa cookie | | BR-76.12 |
| 11 | `GET /v1/platform/auth/session` | Quản trị nền tảng | 200 | `UNAUTHENTICATED` | BR-76.11 |

Giới hạn theo IP (`RATE_LIMITED`): #1 và #9 tối đa 20 lần mỗi phút, #6 tối đa 10 lần mỗi phút, #7 và #8 tối đa 20 lần mỗi phút.

## 1. Đăng nhập

`POST /v1/auth/login`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `email` | string, email, tối đa 254 | Có | Chuẩn hóa: bỏ khoảng trắng hai đầu, chữ thường |
| `password` | string, 1 đến 1024 | Có | Không kiểm BR-73 (BR-73.5) |
| `remember` | boolean | Không, mặc định `false` | "Giữ đăng nhập trên máy này" |

Xử lý, theo thứ tự:

1. Đọc `login_throttles` của email. Còn khóa thì trả **423** `LOGIN_LOCKED`. Không so mật khẩu, không đếm (BR-76.5).
2. Tìm tài khoản theo email, so mật khẩu bằng argon2id. Không có tài khoản thì vẫn so với một hash giả, để thời gian trả lời không lộ email có tồn tại (BR-76.1).
3. Sai mật khẩu, không có tài khoản, hoặc là tài khoản quản trị nền tảng: tăng bộ đếm. Bộ đếm còn từ một lần khóa đã hết thì đếm lại từ 0 (BR-76.7).
   - Đủ 5 lần: đặt `locked_until` = bây giờ + 15 phút, trả **423** `LOGIN_LOCKED`. Tài khoản có thật thì đưa email báo khóa vào hàng đợi (BR-76.6).
   - Chưa đủ 5: trả **401** `INVALID_CREDENTIALS`. Từ lần thứ 3 thì kèm `remainingAttempts` (BR-76.3).
4. Đúng: xóa dòng `login_throttles`, tạo phiên (BR-76.9, 76.10), đặt cookie. `remember = false` thì cookie không có `Max-Age`.
5. Tính nơi đến theo bảng "Vào cơ sở sau khi đăng nhập" của [tính năng](../features/auth.md#vào-cơ-sở-sau-khi-đăng-nhập-một-phần-của-br-79).

Trả về 200:

```json
{
  "user": { "id": "0193…", "email": "an@tiemcuaban.vn", "name": "Nguyễn Văn An" },
  "redirectTo": "/app/toc-may/calendar"
}
```

`redirectTo` là đường dẫn giao diện chuyển tới: trang đầu của cơ sở (`/app/{slug}/calendar`, hoặc `/app/{slug}/my/schedule` với kỹ thuật viên), hoặc `/select-workspace` khi cần chọn cơ sở.

| Status | `code` | Trường thêm | Câu hiển thị (MH-03) |
|---|---|---|---|
| 401 | `INVALID_CREDENTIALS` | `remainingAttempts?` (2 hoặc 1) | "Email hoặc mật khẩu chưa đúng." / "… Còn {n} lần thử, sau đó tạm khóa 15 phút." |
| 423 | `LOGIN_LOCKED` | `lockedUntil` | "Tạm khóa đăng nhập tới {giờ}." |

## 2. Đăng xuất

`POST /v1/auth/logout`. Đặt `revoked_at` cho phiên của cookie, rồi xóa cookie. Không có phiên vẫn trả 204, để bấm hai lần không báo lỗi.

## 3. Phiên hiện tại

`GET /v1/auth/session`. Trả về `{ user, remember, expiresAt }`. Phiên có `remember` thì mỗi lần gọi API được tính là một lần dùng: cập nhật `last_used_at`, `expires_at` và `Max-Age` của cookie. Để đỡ ghi DB, chỉ cập nhật khi `last_used_at` đã cũ hơn 5 phút (BR-76.10).

## 4. Danh sách cơ sở

`GET /v1/auth/workspaces`. Dùng cho Chọn cơ sở (MH-06). Đọc `memberships` trong `withUser(userId, ...)` rồi nối với `tenants` ([ERD](../architecture/erd.md), T-07).

```json
[
  { "slug": "toc-may", "name": "Salon Tóc Mây", "role": "owner", "branch": null, "status": "active", "lastUsed": true }
]
```

`status`:

| Giá trị | Nghĩa |
|---|---|
| `active` | Đang dùng thử hoặc còn gói |
| `plan-only` | Chủ cơ sở, gói đã hết: chỉ vào được trang Gói Sapio |
| `paused` | Nhân viên, gói đã hết: không vào được |
| `locked` | Bị quản trị nền tảng khóa (BR-75) |

Khi chưa có bảng gói thì mọi cơ sở là `active`.

## 5. Vào một cơ sở

`POST /v1/auth/workspaces/{slug}/enter`. Ghi `users.last_tenant_id` rồi trả về `{ redirectTo }`, là trang đầu của cơ sở đó theo vai trò. Tài khoản không có membership ở cơ sở này thì trả **404** `NOT_FOUND`, không phải 403, để không lộ slug có tồn tại.

## 6. Quên mật khẩu

`POST /v1/auth/password/forgot` với body `{ email }`. Luôn trả **202** với body rỗng (BR-77.1).

Máy chủ chỉ gửi email khi đủ cả ba điều kiện:
- có tài khoản;
- không phải tài khoản quản trị nền tảng;
- link gần nhất đã tạo cách đây ít nhất 60 giây.

Khi gửi: đánh dấu `replaced_at` cho các link cũ còn hiệu lực, tạo link mới hạn 30 phút, đưa email vào hàng đợi (BR-77.2, 77.3). Link có dạng `{WEB_ORIGIN}/reset-password?token=…`. Request không chờ hàng đợi nhận email, để thời gian trả lời không khác nhau rõ giữa email có và không có tài khoản.

## 7. Kiểm link đặt lại

`POST /v1/auth/password/reset/check` với body `{ token }`. Link còn dùng được thì trả 200 `{ email }`, để màn đặt lại hiện email đang đặt. Link đã dùng, hết hạn hoặc đã bị thay thì trả **410** `RESET_LINK_INVALID` (BR-77.6). Token gửi trong body chứ không gửi trong URL của API, để không ghi vào log truy cập.

## 8. Đặt lại mật khẩu

`POST /v1/auth/password/reset` với body `{ token, password }`.

1. Body sai schema: trả **400** `VALIDATION_FAILED`. Mật khẩu ngắn hơn 15 hoặc dài hơn 128 ký tự (BR-73.1) báo ở đây: `errors` có `password` với `TOO_SHORT` hoặc `TOO_LONG`.
2. Link không dùng được: trả **410** `RESET_LINK_INVALID`.
3. Mật khẩu nằm trong danh sách phổ biến (BR-73.3): trả **400** `VALIDATION_FAILED`, `errors` có `password` với `TOO_COMMON`.
4. Làm các việc sau trong **một transaction**:
   - lưu hash mới;
   - đánh dấu link đã dùng;
   - thu hồi mọi phiên của tài khoản;
   - xóa `login_throttles` của email;
   - tạo phiên mới với `remember = false` (BR-77.5).
5. Trả về giống đăng nhập: `{ user, redirectTo }`. `redirectTo` ưu tiên cơ sở dùng gần nhất.

Mọi lỗi mật khẩu ở bước 1 và 3 giữ link dùng được, nên người dùng sửa rồi gửi lại với cùng link. Hai request cùng lúc với một link thì chỉ một request qua bước 4, request kia nhận 410.

## 9 đến 11. Quản trị nền tảng

Giống đăng nhập, phiên và đăng xuất của nhân sự, chỉ khác những điểm sau:

- Có route riêng `/v1/platform/auth/*`, dùng cookie `__Host-sapio_admin` (T-18).
- Không có trường `remember`. Phiên hết sau 2 giờ không thao tác: mỗi request đều cập nhật hạn, cũng chỉ ghi DB khi đã cũ hơn 5 phút (BR-76.11).
- Chỉ tài khoản `is_platform_admin` vào được. Tài khoản khác đăng nhập ở đây bị tính là sai (BR-76.1).
- Dùng chung bộ đếm sai với cửa nhân sự (BR-76.2).
- Trả về `{ user }`, không có `redirectTo`: đăng nhập xong luôn về `/` của `admin.sapio.vn`.

## Thử trong Scalar

Scalar (`http://localhost:4000/docs`) có sẵn các ca thử có tên cho mỗi endpoint: chọn trong danh sách ví dụ của request, hoặc của phản hồi từng status. Mọi tài khoản mẫu có mật khẩu `123456`. Dữ liệu mẫu tạo bằng `pnpm --filter @datn/api db:seed`; thêm `-- --reset` để xóa dữ liệu mẫu (kể cả phiên và bộ đếm sai) rồi tạo lại. Danh sách ca nằm ở `apps/api/src/openapi/examples/auth.ts`, và một test chạy từng ca trên dữ liệu mẫu để kiểm kết quả ghi dưới đây.

Ca nào làm đổi dữ liệu thì chạy lại cho kết quả khác: "Sai lần thứ 3" tăng bộ đếm của `sapkhoa@tocmay.vn`, nên lần chạy sau đã là lần thứ 4. `--reset` đưa bộ đếm về như ban đầu. Ca "Thành công" của #8 dùng hết link còn hạn và đổi mật khẩu của `datlai@tocmay.vn`: chạy lại `db:seed` đưa cả hai về như ban đầu.

### Đăng nhập nhân sự (#1, `POST /v1/auth/login`)

| Ca | Email | Kết quả |
|---|---|---|
| Chủ một cơ sở | `chinh@tocmay.vn` | 200, `redirectTo` là `/app/toc-may/calendar` |
| Kỹ thuật viên | `mai@tocmay.vn` | 200, `redirectTo` là `/app/toc-may/my/schedule` |
| Nhiều cơ sở | `linh.pham@email.vn` | 200, `redirectTo` là `/select-workspace` |
| Chưa thuộc cơ sở nào | `moi@email.vn` | 200, `redirectTo` là `/select-workspace` |
| Cơ sở bị khóa | `chu@toccu.vn` (chủ `toc-cu`, cơ sở đã bị khóa) | 200, `redirectTo` là `/select-workspace` |
| Sai mật khẩu | `chinh@tocmay.vn` với `sai-mat-khau` | 401 `INVALID_CREDENTIALS` |
| Sai lần thứ 3 | `sapkhoa@tocmay.vn` (đã sai 2 lần) với `sai-mat-khau` | 401 `INVALID_CREDENTIALS`, `remainingAttempts` là 2 |
| Đang bị khóa | `dakhoa@tocmay.vn` (khóa tới một năm sau, để còn khóa khi thử) | 423 `LOGIN_LOCKED`, có `lockedUntil` |
| Email không tồn tại | `khongco@email.vn` với `sai-mat-khau` | 401 `INVALID_CREDENTIALS`, thân giống ca "Sai mật khẩu" (trừ `requestId`) |
| Quản trị vào nhầm cửa | `quantri@sapio.vn` | 401 `INVALID_CREDENTIALS` |
| Email sai dạng | `abc` | 400 `VALIDATION_FAILED`, `errors[0]` là `email` `INVALID_EMAIL` |
| Mật khẩu trống | `chinh@tocmay.vn` với mật khẩu `""` | 400 `VALIDATION_FAILED`, `errors[0]` là `password` `REQUIRED` |

### Đăng nhập quản trị nền tảng (#9, `POST /v1/platform/auth/login`)

| Ca | Email | Kết quả |
|---|---|---|
| Quản trị đăng nhập đúng | `quantri@sapio.vn` | 200, `{ user }` |
| Sai mật khẩu | `quantri@sapio.vn` với `sai-mat-khau` | 401 `INVALID_CREDENTIALS` |
| Nhân sự vào nhầm cửa | `chinh@tocmay.vn` | 401 `INVALID_CREDENTIALS` |

### Vào một cơ sở (#5, `POST /v1/auth/workspaces/{slug}/enter`)

Cần đăng nhập trước bằng tài khoản ghi ở cột "Đăng nhập là" (Scalar giữ cookie phiên).

| Ca | Đăng nhập là | `slug` | Kết quả |
|---|---|---|---|
| Cơ sở của mình | `chinh@tocmay.vn` | `toc-may` | 200, `redirectTo` là `/app/toc-may/calendar` |
| Cơ sở của người khác | `chinh@tocmay.vn` | `nail-ha-vy` | 404 `NOT_FOUND` |
| Cơ sở bị khóa | `chu@toccu.vn` | `toc-cu` | 200, `redirectTo` là `/app/toc-cu/calendar` (khung ứng dụng hiện trang báo khóa) |

### Quên mật khẩu (#6, `POST /v1/auth/password/forgot`)

Email gửi đi xem ở Mailpit (`http://localhost:8025`). Gọi lại với cùng email trong 60 giây thì vẫn 202 và không có email nào mới (BR-77.3).

| Ca | Email | Kết quả |
|---|---|---|
| Có tài khoản | `chinh@tocmay.vn` | 202, một email đặt lại trong Mailpit |
| Không có tài khoản | `khongco@email.vn` | 202, cùng phản hồi, không có email |
| Quản trị nền tảng | `quantri@sapio.vn` | 202, cùng phản hồi, không có email |

### Kiểm link đặt lại (#7, `POST /v1/auth/password/reset/check`)

Tài khoản `datlai@tocmay.vn` (quản lý của `toc-may`) có ba link với token cố định. Link còn hạn có hạn một năm, để còn dùng được khi thử lại sau.

| Ca | `token` | Kết quả |
|---|---|---|
| Link còn hạn | `mau-link-con-han` | 200, `email` là `datlai@tocmay.vn` |
| Link đã hết hạn | `mau-link-het-han` | 410 `RESET_LINK_INVALID` |
| Link đã dùng | `mau-link-da-dung` | 410 `RESET_LINK_INVALID` |
| Link hỏng | `link-khong-ton-tai` | 410 `RESET_LINK_INVALID`, thân giống ca "Link đã hết hạn" (trừ `requestId`) |

### Đặt lại mật khẩu (#8, `POST /v1/auth/password/reset`)

| Ca | `token` | `password` | Kết quả |
|---|---|---|---|
| Thành công | `mau-link-con-han` | `mot cau mat khau moi de nho` | 200, `redirectTo` là `/app/toc-may/calendar` |
| Mật khẩu ngắn | `mau-link-con-han` | `ngan` | 400 `VALIDATION_FAILED`, `errors[0]` là `password` `TOO_SHORT` |
| Mật khẩu phổ biến | `mau-link-con-han` | `1q2w3e4r5t6y7u8i9o0p` | 400 `VALIDATION_FAILED`, `errors[0]` là `password` `TOO_COMMON` |
| Link đã dùng | `mau-link-da-dung` | `mot cau mat khau moi de nho` | 410 `RESET_LINK_INVALID` |
| Link hỏng | `link-khong-ton-tai` | `mot cau mat khau moi de nho` | 410 `RESET_LINK_INVALID`, thân giống ca "Link đã dùng" (trừ `requestId`) |

### Phiên (#3, #11)

Chỉ có ví dụ phản hồi: 200 khi đang đăng nhập, 401 `UNAUTHENTICATED` khi phiên hết hạn hoặc đã đăng xuất.
