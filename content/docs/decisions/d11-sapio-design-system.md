---
title: D-11. Tên sản phẩm Sapio và hệ thống thiết kế
---

- **Tên:** Sapio, từ **sắp** (sắp lịch, sắp xếp) và chữ Latin *sapio* (khôn ngoan): xếp người, ghế, phòng và giờ một cách thông minh. Đã loại: Khớp (nghe như quảng cáo thuốc), Henly (trùng nhiều thương hiệu), Thoi, Tiemo. Có vài công ty khác ngành dùng tên Sapio (Sapio Research, Sapio Sciences); không ảnh hưởng đồ án.
- **Hướng thiết kế "ấm và chính xác"**, ghép từ ba sản phẩm tham khảo người dùng chọn: Mangomint (lịch nhiều cột, khối lịch hẹn màu dịu), Cal.com/Calendly (khung đơn sắc, chữ sắc, chọn giờ tối giản), MoeGo (trang khách thân thiện, góc tròn).
- **Hệ thống thiết kế** làm bằng Claude Design (loại Design System) trên claude.ai, tên "Sapio Design System", là nguồn sự thật cho màu, chữ, khoảng cách, góc và component. Gồm:
  - Theme sáng và tối, đạt tương phản WCAG AA.
  - Font Be Vietnam Pro.
  - Màu thương hiệu ngọc bích (`brand`); nút chính khu quản trị cũng màu ngọc (`primary`), đổi từ màu mực ngày 07/11 vì màu đen quá lạnh cho ngành dịch vụ và làm khu quản trị mất màu riêng.
  - 4 màu trạng thái lịch hẹn kèm bản nền nhạt.
  - Màu riêng từng cơ sở (`tenant-may`, `tenant-pawpaw`), gán qua `--accent`.
  - Token lịch: 16px mỗi 15 phút.
  - 8 component: Button, StatusBadge, AppointmentBlock, ResourceCalendar, ServiceCard, SlotPicker, HoldBanner, PhoneField.
- **Chi tiết nhận diện:** đoạn chờ vẽ vạch chéo; lịch hẹn khác đặt vào khe chờ của nhân viên thì vẽ thụt vào.
- **Trong code:** gán biến CSS của shadcn (`--background`, `--primary`, `--ring`...) từ token Sapio theo bảng trong README của hệ thống thiết kế; không để theme shadcn mặc định (`neutral` + Geist).
