---
title: Dịch vụ
description: Nhóm dịch vụ; danh sách, thêm, xem, lưu cả dịch vụ với biến thể, đoạn, dọn dẹp, giá chi nhánh; bật tắt đặt online; thứ tự; ngừng dùng và dùng lại.
---

Nghiệp vụ ở [Dịch vụ](../features/services.md). Quy ước chung (cookie, lỗi, `Origin`, guard theo cơ sở và vai trò) ở [Quy ước API](./index.md).

## Danh sách

Mọi endpoint có `{slug}` trong đường dẫn (`/v1/tenants/{slug}/...`) và chỉ **chủ cơ sở** (`owner`) gọi được (BR-94.1). Lễ tân, kỹ thuật viên, khách và chatbot đọc dịch vụ qua endpoint của tính năng dùng nó (API đặt lịch, giai đoạn 3); nhóm endpoint này giữ chỉ chủ cơ sở.

| # | Endpoint | Thành công | Lỗi nghiệp vụ | Quy tắc |
|---|---|---|---|---|
| 1 | `GET /v1/tenants/{slug}/service-groups` | 200 | | BR-94.3, 94.5, 94.7 |
| 2 | `POST /v1/tenants/{slug}/service-groups` | 201 | `NAME_TAKEN` | BR-94.3, 94.7 |
| 3 | `PATCH /v1/tenants/{slug}/service-groups/{groupId}` | 200 | `NAME_TAKEN` | BR-94.4 |
| 4 | `DELETE /v1/tenants/{slug}/service-groups/{groupId}` | 204 | `SERVICE_GROUP_IN_USE` | BR-94.6 |
| 5 | `PUT /v1/tenants/{slug}/service-groups/order` | 200 | `ORDER_MISMATCH` | BR-94.5 |
| 6 | `GET /v1/tenants/{slug}/services` | 200 | | BR-94.15 |
| 7 | `POST /v1/tenants/{slug}/services` | 201 | `NAME_TAKEN` | BR-94.8 đến 94.10 |
| 8 | `GET /v1/tenants/{slug}/services/{serviceId}` | 200 | | BR-94.30, 94.31 |
| 9 | `PUT /v1/tenants/{slug}/services/{serviceId}` | 200 | `SERVICE_ARCHIVED`, `NAME_TAKEN`, `BRANCH_ARCHIVED` | BR-94.8, 94.14, 94.16 đến 94.29 |
| 10 | `PATCH /v1/tenants/{slug}/services/{serviceId}` | 200 | `SERVICE_ARCHIVED` | BR-94.10, 94.14 |
| 11 | `POST /v1/tenants/{slug}/services/{serviceId}/archive` | 200 | `SERVICE_ARCHIVED` | BR-94.12 |
| 12 | `POST /v1/tenants/{slug}/services/{serviceId}/restore` | 200 | `SERVICE_NOT_ARCHIVED`, `NAME_TAKEN` | BR-94.13 |
| 13 | `PUT /v1/tenants/{slug}/services/order` | 200 | `ORDER_MISMATCH` | BR-94.11 |

Không có endpoint xóa dịch vụ (BR-94.12). `PUT .../services/order` khai báo trước `PUT .../services/{serviceId}`, để `order` không bị đọc thành `{serviceId}`.

## Thứ tự chung của mọi endpoint

