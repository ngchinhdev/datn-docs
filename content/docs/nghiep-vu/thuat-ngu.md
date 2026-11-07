---
title: Thuật ngữ
description: Từ điển thuật ngữ nghiệp vụ và tên tương ứng trong code.
---

Dùng **đúng một tên** cho mỗi khái niệm, cả trong tài liệu lẫn trong code. Cột "Tên trong code" là quy ước đặt tên bảng, kiểu dữ liệu, module.

| Thuật ngữ | Tên trong code | Ý nghĩa |
|---|---|---|
| Khách thuê | `tenant` | Một cơ sở hoặc chuỗi cơ sở đăng ký dùng nền tảng |
| Thành viên | `membership` | Gắn một tài khoản với một khách thuê và một vai trò |
| Chi nhánh | `branch` | Một địa điểm của khách thuê |
| Ngành | `industry` | Salon, spa, spa thú cưng...; quyết định gói cấu hình nạp lúc tạo khách thuê |
| Gói cấu hình ngành | `industryTemplate` | Dữ liệu mẫu theo ngành: loại tài nguyên, dịch vụ mẫu, từ ngữ, chính sách mặc định, schema đối tượng phục vụ |
| Khách hàng | `customer` | Người đặt lịch và trả tiền tại một khách thuê; nhận diện theo số điện thoại chuẩn hóa |
| Đối tượng được phục vụ | `servedSubject` | Người hoặc vật được làm dịch vụ: chính khách hàng (salon) hoặc thú cưng của khách (spa thú cưng) |
| Tài nguyên | `resource` | Thứ có hạn cần đặt chỗ: nhân viên, phòng, ghế, bàn tắm, lồng sấy, máy |
| Hồ sơ nhân viên | `staffProfile` | Hai lớp: công khai (`displayName`, `avatar`, `title`, `specialty`, `bookableOnline`) cho trang khách; nội bộ (`fullName`, `employeeCode`, `phone`) chỉ trong quản trị (BR-15) |
| Loại tài nguyên | `resourceType` | Dịch vụ yêu cầu loại tài nguyên, hệ thống tự chọn tài nguyên cụ thể còn rảnh |
| Dịch vụ | `service` | Thứ khách đặt; có biến thể, giá, các đoạn chiếm dụng |
| Biến thể dịch vụ | `serviceVariant` | Cùng dịch vụ nhưng khác thời lượng, giá (tóc ngắn/dài, chó nhỏ/lớn) |
| Đoạn chiếm dụng | `serviceSegment` | Một khoảng thời gian trong dịch vụ mà một loại tài nguyên bị chiếm, ví dụ thợ bận 0–20', rảnh 20–50', bận 50–70' |
| Đoạn chờ | `segment.kind = 'wait'` | Đoạn mà nhân viên được rảnh nhưng ghế, phòng, lồng sấy vẫn bị chiếm (processing time) |
| Giờ trống | `availableSlot` | Thời điểm bắt đầu mà mọi đoạn chiếm dụng của dịch vụ đều xếp được |
| Giữ chỗ | `hold` | Các đoạn chiếm dụng tạm thời trong 10 phút khi khách đang hoàn tất đặt lịch |
| Lịch hẹn | `appointment` | Một lần khách đến, có thể gồm nhiều dịch vụ |
| Mục lịch hẹn | `appointmentItem` | Một dịch vụ cho một đối tượng được phục vụ trong lịch hẹn |
| Đặt chỗ tài nguyên | `resourceBooking` | Một đoạn chiếm dụng cụ thể trên một tài nguyên cụ thể; bảng có exclusion constraint |
| Hóa đơn | `invoice` | Tạo khi lịch hoàn thành hoặc lễ tân bán lẻ |
| Bút toán | `ledgerEntry` | Một dòng ghi sổ cái chỉ được thêm, không sửa, không xóa |
| Tài khoản sổ cái | `ledgerAccount` | Ví khách (tiền thật, tiền tặng), gói liệu trình, hoa hồng nhân viên... |
| Gói liệu trình | `package`, `customerPackage` | Nhiều buổi bán trước, dùng dần |
| Doanh thu thực hiện | `recognizedRevenue` | Doanh thu ghi nhận khi dịch vụ thực sự được làm, khác tiền đã thu trước |
| Quy tắc hoa hồng | `commissionRule` | Có `effectiveFrom`; không ảnh hưởng kỳ đã chốt |
| Kỳ hoa hồng | `commissionPeriod` | `open` hoặc `closed` |
| Sự kiện outbox | `outboxEvent` | Sự kiện ghi trong cùng transaction với thay đổi nghiệp vụ, worker xử lý sau |
| Khóa idempotency | `idempotencyKey` | Đảm bảo một thao tác gửi lặp chỉ có tác dụng một lần |
| Tỉ lệ lấp đầy | `utilization` | Thời gian nhân viên có khách ÷ thời gian nhân viên có ca |
| Tỉ lệ không đến | `noShowRate` | Số lịch "không đến" ÷ số lịch đã xác nhận |
