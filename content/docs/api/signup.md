---
title: Đăng ký cơ sở
description: Tạo tài khoản chưa xác thực, nhập và gửi lại mã xác thực, kiểm slug, tạo cơ sở dùng thử.
---

Nghiệp vụ ở [Đăng ký cơ sở](../features/signup.md). Quy ước chung (cookie, lỗi, `Origin`) ở [Quy ước API](./index.md).

## Danh sách

| # | Endpoint | Quyền | Thành công | Lỗi nghiệp vụ | Quy tắc |
|---|---|---|---|---|---|
| 1 | `POST /v1/signup/account` | Công khai | 201, đặt cookie | `EMAIL_TAKEN`, `CODE_LIMIT_REACHED` | BR-73, BR-74.9 đến 74.12 |
| 2 | `POST /v1/signup/verify` | Phiên chưa xác thực | 200 | `CODE_INVALID`, `CODE_EXPIRED`, `ALREADY_VERIFIED` | BR-74.1 đến 74.4, 74.7 |
| 3 | `POST /v1/signup/resend` | Phiên chưa xác thực | 202 | `ALREADY_VERIFIED`, `RESEND_TOO_SOON`, `CODE_LIMIT_REACHED` | BR-74.3, 74.5, 74.6 |
| 4 | `GET /v1/signup/slug` | Phiên đã xác thực | 200 | `EMAIL_NOT_VERIFIED` | BR-72 |
| 5 | `POST /v1/signup/business` | Phiên đã xác thực | 201 | `SLUG_TAKEN`, `TRIAL_USED`, `EMAIL_NOT_VERIFIED` | BR-74.15 đến 74.23, BR-80 |

Phiên ở đây là phiên cửa `staff` (BR-76.9), cùng cookie `__Host-sapio_session`. Phiên của tài khoản chưa xác thực chỉ dùng được ở #2, #3, [`GET /v1/auth/session`](./auth.md#3-phiên-hiện-tại) và [`POST /v1/auth/logout`](./auth.md#2-đăng-xuất); mọi endpoint khác của nhân sự trả **403** `EMAIL_NOT_VERIFIED` (BR-74.13). Kiểm slug (#4) cũng vậy.

## Giới hạn theo IP

`RATE_LIMITED`, có `Retry-After`:

| Endpoint | Tối đa mỗi phút |
|---|---|
| #1 | 10 |
| #2 | 20 |
| #3 | 10 |
| #4 | 30 |

Ngoài giới hạn theo IP, mã gửi đi còn bị giới hạn theo email (BR-74.5, BR-74.6) ở #1 và #3.

## 1. Tạo tài khoản

`POST /v1/signup/account`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `fullName` | string, 1 đến 100 | Có | Bỏ khoảng trắng hai đầu |
| `email` | string, email, tối đa 254 | Có | Chuẩn hóa: bỏ khoảng trắng hai đầu, chữ thường |
| `password` | string | Có | BR-73: 15 đến 128 ký tự, không nằm trong danh sách phổ biến |
| `acceptTerms` | boolean | Có | Phải là `true`. `false` báo `INVALID_VALUE` |

Xử lý, theo thứ tự:

1. Body sai schema: **400** `VALIDATION_FAILED`. Mật khẩu ngắn hơn 15 hoặc dài hơn 128 ký tự báo ở đây: `errors` có `password` với `TOO_SHORT` hoặc `TOO_LONG`.
2. Mật khẩu nằm trong danh sách phổ biến (BR-73.3): **400** `VALIDATION_FAILED`, `errors` có `password` với `TOO_COMMON`.
3. Tìm tài khoản theo email. Quyết định theo bảng dưới; mục "phiên" là phiên kèm theo request, chỉ phiên của tài khoản chưa xác thực có tác dụng.
4. Cần gửi mã mà email đã đủ 5 mã trong 60 phút qua (BR-74.6): **429** `CODE_LIMIT_REACHED`, không đổi gì. Bước này không áp hạn 60 giây của BR-74.5, vì đó là hạn của #3.
5. Làm các việc sau trong **một transaction**: tạo hoặc sửa tài khoản (hash mật khẩu bằng argon2id), thu hồi mọi phiên cũ của tài khoản đó, đánh dấu mọi mã cũ hết hiệu lực (BR-74.3), tạo mã mới (BR-74.1), tạo phiên `staff` với `remember = false`. Vi phạm khóa duy nhất của `users.email` (hai yêu cầu cùng lúc) trả **409** `EMAIL_TAKEN`.
6. Đưa email mã xác thực vào hàng đợi, không chờ gửi xong.

