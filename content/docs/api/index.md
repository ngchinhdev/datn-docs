---
title: Quy ước API
description: Địa chỉ, xác thực, định dạng lỗi và cách đọc các trang API.
---

## Nguồn của tài liệu API

- **Schema** (tham số, body, kiểu trả về) sinh từ code: NestJS cùng schema Zod trong `packages/shared`, xuất ra `openapi.json`. Không viết tay schema ở đây.
- Khi chạy `apps/api`, giao diện **Scalar** ở `http://localhost:4000/docs` cho gọi thử từng endpoint (T-19).
- Các trang trong mục API này viết phần code không tự nói ra được: quyền, lỗi nghiệp vụ, quy tắc nghiệp vụ, thứ tự xử lý. Bảng tham chiếu đầy đủ từng endpoint (đường dẫn, tham số, thân yêu cầu, phản hồi) nằm ở nhóm [Tham chiếu](./reference/index.md), sinh từ `openapi.json` (T-19).

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
- Request đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) được kiểm nguồn gốc theo thứ tự:
  1. Có `Sec-Fetch-Site`: nhận `same-origin` và `none`, từ chối giá trị khác.
  2. Không có `Sec-Fetch-Site`, có `Origin`: nhận khi `Origin` cùng host với request hoặc thuộc danh sách tin cậy; không thì từ chối.
  3. Không có cả hai header: **cho qua**.
  Từ chối trả 403 `ORIGIN_NOT_ALLOWED`. Trình duyệt luôn gửi ít nhất một trong hai header khi trang web gọi tới, nên request thiếu cả hai đến từ client không phải trình duyệt (Server Component, curl, Scalar, test), không phải từ trang của kẻ tấn công.
- Route của một cơ sở có slug trong đường dẫn (`/v1/tenants/{slug}/...`). Máy chủ kiểm membership rồi mới đặt `app.tenant_id` cho RLS (T-07, T-15).

## Lỗi

Mọi lỗi theo Problem Details (RFC 9457), `Content-Type: application/problem+json`. Thân lỗi không có `type`, `title` và `instance`:

```json
{
  "status": 400,
  "code": "VALIDATION_FAILED",
  "detail": "Thông tin chưa hợp lệ.",
  "errors": [{ "field": "password", "code": "REQUIRED", "message": "Nhập mật khẩu." }],
  "requestId": "0193a5c2-7e4b-7d2a-9c1e-5b8f3a6d2e10"
}
```

| Trường | Có khi | Nghĩa |
|---|---|---|
| `status` | Luôn | Mã HTTP, từ 400 đến 599 |
| `code` | Luôn, kể cả lỗi 500 | Mã lỗi nghiệp vụ, viết `UPPER_SNAKE_CASE`, **không đổi** sau khi đã dùng. Giao diện chọn cách xử lý theo `code` |
| `detail` | Luôn | Một câu tiếng Việt cố định theo `code`, giao diện hiện thẳng được. Không chứa giá trị thay đổi: giá trị đó nằm ở trường thêm |
| `errors` | Chỉ với 400 `VALIDATION_FAILED` | Mỗi lỗi một trường, xem dưới |
| `requestId` | Luôn | UUIDv7 của request, bằng header `X-Request-Id`. Giao diện hiện nó làm mã tra cứu khi gặp lỗi máy chủ (BR-79) |
| Trường thêm | Tùy `code` | Như `remainingAttempts`, `lockedUntil`; ghi trong trang của từng endpoint |

Mỗi phần tử của `errors`:

| Trường | Nghĩa |
|---|---|
| `field` | Tên trường, nối bằng dấu chấm: `email`, `items.0.serviceId`. Lỗi của cả body có `field` là `body` |
| `code` | Mã theo trường, bảng dưới |
| `message` | Câu tiếng Việt cho trường đó, giao diện hiện dưới ô nhập |

Mã theo trường:

| `code` | Khi |
|---|---|
| `REQUIRED` | Thiếu trường, giá trị `null`, hoặc chuỗi rỗng ở trường bắt buộc có giá trị |
| `INVALID_EMAIL` | Sai định dạng email |
| `TOO_SHORT` | Ngắn hơn mức tối thiểu (trừ trường hợp `REQUIRED`) |
| `TOO_LONG` | Dài hơn mức tối đa |
| `TOO_COMMON` | Mật khẩu nằm trong danh sách mật khẩu phổ biến (BR-73.3) |
| `INVALID_VALUE` | Mọi lỗi còn lại: sai kiểu, sai dạng, ngoài danh sách cho phép |

Câu `detail` của từng `code` và câu `message` của từng mã theo trường (kể cả câu riêng của trường `email`, `password`) nằm ở `packages/shared/src/errors.ts`. API và web dùng chung file đó.

Header `X-Request-Id` có ở mọi phản hồi, kể cả 2xx. Máy chủ tự sinh cho mỗi request và bỏ qua giá trị client gửi. Log lỗi 5xx ghi kèm `requestId`.

Lỗi dùng chung:

| Status | `code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body hoặc tham số sai schema, hoặc body không đọc được |
| 401 | `UNAUTHENTICATED` | Không có phiên, hoặc phiên đã hết hạn hay bị thu hồi |
| 403 | `FORBIDDEN` | Có phiên nhưng không có quyền |
| 403 | `ORIGIN_NOT_ALLOWED` | Header `Origin` không thuộc danh sách tin cậy |
| 404 | `NOT_FOUND` | Không có tài nguyên, hoặc không thuộc cơ sở của phiên |
| 410 | `RESET_LINK_INVALID` | Link đặt lại mật khẩu đã dùng, hết hạn, đã bị thay hoặc không có. Câu `detail`: "Link không còn dùng được." |
| 429 | `RATE_LIMITED` | Gọi quá nhiều lần. Có header `Retry-After` (giây) |
| 500 | `INTERNAL_ERROR` | Lỗi máy chủ. Thân lỗi không chứa chi tiết nào của lỗi |

## Thời gian, tiền, ID

- Thời gian là chuỗi ISO 8601 UTC, ví dụ `2026-11-24T03:15:00.000Z`. Giao diện đổi sang giờ của chi nhánh.
- Tiền là số nguyên VND.
- ID là UUIDv7.

## Các nhóm API

| Nhóm | Trang |
|---|---|
| Xác thực nhân sự và quản trị nền tảng | [Xác thực](./auth.md) |
