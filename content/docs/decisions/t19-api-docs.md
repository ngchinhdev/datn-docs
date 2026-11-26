---
title: T-19. Tài liệu API sinh từ OpenAPI, xem bằng Scalar và fumadocs-openapi
---

- **Ngày:** 24/11/2026.
- **Nguồn:** `apps/api` sinh `openapi.json` từ controller NestJS và schema Zod trong `packages/shared`. Không viết tay schema ở nơi khác.
- **Giao diện ở `apps/api`:** Scalar ở `/docs` thay cho Swagger UI, cho gọi thử từng endpoint, xem code mẫu và tìm kiếm. Swagger UI chỉ là phần hiển thị, `@nestjs/swagger` vẫn sinh tài liệu.
- **Trong `datn-docs`:** fumadocs-openapi đọc bản sao `openapi/sapio.json` và sinh một trang cho mỗi endpoint ở `/docs/api/reference/<tag>/<operationId>`, chung menu và ô tìm kiếm với các trang tính năng và màn hình. Tên nhóm trong menu là mô tả của tag. Trang viết tay trong mục API (như [Xác thực](../api/auth.md)) chỉ ghi quyền, lỗi nghiệp vụ, quy tắc và thứ tự xử lý, và link tới trang tham chiếu của từng endpoint.
- **Đồng bộ:** chạy `pnpm sync:openapi` bằng tay mỗi khi API đổi (chép `../datn-saas/apps/api/openapi.json`, hoặc đường dẫn truyền vào), rồi commit `openapi/sapio.json` cùng PR docs của tính năng đó. Build, kể cả trên Vercel, chỉ đọc bản đã commit và không gọi mạng.
- **Gọi thử:** trang tham chiếu của `datn-docs` không có nút gọi thử (`playground.enabled: false`), vì bản triển khai không gọi được `localhost`. Gọi thử bằng Scalar ở `apps/api`.
- **Bản ghim:** `fumadocs-openapi` 12.5.8, bản mới nhất khớp `fumadocs-core` 16.17.10; từ 12.6.0 trở đi đòi `fumadocs-core` từ 16.17.11.
- **Vì sao không dùng Apidog hay API Blueprint:** cả hai đều viết đặc tả riêng ngoài code, nên mỗi API có hai bản và dễ lệch nhau. Apidog lưu tài liệu trên dịch vụ bên ngoài. Hệ công cụ của API Blueprint đã ngừng phát triển: Apiary đóng cửa ngày 31/10/2026. Apidog hay Postman vẫn dùng được để gọi thử, bằng cách nhập `openapi.json`.
