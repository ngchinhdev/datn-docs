---
title: "T-06. Cơ sở dữ liệu: PostgreSQL 18 + Drizzle ORM v1 (RC)"
---

- PostgreSQL 18, image chính thức trong Docker Compose và Testcontainers. Bật extension `btree_gist` (cần cho exclusion constraint có `tenant_id WITH =`). Khóa chính dùng `default uuidv7()`, hàm có sẵn từ PostgreSQL 18.
- **Drizzle ORM:** bản v1 đang ở **1.0.0-rc.5** (21/10/2026), roadmap ghi 99,5%; dòng 0.x vẫn có bản vá. Chọn **v1 RC, ghim chính xác phiên bản**, nâng lên v1 stable khi phát hành. Lý do: tránh phải chuyển từ 0.x sang v1 giữa chừng (relational queries v2, định dạng migration mới).
- Migration bằng `drizzle-kit`. Những thứ drizzle-kit không biểu diễn được (exclusion constraint, trigger chặn UPDATE/DELETE sổ cái, `FORCE ROW LEVEL SECURITY`, grant cho role) viết bằng **migration SQL tùy chỉnh** và có test đi kèm.
- **Quy ước dữ liệu:**
  - Thời điểm: `timestamptz` (UTC). Mỗi chi nhánh có `timezone` (mặc định `Asia/Ho_Chi_Minh`).
  - Tiền: số nguyên **đồng** (`bigint`, kiểu number ở TypeScript); VND không có phần thập phân.
  - Khóa chính: UUIDv7. Mọi bảng nghiệp vụ có `tenant_id`.
  - Thời gian tính toán ngày giờ ở ứng dụng: `date-fns` + `@date-fns/tz`. Mọi chỗ cần "bây giờ" lấy qua dịch vụ `Clock` để test được.