| Email | Phiên | Kết quả |
|---|---|---|
| Chưa có tài khoản | Không có | Tạo tài khoản chưa xác thực |
| Chưa có tài khoản | Của tài khoản A chưa xác thực | Đổi email của A, cập nhật tên và mật khẩu (BR-74.12) |
| Của tài khoản **đã xác thực** | Bất kỳ | **409** `EMAIL_TAKEN`. Không tạo phiên, không gửi mã, không đổi gì (BR-74.10) |
| Của tài khoản B chưa xác thực | Không có, hoặc của B | Đăng ký lại B: thay tên và mật khẩu (BR-74.11) |
| Của tài khoản B chưa xác thực | Của tài khoản A khác B | Đăng ký lại B. Phiên của A bị thu hồi; A giữ nguyên, chưa xác thực |

Trả về 201, kèm cookie phiên:

```json
{
  "user": { "id": "0193…", "email": "an@tiemcuaban.vn", "name": "Nguyễn Văn An" },
  "codeExpiresAt": "2026-11-27T03:25:00.000Z",
  "resendAt": "2026-11-27T03:16:00.000Z"
}
```

`codeExpiresAt` là lúc mã hết hạn (BR-74.2). `resendAt` là lúc #3 nhận yêu cầu tiếp theo (BR-74.5).

| Status | `code` | Câu hiển thị (MH-02) |
|---|---|---|
| 409 | `EMAIL_TAKEN` | "Email này đã có tài khoản Sapio." kèm link "Đăng nhập" |
| 429 | `CODE_LIMIT_REACHED` | "Đã gửi quá nhiều mã tới email này. Thử lại sau {n} phút." |

## 2. Nhập mã xác thực

`POST /v1/signup/verify`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `code` | string, đúng 6 chữ số | Có | Sai dạng báo `INVALID_VALUE` ở trường `code` |

Xử lý, theo thứ tự:

1. Body sai schema: **400** `VALIDATION_FAILED`.
2. Tài khoản đã xác thực: **409** `ALREADY_VERIFIED`.
3. Tìm mã mới nhất còn hiệu lực: chưa dùng, chưa bị hủy, chưa hết hạn. Không có thì **410** `CODE_EXPIRED`. Trường hợp này gộp mã hết hạn (BR-74.2), mã đã bị thay (BR-74.3), mã đã bị hủy sau 3 lần sai (BR-74.4) và chưa từng có mã.
4. So hash của `code` (so sánh thời gian không đổi). Sai thì tăng `attempts` bằng một câu `UPDATE ... SET attempts = attempts + 1 ... RETURNING`, để hai request cùng lúc không đếm thiếu:
   - `attempts` mới nhỏ hơn 3: **400** `CODE_INVALID` với `attemptsLeft` = 3 − `attempts`.
   - `attempts` mới bằng 3: hủy mã, **400** `CODE_INVALID` với `attemptsLeft = 0`.
5. Đúng: trong một transaction, đánh dấu mã đã dùng (`consumed_at`) và đặt `users.email_verified_at` (BR-74.7).

Trả về 200 `{ user }` như #1. Phiên hiện tại dùng tiếp, không tạo phiên mới.

| Status | `code` | Trường thêm | Câu hiển thị (MH-02) |
|---|---|---|---|
| 400 | `CODE_INVALID` | `attemptsLeft` (2, 1 hoặc 0) | "Mã chưa đúng. Còn {n} lần thử." / `attemptsLeft = 0`: "Bạn đã nhập sai quá số lần cho phép. Gửi mã mới để thử lại." |
| 410 | `CODE_EXPIRED` | | "Mã đã hết hạn hoặc đã bị hủy. Gửi mã mới." |
| 409 | `ALREADY_VERIFIED` | | Không hiện; giao diện sang bước 3 |

