---
title: "T-07. Cô lập dữ liệu: RLS hai lớp"
---

- App kết nối DB bằng role `app_user` **không phải chủ bảng, không có `BYPASSRLS`**; migration chạy bằng role chủ sở hữu. Bật `ENABLE` và `FORCE ROW LEVEL SECURITY` trên mọi bảng có `tenant_id`.
- Policy (cả `USING` và `WITH CHECK`): `tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`. Sau transaction có `set_config(..., true)`, kết nối trong pool giữ giá trị `''` chứ không phải `NULL`; thiếu `nullif` thì truy vấn ngoài `withTenant()` báo lỗi ép kiểu thay vì trả về 0 dòng. Mỗi thao tác chạy trong transaction qua helper `withTenant(tenantId, tx => ...)`, helper gọi `select set_config('app.tenant_id', $1, true)` (tham số hóa, không nối chuỗi) trước khi chạy truy vấn.
- Việc liệt kê cơ sở của một tài khoản (trước khi chọn cơ sở) không có tenant để đặt. `memberships` có thêm policy `SELECT` cho dòng có `user_id = nullif(current_setting('app.user_id', true), '')::uuid`; helper `withUser(userId, tx => ...)` đặt `app.user_id` như `withTenant` đặt `app.tenant_id`, và chỉ đọc được. Không có hàm `SECURITY DEFINER` nào bỏ qua RLS.
- Tenant của request được guard xác định từ phiên đăng nhập hoặc slug công khai, giữ trong ngữ cảnh request (ví dụ `nestjs-cls`).
- Định nghĩa policy bằng `pgPolicy` của Drizzle khi được; phần còn lại ở migration SQL.
