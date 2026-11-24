---
title: "T-15. Route của web: tiếng Anh, slug cơ sở trong URL"
---

Chốt ngày 07/11/2026 cùng [Danh sách màn hình](../screens/index.md). Phần trang khách được thay bằng [T-16](./t16-tenant-subdomains.md) (tên miền con).

- **Route tiếng Anh**, chữ thường, nối bằng gạch ngang, danh từ số nhiều cho tập hợp, cùng từ với [Thuật ngữ](../overview/glossary.md) và REST API (`/app/toc-may/customers` ↔ `GET /v1/customers`). Chữ trên màn hình vẫn là tiếng Việt. Tài liệu `/docs` giữ đường dẫn tiếng Việt.
- **Bốn khu:** công khai của Sapio (`/`, `/signup`, `/login`), trang khách của một cơ sở (`/[tenant]/...`), khu nội bộ (`/app/[tenant]/...`), quản trị nền tảng (`/admin/...`). Trong `apps/web` là bốn route group của App Router, mỗi group một layout; `proxy.ts` kiểm phiên cho `/app` và `/admin`.
- **Slug cơ sở nằm trong URL cả ở khu nội bộ:** mở hai cơ sở ở hai tab không lẫn nhau, link gửi đồng nghiệp mở đúng cơ sở. Server lấy tenant từ slug, kiểm tài khoản có membership ở tenant đó rồi mới đặt `app.tenant_id` cho RLS (T-07); slug không phải là quyền.
- **Trạng thái xem trong query** (`?date=`, `?view=`, `?branch=`, `?step=`): chia sẻ link và tải lại không mất.
- **Slug** theo BR-72 (danh sách từ dành riêng).
- **Mock** trong `datn-docs` dùng đúng route thật, thêm tiền tố `/mock`.
- **Vì sao không giữ tenant trong phiên** (`/app/calendar`): gọn URL hơn nhưng hai tab hai cơ sở dùng chung phiên sẽ ghi nhầm dữ liệu; link chia sẻ không mang theo cơ sở.
