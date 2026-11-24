---
title: T-04. Backend: NestJS 12, ESM, Express
---

- NestJS 12 (27/08/2026, bản 12.3.x): gói lõi là ESM; `nest new` hỏi chọn CJS hay ESM → **chọn ESM**. Dự án ESM mặc định dùng **Vitest** và **oxlint**.
- **Validation bằng Standard Schema:** `@Body()`, `@Query()`, `@Param()` nhận tùy chọn `schema` (Zod, Valibot, ArkType); đăng ký `StandardSchemaValidationPipe` toàn cục. Schema dùng chung từ `packages/shared` cho cả form ở FE và validation ở BE; cùng schema sinh tài liệu OpenAPI. Lưu ý: kiểu tham số handler vẫn phải khai báo bằng `z.infer<...>`.
- `@nestjs/config` 12 validate qua Standard Schema → validate biến môi trường bằng Zod, app không khởi động nếu thiếu biến.
- Nest 12.1 có sẵn cookie, chống CSRF, security header: dùng bản dựng sẵn thay vì tự cài helmet, csurf.
- Logger: `ConsoleLogger` của Nest 12 mặc định ghi log có cấu trúc; thêm request id cho mỗi request. Không dùng `@nestjs/observe` (khóa vào Nest, không cần cho đồ án).
- **Cấu trúc module theo miền nghiệp vụ:**

  | Module | Trách nhiệm |
  |---|---|
  | `tenancy` | Khách thuê, chi nhánh, gói cấu hình ngành, ngữ cảnh tenant cho mỗi request |
  | `identity` | Tài khoản, phiên đăng nhập, membership, vai trò, OTP khách |
  | `catalog` | Dịch vụ, biến thể, đoạn chiếm dụng, giá, loại tài nguyên, tài nguyên |
  | `staffing` | Nhân viên, kỹ năng, ca làm, nghỉ phép |
  | `customers` | Khách hàng, đối tượng được phục vụ, ghi chú |
  | `scheduling` | Gọi `scheduling-core` để tính giờ trống; giữ chỗ; lịch hẹn; đổi, hủy, không đến |
  | `billing` | Hóa đơn, thanh toán, `PaymentProvider`, webhook, hoàn tiền |
  | `ledger` | Sổ cái: ví, gói liệu trình, doanh thu thực hiện |
  | `commission` | Quy tắc, kỳ, bút toán hoa hồng |
  | `notifications` | Email, nhắc lịch |
  | `reporting` | Báo cáo chỉ đọc |
  | `assistant` | Chatbot (tool calling) |
  | `platform` | Outbox, hàng đợi, realtime gateway, audit log, health |

- Mỗi module tách 3 lớp: **controller** (HTTP, validation) → **application service** (transaction, quyền, điều phối) → **domain** (hàm thuần, không I/O, dễ test) + **repository** (Drizzle). Logic tiền, hoa hồng, chính sách hoàn cọc viết ở lớp domain.
- API: REST, tiền tố `/v1`; lỗi theo định dạng Problem Details (RFC 9457) với mã lỗi nghiệp vụ (ví dụ `SLOT_TAKEN`); phân trang theo cursor; OpenAPI + Swagger UI tại `/docs` (dùng cho phụ lục báo cáo).
