---
title: "T-03. Frontend: Next.js 16.4 + React 19.3"
---

- Next.js 16.4 (06/10/2026) ra mắt kèm React 19.3; `create-next-app` mặc định **bật Cache Components**, đây là mô hình sẽ thành mặc định ở Next 17 → dùng ngay từ đầu.
- **Chiến lược render:**
  - Trang đặt lịch công khai `/[slug]`: thông tin cơ sở, danh mục dịch vụ, giá được cache bằng `'use cache'` + `cacheTag('tenant:<id>:catalog')`, xóa cache khi chủ tiệm sửa cấu hình. **Giờ trống không bao giờ cache**, luôn render theo request hoặc lấy ở client.
  - Trang quản lý: dữ liệu theo người dùng, động; Server Component lấy dữ liệu ban đầu từ API (chuyển tiếp cookie), phần tương tác (lịch lễ tân, luồng đặt lịch) dùng **TanStack Query** ở client, Socket.IO báo thay đổi thì invalidate query.
  - **Server Actions không chứa nghiệp vụ.** Mọi quy tắc nằm ở NestJS; nếu dùng Server Action thì chỉ là lớp gọi API mỏng.
- Next 16 đổi `middleware.ts` thành **`proxy.ts`**: dùng cho chuyển hướng khi chưa đăng nhập và chuẩn hóa slug. Không kiểm tra quyền ở đây (quyền kiểm tra ở API).
- Form: `react-hook-form` + resolver Zod, dùng **chung schema** với API từ `packages/shared`.
- UI: Tailwind CSS 4 + shadcn/ui preset `base-nova` (Base UI, màu nền `neutral`, icon lucide), cùng bộ với repo mock để chuyển component sang dễ dàng.
- **Lịch lễ tân tự dựng** (CSS grid theo tài nguyên × thời gian, kéo thả bằng `dnd-kit`). Lý do: chế độ resource timeline của FullCalendar thuộc gói Premium cần license; tự dựng còn hiển thị được đoạn chờ theo đúng mô hình đoạn chiếm dụng. Kiểm tra lại license nếu muốn dùng FullCalendar.
- Bật React Compiler nếu không gặp lỗi (Next 16 hỗ trợ `reactCompiler: true`).
