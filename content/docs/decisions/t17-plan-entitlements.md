---
title: T-17. Gói Sapio: gói và tính năng là dữ liệu, kiểm qua một hàm
---

Chốt ngày 08/11/2026 cùng [D-15](./d15-trial-and-two-plans.md).

- **Bảng:** đây là dữ liệu của nền tảng, không có `tenant_id`, nên không chịu RLS. Chỉ role của quản trị nền tảng được ghi.

  | Bảng | Nội dung |
  |---|---|
  | `plans` | `code`, `name`, `monthly_price_vnd`, `features` (mảng mã tính năng: `multi_branch`, `packages_wallet`, `commission`, `full_reports`, `chatbot`), `limits` (`{ "branches": 1 }`) |
  | `subscriptions` | Mỗi cơ sở một dòng: `tenant_id`, `plan_code`, `status`, `trial_ends_at`, `current_period_end`, `pending_plan_code` cho hạ gói kỳ sau |
  | `platform_payments` | Khoản thu của nền tảng, chỉ thêm không sửa, khóa idempotency theo mã giao dịch của cổng thanh toán |

- **Trạng thái của `subscriptions.status`:**

  | Từ | Sang | Khi nào |
  |---|---|---|
  | `trialing` | `active` | Thanh toán thành công |
  | `trialing` | `expired` | Quá `trial_ends_at` |
  | `active` | `active` | Gia hạn, nâng gói |
  | `active` | `expired` | Quá `current_period_end` |
  | `expired` | `active` | Thanh toán thành công |

  Khóa vi phạm là cờ riêng `tenants.locked_at` (BR-75), không trộn vào trạng thái gói.
- **Không tin vào job:** BullMQ có job đổi `status` lúc hết hạn và gửi email nhắc (BR-86). Nhưng mọi request đều tính quyền từ `Clock.now()` so với `trial_ends_at` và `current_period_end`. Job chậm thì quyền vẫn đúng, và test được bằng `Clock` giả.
- **Một hàm hỏi quyền:** `entitlements(tenant, now)` trả về `{ mode: 'trial' | 'active' | 'expired' | 'locked', features, limits }`. Trên đó có hai hàm:
  - `can(tenant, feature)`.
  - `canBook(tenant)`: chỉ `true` khi `active` và không bị khóa.
- **Ba chỗ kiểm quyền:**
  - Guard của Nest đặt trên từng route nghiệp vụ, khai báo bằng decorator `@RequiresFeature('chatbot')` và `@RequiresBooking()`.
  - Dịch vụ tạo lịch hẹn và giữ chỗ (lớp application) kiểm lại `canBook`, để không có đường tắt nào tạo được lịch.
  - Giao diện nhận `entitlements` để hiện ổ khóa, dải báo và chuyển hướng về trang gói. Giao diện chỉ để hiển thị, không thay cho kiểm ở API.
- **Lỗi trả về:** Problem Details. Hết hạn trả `402` `subscription-expired`. Thiếu tính năng trả `403` `plan-feature-required` kèm mã tính năng.
- **Thanh toán:** dùng lại `PaymentProvider` của tiền cọc. Webhook có chữ ký HMAC. Mỗi giao dịch chỉ được kích hoạt hoặc gia hạn một lần (BR-88), bằng ràng buộc unique trên mã giao dịch trong `platform_payments`.
- **Tính tiền nâng gói:** hàm thuần trong domain theo BR-85, có test thuộc tính (fast-check): kết quả luôn ≥ 0, làm tròn lên tới nghìn đồng, và bằng 0 khi còn 0 ngày.
- **Mock (`datn-docs`):** đổi trạng thái bằng `?plan=trial|basic|pro|expired` để xem dải báo, ổ khóa và màn hết hạn.
