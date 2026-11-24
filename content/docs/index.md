---
title: Tổng quan
description: Tài liệu đồ án tốt nghiệp - nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn.
---

**Đề tài:** Xây dựng nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn.

**Sinh viên:** Nguyễn Ngọc Chính (26410176), Trường Đại học Công nghệ Thông tin, ĐHQG-HCM. **Giảng viên hướng dẫn:** ThS. Nguyễn Thị Thùy Trâm.

## Đề tài giải quyết gì

Salon, nail, spa (và các cơ sở dịch vụ theo lịch hẹn nói chung) phải xếp lịch trên **nhiều loại tài nguyên cùng lúc**: nhân viên, ghế, phòng, máy. Một dịch vụ có thể chiếm các tài nguyên khác nhau ở các đoạn thời gian khác nhau, ví dụ nhuộm tóc có đoạn chờ thuốc lên màu mà thợ được rảnh nhưng ghế vẫn bận. Nền tảng tính đúng giờ trống, chống đặt trùng khi nhiều người đặt cùng lúc, và nối liền lịch hẹn với thanh toán, ví, gói liệu trình, hoa hồng nhân viên, báo cáo. Lõi không gắn với ngành nào: spa thú cưng được hỗ trợ chỉ bằng cấu hình.

## Đọc từ đâu

| Mục | Nội dung |
|---|---|
| [Phạm vi](./overview/scope.md) | Bài toán, phạm vi, vai trò, 8 bài toán khó, thực nghiệm E1–E9 |
| [Đề cương](./overview/proposal.md) | Bản đã gửi giảng viên |
| [Thuật ngữ](./overview/glossary.md) | Tên gọi thống nhất giữa tài liệu và code |
| [Tính năng](./features/auth.md) | Mỗi tính năng: phạm vi, quy tắc, luồng, tiêu chí chấp nhận |
| [Quy tắc nghiệp vụ](./features/business-rules.md) | Danh mục BR-xx chưa tách theo tính năng |
| [Màn hình](./screens/index.md) | Danh sách MH-xx và đặc tả từng màn |
| [API](./api/index.md) | Quy ước, quyền, lỗi nghiệp vụ của từng nhóm API |
| [Kiến trúc](./architecture/overview.md) | Thành phần, ERD, thuật toán giờ trống, kiểm thử |
| [Quyết định](./decisions/index.md) | D-xx (sản phẩm), T-xx (kỹ thuật) |
