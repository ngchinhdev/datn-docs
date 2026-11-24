---
title: Quy ước API
description: Địa chỉ, xác thực, định dạng lỗi và cách đọc các trang API.
---

## Nguồn của tài liệu API

- **Schema** (tham số, body, kiểu trả về) sinh từ code: NestJS cùng schema Zod trong `packages/shared`, xuất ra `openapi.json`. Không viết tay schema ở đây.
- Khi chạy `apps/api`, giao diện **Scalar** ở `http://localhost:4000/docs` cho gọi thử từng endpoint (T-19).
- Các trang trong mục API này viết phần code không tự nói ra được: quyền, lỗi nghiệp vụ, quy tắc nghiệp vụ, thứ tự xử lý. Bảng tham chiếu đầy đủ sinh từ `openapi.json` bằng fumadocs-openapi (T-19).

## Địa chỉ

| Môi trường | Trình duyệt gọi | API thật |
|---|---|---|
| Dev | `http://localhost:3000/api/v1/...` | `http://localhost:4000/v1/...` |
| Triển khai | `https://sapio.vn/api/v1/...`, `https://admin.sapio.vn/api/v1/...` | `api.sapio.vn/v1/...` |

Trình duyệt chỉ gọi `/api/*` **cùng origin** với trang. Next.js chuyển tiếp sang API (T-20), nên cookie phiên thuộc về tên miền của trang và không cần CORS.

## Xác thực

| Ai | Cách | Cookie |
|---|---|---|
| Nhân sự | Phiên, sau `POST /v1/auth/login` | `__Host-sapio_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, không có `Domain` |
| Quản trị nền tảng | Phiên, sau `POST /v1/platform/auth/login` | `__Host-sapio_admin`: như trên nhưng `SameSite=Strict` |
| Khách của cơ sở | Phiên sau mã email (BR-16) | `__Host-sapio_customer`, chỉ trên tên miền con của cơ sở |

- Token phiên là 32 byte ngẫu nhiên. Máy chủ chỉ lưu SHA-256 của token (T-08).
- Request đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) phải có header `Origin` thuộc danh sách tin cậy. Sai thì trả 403 `ORIGIN_NOT_ALLOWED`.
- Route của một cơ sở có slug trong đường dẫn (`/v1/tenants/{slug}/...`). Máy chủ kiểm membership rồi mới đặt `app.tenant_id` cho RLS (T-07, T-15).

## Lỗi

Mọi lỗi theo Problem Details (RFC 9457), `Content-Type: application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "code": "INVALID_CREDENTIALS",
  "detail": "Email hoặc mật khẩu chưa đúng.",
  "instance": "/v1/auth/login",
  "remainingAttempts": 2
}
```

- `code` là mã lỗi nghiệp vụ, viết `UPPER_SNAKE_CASE`, **không đổi** sau khi đã dùng. Giao diện chọn câu hiển thị theo `code`, không theo `detail`.
- Trường thêm (như `remainingAttempts`, `lockedUntil`) ghi trong trang của từng endpoint.
- Lỗi dùng chung:

| Status | `code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body hoặc tham số sai schema. `errors` là danh sách `{ path, message }` |
| 401 | `UNAUTHENTICATED` | Không có phiên, hoặc phiên đã hết hạn hay bị thu hồi |
| 403 | `FORBIDDEN` | Có phiên nhưng không có quyền |
| 403 | `ORIGIN_NOT_ALLOWED` | Header `Origin` không thuộc danh sách tin cậy |
| 404 | `NOT_FOUND` | Không có tài nguyên, hoặc không thuộc cơ sở của phiên |
| 429 | `RATE_LIMITED` | Gọi quá nhiều lần. Có header `Retry-After` (giây) |
| 500 | (không có) | Lỗi máy chủ. Giao diện hiện `instance` làm mã tra cứu (BR-79) |

## Thời gian, tiền, ID

- Thời gian là chuỗi ISO 8601 UTC, ví dụ `2026-11-24T03:15:00.000Z`. Giao diện đổi sang giờ của chi nhánh.
- Tiền là số nguyên VND.
- ID là UUIDv7.

## Các nhóm API

| Nhóm | Trang |
|---|---|
| Xác thực nhân sự và quản trị nền tảng | [Xác thực](./auth.md) |
