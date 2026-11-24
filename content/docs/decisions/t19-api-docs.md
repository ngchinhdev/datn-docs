---
title: T-19. Tài liệu API sinh từ OpenAPI, xem bằng Scalar và fumadocs-openapi
---

- **Ngày:** 24/11/2026.
- **Nguồn:** `apps/api` sinh `openapi.json` từ controller NestJS và schema Zod trong `packages/shared`. Không viết tay schema ở nơi khác.
- **Giao diện ở `apps/api`:** Scalar ở `/docs` thay cho Swagger UI, cho gọi thử từng endpoint, xem code mẫu và tìm kiếm. Swagger UI chỉ là phần hiển thị, `@nestjs/swagger` vẫn sinh tài liệu.
- **Trong `datn-docs`:** fumadocs-openapi đọc bản `openapi.json` mới nhất và sinh trang tham chiếu ngay trong `/docs`, chung menu và ô tìm kiếm với các trang tính năng và màn hình. Trang viết tay trong mục API (như [Xác thực](../api/auth.md)) chỉ ghi quyền, lỗi nghiệp vụ, quy tắc và thứ tự xử lý.
- **Cập nhật `openapi.json`:** `apps/api` có script xuất file. File được chép vào `datn-docs` khi API đổi (bằng tay hoặc CI).
- **Vì sao không dùng Apidog hay API Blueprint:** cả hai đều viết đặc tả riêng ngoài code, nên mỗi API có hai bản và dễ lệch nhau. Apidog lưu tài liệu trên dịch vụ bên ngoài. Hệ công cụ của API Blueprint đã ngừng phát triển: Apiary đóng cửa ngày 31/10/2026. Apidog hay Postman vẫn dùng được để gọi thử, bằng cách nhập `openapi.json`.