1. Guard theo cơ sở và vai trò với `@Roles('owner')` ([Quy ước API](./index.md#quyền-theo-cơ-sở-và-vai-trò)): 401 `UNAUTHENTICATED`, 403 `EMAIL_NOT_VERIFIED`, 404 `NOT_FOUND`, 403 `FORBIDDEN`, 403 `TENANT_LOCKED`, 402 `SUBSCRIPTION_EXPIRED`.
2. Body hoặc tham số sai schema: 400 `VALIDATION_FAILED`. Schema của body không nhận trường lạ: trường thừa báo `INVALID_VALUE` ở chính trường đó.
3. Tìm đối tượng trong đường dẫn theo `tenant_id` (RLS, T-07): không có, hoặc thuộc cơ sở khác: 404 `NOT_FOUND`.
4. Các bước riêng của từng endpoint, ghi dưới đây. Việc ghi nằm trong một transaction qua `withTenant()`. Vi phạm ràng buộc duy nhất hoặc khóa ngoại của DB (hai yêu cầu cùng lúc) trả đúng mã nghiệp vụ của ràng buộc đó, không trả 500.

## Giới hạn theo phiên

Cùng hạn mức với [Chi nhánh và tài nguyên](./branch-settings.md#giới-hạn-theo-phiên): 300 `GET` và 60 yêu cầu ghi mỗi phút, `RATE_LIMITED` kèm `Retry-After`.

## Mã lỗi của nhóm này

| Status | `code` | Trường thêm | Khi nào |
|---|---|---|---|
| 409 | `NAME_TAKEN` | | Tên nhóm hoặc tên dịch vụ trùng (BR-94.3, 94.7, 94.8, 94.13) |
| 409 | `ORDER_MISMATCH` | | Danh sách `ids` không đúng bằng tập cần sắp (nhóm của cơ sở; dịch vụ đang dùng của một nhóm) |
| 409 | `SERVICE_GROUP_IN_USE` | `count` | Xóa nhóm còn dịch vụ đang dùng |
| 409 | `SERVICE_ARCHIVED` | | Sửa, đổi "Nhận đặt online" hoặc ngừng dùng dịch vụ đã ngừng dùng |
| 409 | `SERVICE_NOT_ARCHIVED` | | Dùng lại dịch vụ đang dùng |
| 409 | `BRANCH_ARCHIVED` | | Đặt giá cho chi nhánh đã ngừng dùng ([#9](#9-lưu-cả-dịch-vụ)) |
| 409 | `RESOURCE_TYPE_IN_USE` | | Xóa loại tài nguyên đang được đoạn hoặc dọn dẹp của biến thể nào chiếm (BR-94.32), ở [#9 của Chi nhánh và tài nguyên](./branch-settings.md#9-xóa-loại-tài-nguyên) |

## Hình dạng dùng chung

Nhóm dịch vụ:

```json
{ "id": "0193…", "name": "Nhuộm và uốn", "sort": 3, "serviceCount": 1, "archivedServiceCount": 0 }
```

`serviceCount` đếm dịch vụ đang dùng, `archivedServiceCount` đếm dịch vụ đã ngừng dùng của nhóm.

Một dòng của danh sách dịch vụ:

```json
{
  "id": "0193…",
  "name": "Nhuộm tóc",
  "groupId": "0193…",
  "bookableOnline": true,
  "archivedAt": null,
  "sort": 1,
  "variantCount": 2,
  "visibleMinutes": { "min": 105, "max": 120 },
  "priceFromVnd": 500000
}
```

`groupId` là `null` với dịch vụ không nhóm. `visibleMinutes` là độ dài phần khách thấy ngắn nhất và dài nhất của các biến thể (BR-51). `priceFromVnd` là giá gốc thấp nhất của các biến thể.

Chi tiết dịch vụ (đọc ở #8, trả về ở #7 và #9):

```json
{
  "id": "0193…",
  "name": "Nhuộm tóc",
  "groupId": "0193…",
  "description": "Nhuộm một màu, đã gồm gội và sấy. Thợ tư vấn màu trước khi làm.",
  "bookableOnline": true,
  "archivedAt": null,
  "updatedAt": "2026-11-28T03:15:00.000Z",
  "upcomingAppointments": 0,
  "variants": [
    {
      "id": "0193…",
      "name": "Tóc ngắn",
      "shortName": "Nhuộm ngắn",
      "priceVnd": 500000,
      "visibleMinutes": 105,
      "segments": [
        { "kind": "prep", "label": "Pha thuốc", "minutes": 15, "resourceTypeIds": ["0193…"] },
        { "kind": "work", "label": "Bôi thuốc", "minutes": 30, "resourceTypeIds": ["0193…", "0193…"] },
        { "kind": "wait", "label": "Chờ lên màu", "minutes": 45, "resourceTypeIds": ["0193…"] },
        { "kind": "work", "label": "Xả thuốc, gội", "minutes": 15, "resourceTypeIds": ["0193…", "0193…"] },
        { "kind": "work", "label": "Sấy, tạo kiểu", "minutes": 15, "resourceTypeIds": ["0193…", "0193…"] }
      ],
      "cleanups": [{ "resourceTypeId": "0193…", "minutes": 10 }],
      "branchPrices": [{ "branchId": "0193…", "priceVnd": 520000 }]
    }
  ],
  "branches": [{ "id": "0193…", "name": "Tóc Mây Quận 3", "resourceTypeIds": ["0193…", "0193…", "0193…"] }]
}
```

- `description` là chuỗi, rỗng khi không có. `variants` theo thứ tự hiện cho khách (BR-94.20), không gồm biến thể đã ẩn. `segments` theo thứ tự đoạn; `kind` là `prep`, `work` hoặc `wait`.
- `cleanups` chỉ gồm loại có dọn dẹp. `branchPrices` chỉ gồm chi nhánh đang dùng có giá riêng (BR-94.29).
- `branches` là các chi nhánh đang dùng; `resourceTypeIds` là mọi loại (kể cả loại nhân viên) có ít nhất một tài nguyên đang dùng ở chi nhánh đó. Giao diện đối chiếu với đoạn của bản nháp để cảnh báo (BR-94.30).
- `upcomingAppointments` là số lịch sắp tới dùng dịch vụ; **áp dụng khi có lịch hẹn**, trước đó luôn 0 (BR-94.31).
- Giá không có trường `depositVnd`: đặt cọc làm ở giai đoạn 4. Giá theo cấp nhân viên chưa có trường nào: làm cùng Nhân sự.
- Tiền là số nguyên VND, tối đa 100.000.000, nên nằm trong dải số an toàn của JSON.

## 1. Danh sách nhóm dịch vụ

`GET /v1/tenants/{slug}/service-groups`

Trả về 200 `{ "items": [...] }`, mỗi phần tử như [Nhóm dịch vụ](#hình-dạng-dùng-chung), sắp theo `sort` rồi `created_at`. Không có dòng "Khác" (BR-94.7).

## 2. Thêm nhóm dịch vụ

`POST /v1/tenants/{slug}/service-groups`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string, 1 đến 60 | Có | Bỏ khoảng trắng hai đầu và khoảng trắng thừa ở giữa |

Tên trùng nhóm khác (không phân biệt hoa thường), hoặc là "Khác": **409** `NAME_TAKEN`. Vi phạm chỉ mục duy nhất `(tenant_id, lower(name))` cũng trả mã này. Nhóm mới có `sort` bằng lớn nhất cộng 1. Trả về 201 với một phần tử như [Nhóm dịch vụ](#hình-dạng-dùng-chung).

| Status | `code` | Câu hiển thị (MH-44) |
|---|---|---|
| 409 | `NAME_TAKEN` | "Đã có nhóm tên này." |

## 3. Đổi tên nhóm dịch vụ

`PATCH /v1/tenants/{slug}/service-groups/{groupId}`, body `{ "name": "..." }` như [#2](#2-thêm-nhóm-dịch-vụ).

Tên trùng nhóm khác hoặc là "Khác": **409** `NAME_TAKEN`. Giữ nguyên tên và chỉ đổi hoa thường không phải trùng. Trả về 200 với một phần tử như [Nhóm dịch vụ](#hình-dạng-dùng-chung).

## 4. Xóa nhóm dịch vụ

`DELETE /v1/tenants/{slug}/service-groups/{groupId}`

1. Khóa dòng nhóm (`SELECT ... FOR UPDATE`). Chờ các yêu cầu đang gán dịch vụ vào nhóm này, vì khóa ngoại giữ khóa dòng đó tới khi chúng xong.
2. Đếm dịch vụ đang dùng của nhóm. Còn: **409** `SERVICE_GROUP_IN_USE` với `count`.
3. Đặt `group_id` của dịch vụ đã ngừng dùng thuộc nhóm về rỗng, rồi xóa dòng nhóm.

Trả về 204.

| Status | `code` | Câu hiển thị (MH-44) |
|---|---|---|
| 409 | `SERVICE_GROUP_IN_USE` | "Còn {count} dịch vụ đang dùng trong nhóm này nên không xóa được." |

## 5. Đổi thứ tự nhóm dịch vụ

`PUT /v1/tenants/{slug}/service-groups/order`, body `{ "ids": [...] }`.

Khóa các dòng nhóm (`SELECT ... FOR UPDATE`). `ids` không đúng bằng tập mọi nhóm của cơ sở (thiếu, thừa, trùng, hoặc id của cơ sở khác): **409** `ORDER_MISMATCH`. Đặt `sort` là 1, 2, 3... theo `ids`. Trả về 200 `{ "ids": [...] }` là thứ tự vừa lưu.

| Status | `code` | Câu hiển thị (MH-44) |
|---|---|---|
| 409 | `ORDER_MISMATCH` | Tải lại danh sách; hộp thông báo "Danh sách vừa đổi, hãy thử lại." |

## 6. Danh sách dịch vụ

`GET /v1/tenants/{slug}/services?groupId=&status=active|archived|all&q=`

| Tham số | Ghi chú |
|---|---|
| `groupId` | uuid của một nhóm, hoặc `none` là dịch vụ không nhóm; bỏ trống là tất cả |
| `status` | Mặc định `active` |
| `q` | Tối đa 80 ký tự; tên dịch vụ chứa chuỗi, không phân biệt hoa thường và dấu; bỏ trống là tất cả |

Trả về 200 `{ "items": [...] }`, mỗi phần tử như [Một dòng của danh sách](#hình-dạng-dùng-chung). Sắp theo `sort` của nhóm, rồi `sort` của dịch vụ, rồi `created_at`; dịch vụ không nhóm ở cuối (BR-94.15). `groupId` không thuộc cơ sở: 404 `NOT_FOUND`.

## 7. Thêm dịch vụ

`POST /v1/tenants/{slug}/services`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string, 1 đến 80 | Có | Chuẩn hóa như tên nhóm |
| `groupId` | uuid hoặc `null` | Có | `null` là không nhóm |
| `variant.name` | string, 1 đến 40 | Có | Tên biến thể đầu |
| `variant.priceVnd` | integer, 0 đến 100.000.000 | Có | Bội của 1.000 |
| `variant.minutes` | integer, 5 đến 480 | Có | Bội của 5; độ dài đoạn Làm duy nhất |

Xử lý, sau các bước chung:

1. `groupId` không thuộc cơ sở: **404** `NOT_FOUND`.
2. Tên trùng dịch vụ đang dùng khác (không phân biệt hoa thường): **409** `NAME_TAKEN`. Vi phạm chỉ mục duy nhất `(tenant_id, lower(name))` của dịch vụ đang dùng cũng trả mã này.
3. Tạo dịch vụ với `bookableOnline = false`, `sort` bằng lớn nhất của nhóm cộng 1, và một biến thể: `shortName` là `name` (tên dịch vụ) cắt còn 20 ký tự, bỏ khoảng trắng thừa ở cuối; một đoạn `work` tên "Làm", `minutes` như trên, chiếm loại nhân viên của cơ sở; không dọn dẹp, không giá chi nhánh (BR-94.9).

Trả về 201 với [Chi tiết dịch vụ](#hình-dạng-dùng-chung).

| Status | `code` | Câu hiển thị (MH-44) |
|---|---|---|
| 409 | `NAME_TAKEN` | Dưới ô tên: "Đã có dịch vụ tên này." |

## 8. Chi tiết dịch vụ

`GET /v1/tenants/{slug}/services/{serviceId}`

Trả về 200 với [Chi tiết dịch vụ](#hình-dạng-dùng-chung). Xem được cả dịch vụ đã ngừng dùng.

## 9. Lưu cả dịch vụ

`PUT /v1/tenants/{slug}/services/{serviceId}`

Một lần lưu cả thông tin chung, "Nhận đặt online", biến thể, đoạn, dọn dẹp và giá chi nhánh (BR-94.16). Thay toàn bộ giá trị, nên mọi trường bắt buộc.

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string, 1 đến 80 | Có | |
| `groupId` | uuid hoặc `null` | Có | Đổi nhóm thì dịch vụ xếp cuối nhóm mới (BR-94.11) |
| `description` | string, 0 đến 500 | Có | Chuỗi rỗng được |
| `bookableOnline` | boolean | Có | |
| `variants` | mảng, 1 đến 10 | Có | Thứ tự trong mảng là thứ tự biến thể (BR-94.20) |
| `variants[].id` | uuid | Không | Có thì là biến thể đang dùng của dịch vụ này; không có thì tạo biến thể mới |
| `variants[].name` | string, 1 đến 40 | Có | Không trùng biến thể khác trong mảng, không phân biệt hoa thường |
| `variants[].shortName` | string, 1 đến 20 | Có | |
| `variants[].priceVnd` | integer, 0 đến 100.000.000 | Có | Bội của 1.000 |
| `variants[].segments` | mảng, 1 đến 8 | Có | Theo thứ tự đoạn |
| `variants[].segments[].kind` | `prep`, `work`, `wait` | Có | |
| `variants[].segments[].label` | string, 1 đến 40 | Có | Tên đoạn trên lịch |
| `variants[].segments[].minutes` | integer, 5 đến 480 | Có | Bội của 5 |
| `variants[].segments[].resourceTypeIds` | mảng uuid | Có | Ít nhất một, không trùng |
| `variants[].cleanups` | mảng | Có | `[]` nếu không dọn |
| `variants[].cleanups[].resourceTypeId` | uuid | Có | Loại không phải nhân viên, có đoạn chiếm, mỗi loại một lần |
| `variants[].cleanups[].minutes` | integer, 5 đến 120 | Có | Bội của 5 |
| `variants[].branchPrices` | mảng | Có | `[]` nếu không có giá riêng |
| `variants[].branchPrices[].branchId` | uuid | Có | Chi nhánh đang dùng, mỗi chi nhánh một lần |
| `variants[].branchPrices[].priceVnd` | integer, 0 đến 100.000.000 | Có | Bội của 1.000 |

Xử lý, sau các bước chung:

1. Schema (bước chung 2). Lỗi theo trường:

   | `field` | `code` | Khi |
   |---|---|---|
   | `name`, `description` | `REQUIRED`, `TOO_LONG` | Rỗng, hoặc quá dài |
   | `variants` | `INVALID_VALUE` | Không có biến thể nào, hoặc hơn 10 |
   | `variants.{i}.name` | `REQUIRED`, `TOO_LONG`, `INVALID_VALUE` | Rỗng, quá dài, hoặc trùng một biến thể đứng trước nó trong mảng |
   | `variants.{i}.shortName` | `REQUIRED`, `TOO_LONG` | Rỗng, hoặc quá 20 ký tự |
   | `variants.{i}.priceVnd`, `…branchPrices.{k}.priceVnd` | `INVALID_VALUE` | Không là số nguyên, ngoài 0 đến 100.000.000, không là bội của 1.000 |
   | `variants.{i}.segments` | `INVALID_VALUE` | Không có đoạn nào, hơn 8 đoạn, không có đoạn Làm (BR-94.24), hoặc phần khách thấy quá 480 phút (BR-94.27) |
   | `variants.{i}.segments.{j}.label` | `REQUIRED`, `TOO_LONG` | Rỗng, hoặc quá 40 ký tự |
   | `variants.{i}.segments.{j}.minutes` | `INVALID_VALUE` | Ngoài 5 đến 480, hoặc không là bội của 5 |
   | `variants.{i}.segments.{j}.kind` | `INVALID_VALUE` | Đoạn Chuẩn bị không ở vị trí đầu, hoặc không có Làm ngay sau (BR-94.23); đoạn Chờ không nằm giữa hai đoạn Làm (BR-94.25). Một dãy sai có thể báo ở nhiều đoạn |
   | `variants.{i}.segments.{j}.resourceTypeIds` | `REQUIRED`, `INVALID_VALUE` | Rỗng; một loại hai lần |
   | `variants.{i}.cleanups.{k}.minutes` | `INVALID_VALUE` | Ngoài 5 đến 120, hoặc không là bội của 5 |
   | `variants.{i}.cleanups.{k}.resourceTypeId`, `…branchPrices.{k}.branchId` | `INVALID_VALUE` | Một giá trị hai lần trong cùng biến thể |
2. Dịch vụ đã ngừng dùng: **409** `SERVICE_ARCHIVED`.
3. Tìm các id trong body theo `tenant_id`: `groupId`, `resourceTypeId` của đoạn và dọn dẹp, `branchId` của giá, `variants[].id` không thuộc cơ sở hoặc không phải biến thể đang dùng của dịch vụ này: **404** `NOT_FOUND`. `branchId` là chi nhánh đã ngừng dùng: **409** `BRANCH_ARCHIVED`.
4. Các luật cần biết loại nhân viên, báo **400** `VALIDATION_FAILED`: mọi đoạn Làm phải chiếm loại nhân viên, đoạn Chờ không chiếm loại nhân viên và phải chiếm ít nhất một loại khác (BR-94.26) báo ở `…segments.{j}.resourceTypeIds`; `…cleanups.{k}.resourceTypeId` là loại nhân viên hoặc không đoạn nào của biến thể chiếm (BR-94.28).
5. Tên trùng dịch vụ đang dùng khác: **409** `NAME_TAKEN`.
6. Trong transaction, khóa dòng dịch vụ (`SELECT ... FOR UPDATE`); hai `PUT` cùng dịch vụ xếp hàng ở đây. Ghi theo thứ tự:
   1. Cập nhật `name`, `description`, `bookable_online`, `updated_at`; nếu `groupId` đổi thì `sort` bằng lớn nhất của nhóm mới cộng 1.
   2. Biến thể đang dùng không có trong `variants` thì đặt `archived_at` bằng `Clock.now()` (BR-94.21). Làm bước này trước khi ghi biến thể khác, để tên của biến thể vừa ẩn dùng lại được trong cùng lần lưu (BR-94.18).
   3. Biến thể có `id`: cập nhật `name`, `short_name`, `price_vnd`, `sort`. Biến thể không có `id`: tạo mới.
   4. Với mỗi biến thể: thay toàn bộ đoạn và loại tài nguyên mỗi đoạn, thay toàn bộ dọn dẹp, thay các dòng `service_prices` có `branch_id` thuộc chi nhánh đang dùng và `level` rỗng. Dòng giá của chi nhánh đã ngừng dùng không bị chạm tới (BR-94.29).
7. Vi phạm chỉ mục duy nhất của tên dịch vụ hoặc tên biến thể do hai yêu cầu cùng lúc: **409** `NAME_TAKEN`; vi phạm khóa ngoại của nhóm: **404** `NOT_FOUND`.

Trả về 200 với [Chi tiết dịch vụ](#hình-dạng-dùng-chung). Lịch đã đặt không bị chạm tới (BR-94.31).

| Status | `code` | Câu hiển thị (MH-45) |
|---|---|---|
| 409 | `NAME_TAKEN` | Dưới ô tên dịch vụ: "Đã có dịch vụ tên này." |
| 409 | `SERVICE_ARCHIVED` | Tải lại trang, hiện chế độ chỉ đọc |
| 409 | `BRANCH_ARCHIVED` | Dưới ô giá của chi nhánh đó: "Chi nhánh {tên} đã ngừng dùng." |
| 404 | `NOT_FOUND` | Trang 404 trong khung nếu là `serviceId`; còn lại tải lại trang, vì nhóm, loại, chi nhánh hoặc biến thể vừa đổi ở nơi khác |

## 10. Bật tắt nhận đặt online

`PATCH /v1/tenants/{slug}/services/{serviceId}`, body `{ "bookableOnline": true }`. Body có trường khác bị từ chối ở bước chung 2.

Dịch vụ đã ngừng dùng: **409** `SERVICE_ARCHIVED`. Trả về 200 với một dòng như [Một dòng của danh sách](#hình-dạng-dùng-chung).

## 11. Ngừng dùng dịch vụ

`POST /v1/tenants/{slug}/services/{serviceId}/archive`, không có body.

1. Dịch vụ đã ngừng dùng: **409** `SERVICE_ARCHIVED`.
2. Đặt `archived_at` bằng `Clock.now()`. Không xóa dòng nào, không đổi biến thể, đoạn, dọn dẹp, giá, `bookable_online`.
3. **Áp dụng khi có lịch hẹn:** lịch đã đặt không đổi (BR-94.12).

Trả về 200 với một dòng như [Một dòng của danh sách](#hình-dạng-dùng-chung).

## 12. Dùng lại dịch vụ

`POST /v1/tenants/{slug}/services/{serviceId}/restore`, không có body.

1. Dịch vụ đang dùng: **409** `SERVICE_NOT_ARCHIVED`.
2. Tên trùng dịch vụ đang dùng khác: **409** `NAME_TAKEN`. Vi phạm chỉ mục duy nhất cũng trả mã này.
3. Đặt `archived_at` về rỗng và `sort` bằng lớn nhất của nhóm cộng 1.

Trả về 200 với một dòng như [Một dòng của danh sách](#hình-dạng-dùng-chung).

| Status | `code` | Câu hiển thị (MH-44, MH-45) |
|---|---|---|
| 409 | `NAME_TAKEN` | "Đã có dịch vụ đang dùng tên này. Đổi tên một trong hai dịch vụ rồi dùng lại." |
| 409 | `SERVICE_NOT_ARCHIVED` | Tải lại danh sách |

## 13. Đổi thứ tự dịch vụ

`PUT /v1/tenants/{slug}/services/order`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `groupId` | uuid hoặc `null` | Có | `null` là nhóm "Khác" |
| `ids` | mảng uuid | Có | Thứ tự mới của cả nhóm |

1. `groupId` không thuộc cơ sở: **404** `NOT_FOUND`.
2. Khóa các dòng dịch vụ đang dùng của nhóm (`SELECT ... FOR UPDATE`). `ids` không đúng bằng tập đó (thiếu, thừa, trùng, id của nhóm khác, hoặc dịch vụ đã ngừng dùng): **409** `ORDER_MISMATCH`.
3. Đặt `sort` là 1, 2, 3... theo thứ tự `ids`.

Trả về 200 `{ "ids": [...] }` là thứ tự vừa lưu.

| Status | `code` | Câu hiển thị (MH-44) |
|---|---|---|
| 409 | `ORDER_MISMATCH` | Tải lại danh sách; hộp thông báo "Danh sách vừa đổi, hãy thử lại." |

## Thử trong Scalar

Mọi tài khoản mẫu có mật khẩu `123456`. Dữ liệu mẫu có `toc-may` (gói `pro`, chủ `chinh@tocmay.vn`, quản lý `hung@tocmay.vn`) và `la-sen` (gói `basic`, chủ `ha.le@lasen.vn`), như ở [Chi nhánh và tài nguyên](./branch-settings.md#thử-trong-scalar), kèm dịch vụ theo mock:

| Cơ sở | Nhóm (theo thứ tự) | Dịch vụ (biến thể) |
|---|---|---|
| `toc-may` | Cắt, Gội, Nhuộm và uốn | Cắt tóc (Tóc ngắn, Tóc dài); Gội sấy (Tiêu chuẩn); Nhuộm tóc (Tóc ngắn, Tóc dài; đoạn Chuẩn bị, Làm, Chờ, Làm, Làm; dọn Ghế cắt 10 phút) |
| `la-sen` | Trị liệu, Massage, Chăm sóc da, Gội | Ngâm bùn, xông hơi (Tiêu chuẩn; Làm, Chờ, Làm; dọn Bồn ngâm 10 phút, Phòng xông 5 phút); Massage body (60 phút, 90 phút); Chăm sóc da mặt (Tiêu chuẩn; Làm, Chờ, Làm); Gội dưỡng sinh (Tiêu chuẩn) |

Đoạn chiếm các loại tài nguyên mà dữ liệu mẫu của chi nhánh đã có: Thợ, Ghế cắt, Giường gội ở Tóc Mây; Kỹ thuật viên, Giường, Bồn ngâm, Phòng xông ở Lá Sen. Mọi dịch vụ mẫu nhận đặt online; "Ngâm bùn, xông hơi" và "Nhuộm tóc" có `deposit_vnd` 100.000 trong DB, API chưa trả trường này. Id nhóm, dịch vụ, loại, chi nhánh lấy từ phản hồi của #1, #6 và của [Chi nhánh và tài nguyên](./branch-settings.md). Danh sách ca nằm ở `apps/api/src/openapi/examples/services.ts`, và một test chạy từng ca trên dữ liệu mẫu để kiểm kết quả ghi dưới đây. Ca nào làm đổi dữ liệu thì chạy lại cho kết quả khác; `db:seed -- --reset` đưa về như ban đầu.

| Ca | Endpoint | Đăng nhập là | Đầu vào | Kết quả |
|---|---|---|---|---|
| Danh sách nhóm | #1 | `chinh@tocmay.vn` | `slug = toc-may` | 200, ba nhóm Cắt, Gội, Nhuộm và uốn, mỗi nhóm `serviceCount` 1 |
| Thêm nhóm | #2 | `chinh@tocmay.vn` | "Phục hồi" | 201, `sort` 4 |
| Tên nhóm trùng | #2 | `chinh@tocmay.vn` | "cắt" | 409 `NAME_TAKEN` |
| Tên nhóm "Khác" | #2 | `chinh@tocmay.vn` | "Khác" | 409 `NAME_TAKEN` |
| Đổi thứ tự nhóm | #5 | `chinh@tocmay.vn` | Gội, Cắt, Nhuộm và uốn, Phục hồi | 200 |
| Thứ tự nhóm thiếu id | #5 | `chinh@tocmay.vn` | Chỉ Gội và Cắt | 409 `ORDER_MISMATCH` |
| Xóa nhóm còn dịch vụ | #4 | `chinh@tocmay.vn` | Nhóm "Cắt" | 409 `SERVICE_GROUP_IN_USE`, `count` 1 |
| Xóa nhóm trống | #4 | `chinh@tocmay.vn` | Nhóm "Phục hồi" | 204 |
| Danh sách dịch vụ | #6 | `chinh@tocmay.vn` | `slug = toc-may` | 200, ba dịch vụ; Nhuộm tóc có `variantCount` 2, `visibleMinutes` 105 đến 120 |
| Tìm không dấu | #6 | `chinh@tocmay.vn` | `q = nhuom` | 200, chỉ "Nhuộm tóc" |
| Danh sách Lá Sen | #6 | `ha.le@lasen.vn` | `slug = la-sen` | 200, bốn dịch vụ |
| Thêm dịch vụ | #7 | `chinh@tocmay.vn` | "Uốn tóc", nhóm "Nhuộm và uốn", biến thể "Tóc ngắn", 600000, 90 phút | 201, một đoạn Làm 90 phút chiếm loại Thợ, `bookableOnline` `false` |
| Tên dịch vụ trùng | #7 | `chinh@tocmay.vn` | "cắt tóc" | 409 `NAME_TAKEN` |
| Giá sai | #7 | `chinh@tocmay.vn` | Giá 150500 | 400 `VALIDATION_FAILED`, `variant.priceVnd` |
| Chi tiết Nhuộm tóc | #8 | `chinh@tocmay.vn` | Dịch vụ "Nhuộm tóc" | 200, hai biến thể, năm đoạn, dọn Ghế cắt 10 phút |
| Đổi phút đoạn chờ | #9 | `chinh@tocmay.vn` | Như chi tiết, "Chờ lên màu" của Tóc ngắn thành 50 phút | 200, `visibleMinutes` của Tóc ngắn 110 |
| Chờ ở cuối | #9 | `chinh@tocmay.vn` | Thêm đoạn Chờ cuối biến thể Tóc ngắn | 400 `VALIDATION_FAILED`, `variants.0.segments.5.kind` |
| Làm ẩn biến thể rồi dùng lại tên | #9 | `chinh@tocmay.vn` | Bỏ "Tóc dài", thêm biến thể "Tóc dài" mới không có `id` | 200, biến thể mới có id khác |
| Giá chi nhánh | #9 | `chinh@tocmay.vn` | Sau ca "Thêm chi nhánh" của [Chi nhánh và tài nguyên](./branch-settings.md#thử-trong-scalar): giá 520000 ở "Tóc Mây Quận 7" cho Tóc ngắn | 200, `branchPrices` có chi nhánh đó; `branches` có Quận 7 với `resourceTypeIds` rỗng |
| Tắt đặt online | #10 | `chinh@tocmay.vn` | "Cắt tóc", `false` | 200 |
| Ngừng dùng | #11 | `chinh@tocmay.vn` | "Gội sấy" | 200, `archivedAt` có giá trị; mất khỏi #6 mặc định |
| Sửa dịch vụ đã ngừng dùng | #9 | `chinh@tocmay.vn` | "Gội sấy", như chi tiết | 409 `SERVICE_ARCHIVED` |
| Dùng lại | #12 | `chinh@tocmay.vn` | "Gội sấy" | 200, `archivedAt` rỗng |
| Đổi thứ tự dịch vụ | #13 | `ha.le@lasen.vn` | `groupId` nhóm Trị liệu, danh sách chỉ có dịch vụ đó | 200 |
| Sai vai | #7 | `hung@tocmay.vn` | Như ca "Thêm dịch vụ" | 403 `FORBIDDEN` |
| Không thuộc cơ sở | #6 | `ha.le@lasen.vn` | `slug = toc-may` | 404 `NOT_FOUND` |