## 3. Gửi lại mã

`POST /v1/signup/resend`, không có body.

1. Tài khoản đã xác thực: **409** `ALREADY_VERIFIED`.
2. Mã gần nhất gửi cách đây chưa đủ 60 giây (BR-74.5): **429** `RESEND_TOO_SOON`, `Retry-After` là số giây còn chờ, làm tròn lên.
3. Email đã đủ 5 mã trong 60 phút qua (BR-74.6): **429** `CODE_LIMIT_REACHED`, `Retry-After` là số giây tới lúc mã cũ nhất trong 5 mã đó đủ 1 giờ.
4. Đánh dấu mọi mã cũ hết hiệu lực, tạo mã mới, đưa email vào hàng đợi (BR-74.3).

Trả về **202** với `{ codeExpiresAt, resendAt }` như #1.

| Status | `code` | Câu hiển thị (MH-02) |
|---|---|---|
| 429 | `RESEND_TOO_SOON` | Nút "Gửi lại mã sau {m:ss}", đếm ngược theo `Retry-After` |
| 429 | `CODE_LIMIT_REACHED` | "Đã gửi quá nhiều mã tới email này. Thử lại sau {n} phút." |

## 4. Kiểm slug

`GET /v1/signup/slug?value={slug}`

`value` bắt buộc, tối đa 64 ký tự; thiếu hoặc dài hơn thì **400** `VALIDATION_FAILED`. Không chuẩn hóa `value`.

Trả về 200:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `available` | boolean | `true` khi dùng được |
| `reason` | string | Chỉ có khi `available = false`: `INVALID_FORMAT` (độ dài, ký tự, gạch ngang theo BR-72), `RESERVED` (từ dành riêng), `TAKEN` (đang là slug của cơ sở, hoặc nằm trong `tenant_slug_history`) |

Thứ tự xét `reason`: `INVALID_FORMAT`, `RESERVED`, `TAKEN`. Kết quả chỉ để gợi ý khi rời ô slug: slug không được giữ chỗ, quyết định nằm ở #5 (BR-74.21).

## 5. Tạo cơ sở

`POST /v1/signup/business`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string, 1 đến 100 | Có | Tên cơ sở |
| `slug` | string, 3 đến 40 | Có | BR-72 |
| `branch.name` | string, 1 đến 100 | Có | Tên chi nhánh đầu tiên |
| `branch.phone` | string | Có | Số điện thoại Việt Nam, chuẩn hóa theo BR-61 trước khi lưu |
| `branch.address` | string, 1 đến 255 | Có | |
| `openingHours` | mảng, ít nhất 1 phần tử, tối đa 7 | Có | Mỗi phần tử một ngày mở; ngày không có phần tử là ngày nghỉ |
| `openingHours[].weekday` | integer, 0 đến 6 | Có | 0 là Chủ Nhật. Không trùng nhau trong mảng |
| `openingHours[].opens` | string `HH:mm` | Có | |
| `openingHours[].closes` | string `HH:mm` | Có | Sau `opens` |
| `resources.chairs` | integer, 0 đến 20 | Có | Số Ghế |
| `resources.beds` | integer, 0 đến 20 | Có | Số Giường |
| `resources.rooms` | integer, 0 đến 20 | Có | Số Phòng |

Xử lý, theo thứ tự:

