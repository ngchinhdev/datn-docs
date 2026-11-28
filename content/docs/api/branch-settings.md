---
title: Chi nhánh và tài nguyên
description: Danh sách, thêm, sửa, ngừng dùng chi nhánh; giờ mở cửa và ngày đặc biệt; loại tài nguyên; tài nguyên, thứ tự, tạm ngưng bảo trì.
---

Nghiệp vụ ở [Chi nhánh và tài nguyên](../features/branch-settings.md). Quy ước chung (cookie, lỗi, `Origin`, guard theo cơ sở và vai trò) ở [Quy ước API](./index.md).

## Danh sách

Mọi endpoint có `{slug}` trong đường dẫn (`/v1/tenants/{slug}/...`) và chỉ **chủ cơ sở** (`owner`) gọi được (BR-93.1). Quản lý, lễ tân, kỹ thuật viên đọc chi nhánh và tài nguyên qua endpoint của tính năng dùng nó (bộ chọn chi nhánh, Lịch, Xếp ca); nhóm endpoint này giữ chỉ chủ cơ sở.

| # | Endpoint | Thành công | Lỗi nghiệp vụ | Quy tắc |
|---|---|---|---|---|
| 1 | `GET /v1/tenants/{slug}/branches` | 200 | | BR-93.2, 93.9 |
| 2 | `POST /v1/tenants/{slug}/branches` | 201 | `PLAN_LIMIT_REACHED`, `NAME_TAKEN` | BR-93.2, 93.4 đến 93.7 |
| 3 | `GET /v1/tenants/{slug}/branches/{branchId}` | 200 | | BR-93.14 |
| 4 | `PUT /v1/tenants/{slug}/branches/{branchId}` | 200 | `NAME_TAKEN`, `BRANCH_ARCHIVED` | BR-93.4 đến 93.6, 93.8, 93.11 đến 93.15 |
| 5 | `POST /v1/tenants/{slug}/branches/{branchId}/archive` | 200 | `LAST_BRANCH`, `BRANCH_ARCHIVED`, `BRANCH_HAS_UPCOMING_APPOINTMENTS` | BR-93.9, 93.10 |
| 6 | `GET /v1/tenants/{slug}/resource-types` | 200 | | BR-93.16 |
| 7 | `POST /v1/tenants/{slug}/resource-types` | 201 | `NAME_TAKEN` | BR-93.16, 93.17 |
| 8 | `PATCH /v1/tenants/{slug}/resource-types/{typeId}` | 200 | `NAME_TAKEN`, `RESOURCE_TYPE_PROTECTED` | BR-93.16, 93.18 |
| 9 | `DELETE /v1/tenants/{slug}/resource-types/{typeId}` | 204 | `RESOURCE_TYPE_PROTECTED`, `RESOURCE_TYPE_IN_USE` | BR-93.16, 93.19 |
| 10 | `GET /v1/tenants/{slug}/resources` | 200 | | BR-93.20 |
| 11 | `POST /v1/tenants/{slug}/resources` | 201 | `NAME_TAKEN`, `BRANCH_ARCHIVED` | BR-93.21 |
| 12 | `PATCH /v1/tenants/{slug}/resources/{resourceId}` | 200 | `NAME_TAKEN`, `RESOURCE_ARCHIVED` | BR-93.22 |
| 13 | `PUT /v1/tenants/{slug}/resources/order` | 200 | `ORDER_MISMATCH` | BR-93.23 |
| 14 | `POST /v1/tenants/{slug}/resources/{resourceId}/pauses` | 201 | `PAUSE_OVERLAP`, `RESOURCE_ARCHIVED` | BR-93.24, 93.26 |
| 15 | `DELETE /v1/tenants/{slug}/resources/{resourceId}/pauses/{pauseId}` | 204 | `PAUSE_ENDED` | BR-93.25 |
| 16 | `POST /v1/tenants/{slug}/resources/{resourceId}/archive` | 200 | `RESOURCE_ARCHIVED` | BR-93.27 |

## Thứ tự chung của mọi endpoint

