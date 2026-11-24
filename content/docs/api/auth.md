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
| 8 | `POST /v1/auth/password/reset` | Công khai | 200, đặt cookie | `RESET_LINK_INVALID`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_TOO_COMMON` | BR-73, BR-77 |
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
  "destination": { "kind": "workspace", "slug": "toc-may", "path": "/app/toc-may/calendar" }
}
```

`destination.kind` là `workspace` (có `slug`, `path`) hoặc `select-workspace` (không có trường thêm).

| Status | `code` | Trường thêm | Câu hiển thị (MH-03) |
|---|---|---|---|
| 401 | `INVALID_CREDENTIALS` | `remainingAttempts?` (2 hoặc 1) | "Email hoặc mật khẩu chưa đúng." / "… Còn {n} lần thử, sau đó tạm khóa 15 phút." |
| 423 | `LOGIN_LOCKED` | `lockedUntil` | "Tạm khóa đăng nhập tới {giờ}." |

## 2. Đăng xuất

`POST /v1/auth/logout`. Đặt `revoked_at` cho phiên của cookie, rồi xóa cookie. Không có phiên vẫn trả 204, để bấm hai lần không báo lỗi.

## 3. Phiên hiện tại

`GET /v1/auth/session`. Trả về `{ user, remember, expiresAt }`. Phiên có `remember` thì mỗi lần gọi API được tính là một lần dùng: cập nhật `last_used_at`, `expires_at` và `Max-Age` của cookie. Để đỡ ghi DB, chỉ cập nhật khi `last_used_at` đã cũ hơn 5 phút (BR-76.10).

## 4. Danh sách cơ sở

`GET /v1/auth/workspaces`. Dùng cho Chọn cơ sở (MH-06). Đọc qua hàm `memberships_of(user_id)` (`SECURITY DEFINER`, ERD).

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

`POST /v1/auth/workspaces/{slug}/enter`. Ghi `users.last_tenant_id` rồi trả về `{ path }`. Tài khoản không có membership ở cơ sở này thì trả **404** `NOT_FOUND`, không phải 403, để không lộ slug có tồn tại.

## 6. Quên mật khẩu

`POST /v1/auth/password/forgot` với body `{ email }`. Luôn trả **202** với body rỗng (BR-77.1).

Máy chủ chỉ gửi email khi đủ cả ba điều kiện:
- có tài khoản;
- không phải tài khoản quản trị nền tảng;
- link gần nhất đã tạo cách đây ít nhất 60 giây.

Khi gửi: đánh dấu `replaced_at` cho các link cũ còn hiệu lực, tạo link mới hạn 30 phút, đưa email vào hàng đợi (BR-77.2, 77.3). Link có dạng `{WEB_ORIGIN}/reset-password?token=…`.

## 7. Kiểm link đặt lại

`POST /v1/auth/password/reset/check` với body `{ token }`. Link còn dùng được thì trả 200 `{ email }`, để màn đặt lại hiện email đang đặt. Link đã dùng, hết hạn hoặc đã bị thay thì trả **410** `RESET_LINK_INVALID` (BR-77.6). Token gửi trong body chứ không gửi trong URL của API, để không ghi vào log truy cập.

## 8. Đặt lại mật khẩu

`POST /v1/auth/password/reset` với body `{ token, password }`.

1. Link không dùng được: trả **410** `RESET_LINK_INVALID`.
2. Mật khẩu sai BR-73: trả **422** `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG` hoặc `PASSWORD_TOO_COMMON`. Link vẫn còn dùng được.
3. Làm các việc sau trong **một transaction**:
   - lưu hash mới;
   - đánh dấu link đã dùng;
   - thu hồi mọi phiên của tài khoản;
   - xóa `login_throttles` của email;
   - tạo phiên mới với `remember = false` (BR-77.5).
4. Trả về giống đăng nhập: `{ user, destination }`. `destination` ưu tiên cơ sở dùng gần nhất.

## 9 đến 11. Quản trị nền tảng

Giống đăng nhập, phiên và đăng xuất của nhân sự, chỉ khác những điểm sau:

- Có route riêng `/v1/platform/auth/*`, dùng cookie `__Host-sapio_admin` (T-18).
- Không có trường `remember`. Phiên hết sau 2 giờ không thao tác: mỗi request đều cập nhật hạn, cũng chỉ ghi DB khi đã cũ hơn 5 phút (BR-76.11).
- Chỉ tài khoản `is_platform_admin` vào được. Tài khoản khác đăng nhập ở đây bị tính là sai (BR-76.1).
- Dùng chung bộ đếm sai với cửa nhân sự (BR-76.2).
- Trả về `{ user }`, không có `destination`.