1. Không có phiên: **401** `UNAUTHENTICATED`.
2. Body sai schema: **400** `VALIDATION_FAILED`. Một số `field`: `slug` (`REQUIRED`, `TOO_SHORT`, `TOO_LONG`, `INVALID_VALUE` cho ký tự không hợp lệ, gạch ngang ở hai đầu và từ dành riêng), `branch.phone` (`INVALID_VALUE`), `openingHours` (`INVALID_VALUE` khi rỗng), `openingHours.0.closes` (`INVALID_VALUE` khi không sau `opens`), `resources.chairs` (`INVALID_VALUE` khi ngoài 0 đến 20).
3. Email chưa xác thực: **403** `EMAIL_NOT_VERIFIED` (BR-74.15).
4. Làm các việc sau trong **một transaction**:
   1. Khóa dòng `users` của phiên (`SELECT ... FOR UPDATE`) rồi đọc lại `email_verified_at`. Hai request cùng một tài khoản xếp hàng ở đây.
   2. Email của tài khoản đã có dòng `trial_claims` (khóa chính là email): **409** `TRIAL_USED` (BR-74.19).
   3. Slug có trong `tenants` hoặc `tenant_slug_history`: **409** `SLUG_TAKEN` (BR-74.21).
   4. Tạo các dòng của BR-74.20; đặt `app.tenant_id` bằng id cơ sở mới cho các bảng có RLS (T-07). `trial_ends_at` tính theo BR-74.23 từ `Clock`.
   5. Đặt `users.last_tenant_id` (BR-74.22).
5. Vi phạm khóa duy nhất của `tenants.slug` ở bước 4.4 (hai tài khoản khác nhau cùng lúc): hủy transaction, trả **409** `SLUG_TAKEN`. Vi phạm khóa chính của `trial_claims` ở bước 4.4: hủy transaction, trả **409** `TRIAL_USED`. Không trả 500.

Trả về 201:

```json
{
  "slug": "toc-may",
  "trialEndsAt": "2026-11-16T17:00:00.000Z",
  "redirectTo": "/app/toc-may/calendar"
}
```

`trialEndsAt` là `trial_ends_at` (BR-74.23); giao diện đổi sang giờ chi nhánh; ngày cuối dùng thử là ngày liền trước ngày (theo giờ chi nhánh) của `trialEndsAt`. `redirectTo` là trang đầu của cơ sở mới.

| Status | `code` | Câu hiển thị (MH-02) |
|---|---|---|
| 409 | `SLUG_TAKEN` | "Đã có cơ sở dùng địa chỉ này" |
| 409 | `TRIAL_USED` | "Tài khoản này đã tạo cơ sở dùng thử." kèm nút "Chọn cơ sở" |
| 403 | `EMAIL_NOT_VERIFIED` | Giao diện chuyển về bước 2 |

## Thử trong Scalar

Mọi tài khoản mẫu có mật khẩu `123456`. Email gửi đi xem ở Mailpit (`http://localhost:8025`). Dữ liệu mẫu có thêm tài khoản `chuaxacthuc@email.vn` (chưa xác thực, có mã còn hạn `123456`). Ca nào làm đổi dữ liệu thì chạy lại cho kết quả khác; `db:seed -- --reset` đưa về như ban đầu.

| Ca | Endpoint | Đăng nhập là | Đầu vào | Kết quả |
|---|---|---|---|---|
| Email mới | #1 | | `an.moi@email.vn` | 201, một email mã trong Mailpit |
| Email đã xác thực | #1 | | `chinh@tocmay.vn` | 409 `EMAIL_TAKEN` |
| Đăng ký lại | #1 | | `chuaxacthuc@email.vn` | 201 |
| Mã đúng | #2 | `chuaxacthuc@email.vn` | `123456` | 200 |
| Mã sai | #2 | `chuaxacthuc@email.vn` | `000000` | 400 `CODE_INVALID`, `attemptsLeft` là 2 |
| Gửi lại sớm | #3 | `chuaxacthuc@email.vn`, ngay sau #1 | | 429 `RESEND_TOO_SOON` |
| Slug còn trống | #4 | `moi@email.vn` | `quan-moi` | 200, `available` là `true` |
| Slug đã có | #4 | `moi@email.vn` | `toc-may` | 200, `reason` là `TAKEN` |
| Slug dành riêng | #4 | `moi@email.vn` | `signup` | 200, `reason` là `RESERVED` |
| Tạo cơ sở | #5 | `moi@email.vn` | Body ở mục 5 | 201 |
| Đã dùng thử | #5 | `chinh@tocmay.vn` | Body ở mục 5 | 409 `TRIAL_USED` |
| Chưa xác thực | #5 | `chuaxacthuc@email.vn` | Body ở mục 5 | 403 `EMAIL_NOT_VERIFIED` |