1. Guard theo cơ sở và vai trò với `@Roles('owner')` ([Quy ước API](./index.md#quyền-theo-cơ-sở-và-vai-trò)): 401 `UNAUTHENTICATED`, 403 `EMAIL_NOT_VERIFIED`, 404 `NOT_FOUND`, 403 `FORBIDDEN`, 403 `TENANT_LOCKED`, 402 `SUBSCRIPTION_EXPIRED`.
2. Body hoặc tham số sai schema: 400 `VALIDATION_FAILED`. Schema của body không nhận trường lạ: trường thừa báo `INVALID_VALUE` ở chính trường đó.
3. Tìm đối tượng trong đường dẫn theo `tenant_id` (RLS, T-07): không có, hoặc thuộc cơ sở khác: 404 `NOT_FOUND`.
4. Các bước riêng của từng endpoint, ghi dưới đây. Việc ghi nằm trong một transaction qua `withTenant()`. Vi phạm ràng buộc duy nhất hoặc exclusion constraint của DB (hai yêu cầu cùng lúc) trả đúng mã nghiệp vụ của ràng buộc đó, không trả 500.

## Giới hạn theo phiên

`RATE_LIMITED`, có `Retry-After`, tính theo tài khoản của phiên:

| Loại | Tối đa mỗi phút |
|---|---|
| `GET` | 300 |
| `POST`, `PUT`, `PATCH`, `DELETE` | 60 |

Bộ đếm nằm trong bộ nhớ của từng instance API, theo cửa sổ một phút; nhiều instance chạy cùng lúc cần bộ đếm chung bằng Redis. Giới hạn của gói (`PLAN_LIMIT_REACHED`) khác với giới hạn này: nó tính theo dữ liệu của cơ sở (BR-93.2).

## Mã lỗi của nhóm này

| Status | `code` | Trường thêm | Khi nào |
|---|---|---|---|
| 403 | `PLAN_LIMIT_REACHED` | `limit` (`branches`), `max` | Thêm chi nhánh khi số chi nhánh đang dùng đã bằng `plans.limits.branches` |
| 409 | `NAME_TAKEN` | | Tên trùng (BR-93.4, 93.17, 93.21) |
| 409 | `BRANCH_ARCHIVED` | | Sửa, thêm tài nguyên vào, hoặc ngừng dùng một chi nhánh đã ngừng dùng |
| 409 | `LAST_BRANCH` | | Ngừng dùng chi nhánh đang dùng cuối cùng |
| 409 | `BRANCH_HAS_UPCOMING_APPOINTMENTS` | `count` | **Áp dụng khi có lịch hẹn.** Ngừng dùng chi nhánh còn lịch sắp tới |
| 409 | `RESOURCE_TYPE_PROTECTED` | | Sửa hoặc xóa loại nhân viên |
| 409 | `RESOURCE_TYPE_IN_USE` | | Xóa loại còn tài nguyên (kể cả đã ngừng dùng), hoặc **áp dụng khi có dịch vụ:** còn dịch vụ chiếm loại đó |
| 409 | `RESOURCE_ARCHIVED` | | Đổi tên, tạm ngưng hoặc ngừng dùng tài nguyên đã ngừng dùng, kể cả tài nguyên của chi nhánh đã ngừng dùng (BR-93.9) |
| 409 | `ORDER_MISMATCH` | | Danh sách `ids` không đúng bằng tập tài nguyên đang dùng của nhóm |
| 409 | `PAUSE_OVERLAP` | | Khoảng tạm ngưng chồng một khoảng khác của cùng tài nguyên |
| 409 | `PAUSE_ENDED` | | Mở lại một khoảng đã kết thúc |

## 1. Danh sách chi nhánh

Tham chiếu: [Danh sách chi nhánh](./reference/branch-settings/branchesList.mdx)

`GET /v1/tenants/{slug}/branches?status=active|archived|all`

`status` mặc định `active`. Trả về 200:

```json
{
  "items": [
    {
      "id": "0193…",
      "name": "Tóc Mây Quận 3",
      "address": "120 Võ Văn Tần, Phường Bàn Cờ, TP.HCM",
      "phone": "+842839301234",
      "timezone": "Asia/Ho_Chi_Minh",
      "isFirst": true,
      "archivedAt": null,
      "staffCount": 3,
      "resourceCount": 4
    }
  ],
  "plan": { "name": "Chuyên nghiệp", "maxBranches": null, "activeBranches": 1 }
}
```

`isFirst` là chi nhánh có `created_at` sớm nhất của cơ sở. `resourceCount` đếm tài nguyên đang dùng không phải nhân viên, `staffCount` đếm tài nguyên nhân viên đang dùng. `plan.name` là `plans.name` của gói đang áp dụng (cơ sở dùng thử là gói Chuyên nghiệp); `plan.maxBranches` là `plans.limits.branches` (`null` là không giới hạn); `plan.activeBranches` luôn đếm chi nhánh đang dùng, bất kể `status`. Sắp theo `created_at`.

## 2. Thêm chi nhánh

Tham chiếu: [Thêm chi nhánh](./reference/branch-settings/branchesCreate.mdx)

`POST /v1/tenants/{slug}/branches`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string, 1 đến 100 | Có | Bỏ khoảng trắng hai đầu và khoảng trắng thừa ở giữa |
| `phone` | string | Có | Số điện thoại Việt Nam; chuẩn hóa BR-61 rồi lưu E.164 |
| `address` | string, 1 đến 255 | Có | |

Xử lý, sau các bước chung:

1. Trong transaction, khóa dòng `subscriptions` của cơ sở (`SELECT ... FOR UPDATE`). Hai yêu cầu thêm chi nhánh của một cơ sở xếp hàng ở đây.
2. Đếm chi nhánh đang dùng. Đã bằng `plans.limits.branches` của gói hiện tại (gói dùng thử là `pro`): **403** `PLAN_LIMIT_REACHED` với `limit = branches`, `max`. `null` là không giới hạn.
3. Tên trùng chi nhánh đang dùng khác (không phân biệt hoa thường): **409** `NAME_TAKEN`. Vi phạm chỉ mục duy nhất `(tenant_id, lower(name))` của chi nhánh đang dùng cũng trả mã này.
4. Tạo chi nhánh với múi giờ `Asia/Ho_Chi_Minh` và bước lưới 15 phút, tạo giờ mở cửa mặc định (BR-93.7).

Trả về 201 với dạng chi tiết của [#3](#3-chi-tiết-chi-nhánh).

| Status | `code` | Câu hiển thị (MH-42) |
|---|---|---|
| 403 | `PLAN_LIMIT_REACHED` | "Gói {tên gói} chỉ cho {max} chi nhánh. Nâng gói để thêm chi nhánh." kèm link "Xem gói Sapio" |
| 409 | `NAME_TAKEN` | "Đã có chi nhánh tên này." |

## 3. Chi tiết chi nhánh

Tham chiếu: [Chi tiết chi nhánh](./reference/branch-settings/branchesDetail.mdx)

`GET /v1/tenants/{slug}/branches/{branchId}`

Trả về 200:

```json
{
  "id": "0193…",
  "name": "Tóc Mây Quận 3",
  "phone": "+842839301234",
  "address": "120 Võ Văn Tần, Phường Bàn Cờ, TP.HCM",
  "timezone": "Asia/Ho_Chi_Minh",
  "archivedAt": null,
  "updatedAt": "2026-11-28T03:15:00.000Z",
  "openingHours": [
    { "weekday": 1, "opens": "09:00", "closes": "12:00" },
    { "weekday": 1, "opens": "14:00", "closes": "20:00" },
    { "weekday": 6, "opens": "08:00", "closes": "20:00" }
  ],
  "specialDays": [
    { "date": "2026-12-25", "note": "Noel", "windows": [] },
    { "date": "2027-02-06", "note": "Nghỉ Tết", "windows": [] }
  ]
}
```

`weekday` từ 0 (Chủ Nhật) đến 6; ngày không có phần tử là nghỉ. `openingHours` sắp theo `weekday` rồi `opens`. `specialDays` chỉ gồm ngày từ hôm nay (giờ chi nhánh) trở đi, sắp theo `date` (BR-93.14). Xem được cả chi nhánh đã ngừng dùng.

## 4. Sửa chi nhánh

Tham chiếu: [Sửa chi nhánh](./reference/branch-settings/branchesUpdate.mdx)

`PUT /v1/tenants/{slug}/branches/{branchId}`

Một lần lưu cả thông tin, giờ mở cửa và ngày đặc biệt (BR-93.8). Thay toàn bộ giá trị, nên mọi trường bắt buộc.

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name`, `phone`, `address` | như [#2](#2-thêm-chi-nhánh) | Có | |
| `openingHours` | mảng | Có | Mỗi phần tử một khung. Ít nhất 1, tối đa 4 phần tử mỗi `weekday` |
| `openingHours[].weekday` | integer, 0 đến 6 | Có | 0 là Chủ Nhật |
| `openingHours[].opens`, `.closes` | string `HH:mm`, 00:00 đến 23:59 | Có | `closes` sau `opens` |
| `specialDays` | mảng | Có | Gửi `[]` nếu không có ngày nào. Chỉ chứa ngày từ hôm nay |
| `specialDays[].date` | string `YYYY-MM-DD` | Có | Từ hôm nay (giờ chi nhánh) trở đi, không trùng nhau trong mảng |
| `specialDays[].note` | string, 0 đến 200 | Có | Chuỗi rỗng được |
| `specialDays[].windows` | mảng, 0 đến 4 | Có | `[]` là đóng cửa cả ngày; mỗi phần tử có `opens`, `closes` như trên |

Xử lý, sau các bước chung:

1. Schema (bước chung 2). Ngoài kiểm từng trường, schema kiểm: có ít nhất một ngày mở (`openingHours` rỗng báo `INVALID_VALUE` ở `openingHours`); khung của một `weekday` không quá 4 (khung thứ 5 báo `INVALID_VALUE` ở `openingHours.{i}.weekday`) và không chồng nhau (khung sau có `opens` trước `closes` của khung liền trước báo `INVALID_VALUE` ở `openingHours.{i}.opens` của khung sau; nối liền hợp lệ); mỗi ngày đặc biệt kiểm như ngày thường, báo ở `specialDays.{i}.windows.{j}.opens` hoặc `specialDays.{i}.windows`; `specialDays.{i}.date` trong quá khứ hoặc trùng ngày khác báo `INVALID_VALUE`.
2. Chi nhánh đã ngừng dùng: **409** `BRANCH_ARCHIVED`.
3. Tên trùng chi nhánh đang dùng khác: **409** `NAME_TAKEN`.
4. Cập nhật `name`, `phone`, `address`, `updated_at`; thay toàn bộ `opening_hours` của chi nhánh; với ngày đặc biệt: xóa mọi dòng từ hôm nay trở đi rồi thêm các dòng trong body. Ngày đã qua không bị chạm tới (BR-93.14). Vi phạm exclusion constraint của khung giờ trả 400 như bước 1.
5. **Áp dụng khi có lịch hẹn:** tìm lịch sắp tới nằm ngoài giờ mới, đặt vào "Cần xếp lại" (BR-93.15) trong cùng transaction; phản hồi có `requeued` là số lịch đó.

Trả về 200 với dạng chi tiết của [#3](#3-chi-tiết-chi-nhánh).

| Status | `code` | Câu hiển thị (MH-43) |
|---|---|---|
| 409 | `NAME_TAKEN` | Dưới ô tên: "Đã có chi nhánh tên này." |
| 409 | `BRANCH_ARCHIVED` | Dải báo "Chi nhánh đã ngừng dùng." và trang chuyển sang chế độ chỉ đọc |

## 5. Ngừng dùng chi nhánh

Tham chiếu: [Ngừng dùng chi nhánh](./reference/branch-settings/branchesArchive.mdx)

`POST /v1/tenants/{slug}/branches/{branchId}/archive`, không có body.

1. Chi nhánh đã ngừng dùng: **409** `BRANCH_ARCHIVED`.
2. Trong transaction, khóa dòng `subscriptions` của cơ sở rồi đếm chi nhánh đang dùng. Chỉ còn chi nhánh này: **409** `LAST_BRANCH`. Hai yêu cầu ngừng dùng cùng lúc xếp hàng ở bước khóa.
3. **Áp dụng khi có lịch hẹn:** còn lịch sắp tới ở chi nhánh: **409** `BRANCH_HAS_UPCOMING_APPOINTMENTS` với `count`.
4. Đặt `archived_at` bằng `Clock.now()`. Không đổi tài nguyên, giờ mở cửa, ngày đặc biệt.

Trả về 200 với dạng chi tiết của [#3](#3-chi-tiết-chi-nhánh).

| Status | `code` | Câu hiển thị (MH-43) |
|---|---|---|
| 409 | `LAST_BRANCH` | "Đây là chi nhánh đang dùng cuối cùng. Cơ sở cần ít nhất một chi nhánh." |
| 409 | `BRANCH_HAS_UPCOMING_APPOINTMENTS` | "Còn {count} lịch sắp tới ở chi nhánh này. Đổi hoặc hủy các lịch đó trước." |
| 409 | `BRANCH_ARCHIVED` | Tải lại trang, hiện chế độ chỉ đọc |

## 6. Danh sách loại tài nguyên

Tham chiếu: [Danh sách loại tài nguyên](./reference/branch-settings/resourceTypesList.mdx)

`GET /v1/tenants/{slug}/resource-types`

Trả về 200:

```json
{
  "items": [
    { "id": "0193…", "name": "Thợ", "isStaff": true, "resourceCount": 3, "archivedCount": 0 },
    { "id": "0193…", "name": "Ghế cắt", "isStaff": false, "resourceCount": 3, "archivedCount": 1 }
  ]
}
```

`resourceCount` đếm tài nguyên đang dùng, `archivedCount` đếm tài nguyên đã ngừng dùng, trên mọi chi nhánh. Sắp theo `sort` rồi `created_at`. Loại không phải nhân viên có `resourceCount + archivedCount = 0` (và, khi có dịch vụ, không dịch vụ nào chiếm) thì xóa được.

## 7. Thêm loại tài nguyên

Tham chiếu: [Thêm loại tài nguyên](./reference/branch-settings/resourceTypesCreate.mdx)

`POST /v1/tenants/{slug}/resource-types`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string, 1 đến 50 | Có | Bỏ khoảng trắng hai đầu và thừa ở giữa |

Tên trùng tên loại nào của cơ sở (không phân biệt hoa thường): **409** `NAME_TAKEN`. Loại tạo ra luôn có `isStaff = false` và `sort` sau mọi loại có sẵn; body có `isStaff` bị bước chung 2 từ chối. Trả về 201 với một phần tử như ở [#6](#6-danh-sách-loại-tài-nguyên).

## 8. Đổi tên loại tài nguyên

Tham chiếu: [Đổi tên loại tài nguyên](./reference/branch-settings/resourceTypesRename.mdx)

`PATCH /v1/tenants/{slug}/resource-types/{typeId}`, body `{ "name": "..." }` như [#7](#7-thêm-loại-tài-nguyên).

1. Loại nhân viên: **409** `RESOURCE_TYPE_PROTECTED`.
2. Tên trùng loại khác: **409** `NAME_TAKEN`. Giữ nguyên tên cũ (chỉ đổi hoa thường) không phải trùng.

Trả về 200 với một phần tử như ở #6.

## 9. Xóa loại tài nguyên

Tham chiếu: [Xóa loại tài nguyên](./reference/branch-settings/resourceTypesRemove.mdx)

`DELETE /v1/tenants/{slug}/resource-types/{typeId}`

1. Loại nhân viên: **409** `RESOURCE_TYPE_PROTECTED`.
2. Còn tài nguyên thuộc loại này, kể cả đã ngừng dùng: **409** `RESOURCE_TYPE_IN_USE`. **Áp dụng khi có dịch vụ:** còn đoạn của dịch vụ chiếm loại này (`segment_resource_types`, `variant_cleanups`) cũng trả mã đó.
3. Xóa dòng. Khóa ngoại của `resources` và các bảng dịch vụ là lớp chặn cuối nếu hai yêu cầu chạy cùng lúc; vi phạm khóa ngoại trả `RESOURCE_TYPE_IN_USE`.

Trả về 204.

| Status | `code` | Câu hiển thị (MH-46) |
|---|---|---|
| 409 | `NAME_TAKEN` | "Đã có loại tên này." |
| 409 | `RESOURCE_TYPE_PROTECTED` | Không hiện: giao diện không có nút sửa, xóa cho loại nhân viên |
| 409 | `RESOURCE_TYPE_IN_USE` | "Còn {n} tài nguyên thuộc loại này, kể cả đã ngừng dùng, nên không xóa được." Khi có dịch vụ thêm "Dịch vụ {tên} đang dùng loại này." |

## 10. Danh sách tài nguyên

Tham chiếu: [Danh sách tài nguyên](./reference/branch-settings/resourcesList.mdx)

`GET /v1/tenants/{slug}/resources?branchId=&resourceTypeId=&status=active|archived|all`

Chỉ tài nguyên có loại không phải nhân viên (BR-93.20). `branchId`, `resourceTypeId` là bộ lọc, bỏ trống là tất cả. `status` mặc định `active`; tài nguyên của chi nhánh đã ngừng dùng thuộc `archived`, dù `archived_at` của chính nó rỗng (BR-93.9). Trả về 200:

```json
{
  "items": [
    {
      "id": "0193…",
      "name": "Ghế 1",
      "branchId": "0193…",
      "resourceTypeId": "0193…",
      "sort": 1,
      "archivedAt": null,
      "branchArchived": false,
      "pauses": [
        {
          "id": "0193…",
          "startsAt": "2026-12-01T01:00:00.000Z",
          "endsAt": "2026-12-01T05:00:00.000Z",
          "reason": "Sửa ghế"
        }
      ],
      "upcomingAppointments": 0
    }
  ]
}
```

`pauses` gồm khoảng đang diễn ra và chưa bắt đầu (`endsAt` sau `Clock.now()`), sắp theo `startsAt`. Tài nguyên đang bảo trì là tài nguyên có khoảng với `startsAt` trước và `endsAt` sau giờ hiện tại. `upcomingAppointments` là số lịch dùng nó trong 7 ngày tới; **áp dụng khi có lịch hẹn**, trước đó luôn 0. Sắp theo chi nhánh (`created_at`), loại (`sort`), rồi `sort` của tài nguyên.

## 11. Thêm tài nguyên

Tham chiếu: [Thêm tài nguyên](./reference/branch-settings/resourcesCreate.mdx)

`POST /v1/tenants/{slug}/resources`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `branchId` | uuid | Có | Chi nhánh đang dùng |
| `resourceTypeId` | uuid | Có | Loại không phải nhân viên |
| `name` | string, 1 đến 50 | Có | Bỏ khoảng trắng hai đầu và thừa ở giữa |

Xử lý, sau các bước chung:

1. `branchId` hoặc `resourceTypeId` không thuộc cơ sở: **404** `NOT_FOUND`. Loại nhân viên: **400** `VALIDATION_FAILED`, `errors` có `resourceTypeId` với `INVALID_VALUE`.
2. Chi nhánh đã ngừng dùng: **409** `BRANCH_ARCHIVED`.
3. Tên trùng tài nguyên đang dùng khác cùng chi nhánh (không phân biệt hoa thường): **409** `NAME_TAKEN`. Vi phạm chỉ mục duy nhất `(tenant_id, branch_id, lower(name))` của tài nguyên đang dùng cũng trả mã này.
4. Tạo tài nguyên với `sort` bằng lớn nhất của nhóm (chi nhánh, loại) cộng 1.

Trả về 201 với một phần tử như ở [#10](#10-danh-sách-tài-nguyên).

## 12. Đổi tên tài nguyên

Tham chiếu: [Đổi tên tài nguyên](./reference/branch-settings/resourcesRename.mdx)

`PATCH /v1/tenants/{slug}/resources/{resourceId}`, body `{ "name": "..." }`. Body có `branchId` hoặc `resourceTypeId` bị từ chối ở bước chung 2.

1. Tài nguyên có loại nhân viên: **404** `NOT_FOUND` (màn này không quản lý nhân viên).
2. Tài nguyên đã ngừng dùng, hoặc thuộc chi nhánh đã ngừng dùng: **409** `RESOURCE_ARCHIVED`.
3. Tên trùng tài nguyên đang dùng khác cùng chi nhánh: **409** `NAME_TAKEN`.

Trả về 200 với một phần tử như ở #10.

## 13. Đổi thứ tự tài nguyên

Tham chiếu: [Đổi thứ tự tài nguyên](./reference/branch-settings/resourcesOrder.mdx)

`PUT /v1/tenants/{slug}/resources/order`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `branchId` | uuid | Có | |
| `resourceTypeId` | uuid | Có | |
| `ids` | mảng uuid | Có | Thứ tự mới của cả nhóm |

1. `branchId` hoặc `resourceTypeId` không thuộc cơ sở: **404** `NOT_FOUND`. `resourceTypeId` là loại nhân viên: **400** `VALIDATION_FAILED`, `errors` có `resourceTypeId` với `INVALID_VALUE`. Chi nhánh đã ngừng dùng vẫn đổi thứ tự được.
2. Khóa các dòng tài nguyên đang dùng của nhóm (`SELECT ... FOR UPDATE`). `ids` không đúng bằng tập các id đó (thiếu, thừa, trùng, hoặc id của nhóm khác): **409** `ORDER_MISMATCH`.
3. Đặt `sort` là 1, 2, 3... theo thứ tự `ids`.

Trả về 200 `{ "ids": [...] }` là thứ tự vừa lưu.

## 14. Tạm ngưng tài nguyên

Tham chiếu: [Tạm ngưng tài nguyên](./reference/branch-settings/resourcesCreatePause.mdx)

`POST /v1/tenants/{slug}/resources/{resourceId}/pauses`

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `startsAt` | string, ISO 8601 UTC | Có | Trước `Clock.now()` thì lưu và trả về bằng `Clock.now()` (BR-93.24) |
| `endsAt` | string, ISO 8601 UTC | Có | Sau `startsAt` (giá trị gửi lên) và sau `Clock.now()` |
| `reason` | string, 1 đến 200 | Có | |

Xử lý, sau các bước chung:

1. Tài nguyên có loại nhân viên: **404** `NOT_FOUND`. Đã ngừng dùng, hoặc thuộc chi nhánh đã ngừng dùng: **409** `RESOURCE_ARCHIVED`.
2. Khoảng chồng một khoảng khác của cùng tài nguyên: **409** `PAUSE_OVERLAP`. Khoảng `[startsAt, endsAt)` nối liền khoảng khác không chồng. Ràng buộc là exclusion constraint trên `resource_pauses`, nên hai yêu cầu cùng lúc cũng chỉ một yêu cầu thành công.
3. **Áp dụng khi có lịch hẹn:** với từng lịch sắp tới dùng tài nguyên trong khoảng, chuyển sang tài nguyên cùng loại còn trống hoặc đặt vào "Cần xếp lại" (BR-93.26), trong cùng transaction.

Trả về 201 với `{ id, startsAt, endsAt, reason }` và, **khi có lịch hẹn**, `moved` (số lịch đã chuyển) và `requeued` (số lịch vào "Cần xếp lại").

| Status | `code` | Câu hiển thị (MH-46) |
|---|---|---|
| 409 | `PAUSE_OVERLAP` | "Khoảng này chồng với một khoảng đã tạm ngưng." |
| 409 | `RESOURCE_ARCHIVED` | Tải lại danh sách; tài nguyên hiện ở mục "Đã ngừng dùng" |

## 15. Mở lại tài nguyên

Tham chiếu: [Mở lại tài nguyên](./reference/branch-settings/resourcesReopen.mdx)

`DELETE /v1/tenants/{slug}/resources/{resourceId}/pauses/{pauseId}`

1. Khoảng đã kết thúc (`endsAt` không sau `Clock.now()`): **409** `PAUSE_ENDED`.
2. Khoảng đang diễn ra (`startsAt` không sau `Clock.now()`): đặt `endsAt` là `Clock.now()`; không xóa dòng, để giữ lịch sử.
3. Khoảng chưa bắt đầu: xóa dòng.

Trả về 204.

## 16. Ngừng dùng tài nguyên

Tham chiếu: [Ngừng dùng tài nguyên](./reference/branch-settings/resourcesArchive.mdx)

`POST /v1/tenants/{slug}/resources/{resourceId}/archive`, không có body.

1. Tài nguyên có loại nhân viên: **404** `NOT_FOUND`. Đã ngừng dùng, hoặc thuộc chi nhánh đã ngừng dùng: **409** `RESOURCE_ARCHIVED`.
2. Đặt `archived_at` bằng `Clock.now()`. Không xóa dòng, không đổi các khoảng tạm ngưng.
3. **Áp dụng khi có lịch hẹn:** xử lý lịch sắp tới dùng tài nguyên như bước 3 của [#14](#14-tạm-ngưng-tài-nguyên).

Trả về 200 với một phần tử như ở #10, kèm `moved`, `requeued` khi có lịch hẹn.

## Thử trong Scalar

Mọi tài khoản mẫu có mật khẩu `123456`. Dữ liệu mẫu có `toc-may` (gói `pro`, chủ `chinh@tocmay.vn`, quản lý `hung@tocmay.vn`) và `la-sen` (gói `basic`, chủ `ha.le@lasen.vn`), mỗi cơ sở một chi nhánh với tài nguyên như mock: Tóc Mây có Ghế 1 đến 3 (loại Ghế cắt) và Giường gội 1; Lá Sen có Giường 1 và 2, Bồn 1 và 2, Phòng xông 1 và 2. Id chi nhánh, loại, tài nguyên lấy từ phản hồi của #1, #6, #10. Danh sách ca nằm ở `apps/api/src/openapi/examples/branch-settings.ts`, và một test chạy từng ca trên dữ liệu mẫu để kiểm kết quả ghi dưới đây. Ca nào làm đổi dữ liệu thì chạy lại cho kết quả khác; `db:seed -- --reset` đưa về như ban đầu.

| Ca | Endpoint | Đăng nhập là | Đầu vào | Kết quả |
|---|---|---|---|---|
| Danh sách, gói Chuyên nghiệp | #1 | `chinh@tocmay.vn` | `slug = toc-may` | 200, một chi nhánh, `plan.name` là "Chuyên nghiệp", `plan.maxBranches` là `null` |
| Danh sách, gói Cơ bản | #1 | `ha.le@lasen.vn` | `slug = la-sen` | 200, một chi nhánh, `plan.name` là "Cơ bản", `plan.maxBranches` là 1 |
| Thêm chi nhánh | #2 | `chinh@tocmay.vn` | "Tóc Mây Quận 7", `0283 930 5678`, "12 Nguyễn Thị Thập, TP.HCM" | 201, giờ mặc định 08:00 đến 20:00, Chủ Nhật nghỉ |
| Vượt giới hạn gói | #2 | `ha.le@lasen.vn` | "Lá Sen Quận 1" | 403 `PLAN_LIMIT_REACHED`, `max` là 1 |
| Tên trùng | #2 | `chinh@tocmay.vn` | "tóc mây quận 3" | 409 `NAME_TAKEN` |
| Sai vai | #2 | `hung@tocmay.vn` | Như ca "Thêm chi nhánh" | 403 `FORBIDDEN` |
| Không thuộc cơ sở | #1 | `ha.le@lasen.vn` | `slug = toc-may` | 404 `NOT_FOUND` |
| Giờ nghỉ trưa | #4 | `chinh@tocmay.vn` | Thứ Hai 09:00–12:00 và 14:00–20:00, các ngày khác giữ nguyên | 200 |
| Khung chồng nhau | #4 | `chinh@tocmay.vn` | Thứ Hai 09:00–12:00 và 11:00–15:00 | 400 `VALIDATION_FAILED`, `openingHours.{i}.opens` |
| Ngày đóng cửa | #4 | `chinh@tocmay.vn` | `specialDays`: 2026-12-25, "Noel", `windows` rỗng | 200 |
| Ngừng dùng chi nhánh cuối | #5 | `ha.le@lasen.vn` | Chi nhánh duy nhất của Lá Sen | 409 `LAST_BRANCH` |
| Ngừng dùng chi nhánh thêm | #5 | `chinh@tocmay.vn` | Chi nhánh "Tóc Mây Quận 7" sau ca "Thêm chi nhánh" | 200 |
| Loại mới | #7 | `chinh@tocmay.vn` | "Bồn ngâm" | 201, `isStaff` là `false` |
| Đổi tên loại nhân viên | #8 | `chinh@tocmay.vn` | Loại "Thợ" | 409 `RESOURCE_TYPE_PROTECTED` |
| Xóa loại còn tài nguyên | #9 | `chinh@tocmay.vn` | Loại "Ghế cắt" | 409 `RESOURCE_TYPE_IN_USE` |
| Thêm tài nguyên | #11 | `chinh@tocmay.vn` | "Ghế 4", loại "Ghế cắt", chi nhánh Quận 3 | 201 |
| Đảo thứ tự | #13 | `chinh@tocmay.vn` | Ghế cắt: Ghế 3, Ghế 1, Ghế 2, Ghế 4 | 200 |
| Thứ tự thiếu id | #13 | `chinh@tocmay.vn` | Ghế cắt: chỉ Ghế 3 và Ghế 1 | 409 `ORDER_MISMATCH` |
| Tạm ngưng | #14 | `ha.le@lasen.vn` | "Bồn 1", từ 2026-12-01T01:00Z đến 2026-12-01T05:00Z, "Thay ống nước" | 201 |
| Khoảng chồng | #14 | `ha.le@lasen.vn` | "Bồn 1", từ 2026-12-01T03:00Z đến 2026-12-01T08:00Z | 409 `PAUSE_OVERLAP` |
| Mở lại | #15 | `ha.le@lasen.vn` | Khoảng vừa tạo | 204 |
| Ngừng dùng tài nguyên | #16 | `ha.le@lasen.vn` | "Phòng xông 2" | 200, `archivedAt` có giá trị |
