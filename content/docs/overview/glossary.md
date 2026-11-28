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
| Khách hàng | `customer` | Người đặt lịch và trả tiền tại một khách thuê; nhận diện theo số điện thoại chuẩn hóa |
| Tài nguyên | `resource` | Thứ có hạn cần đặt chỗ: nhân viên, ghế, giường, phòng, bồn, máy |
| Hồ sơ nhân viên | `staffProfile` | Hai lớp: công khai (`displayName`, `avatar`, `title`, `specialty`, `bookableOnline`) cho trang khách; nội bộ (`fullName`, `employeeCode`, `phone`) chỉ trong quản trị (BR-15) |
| Loại tài nguyên | `resourceType` | Dịch vụ yêu cầu loại tài nguyên, hệ thống tự chọn tài nguyên cụ thể còn rảnh |
| Dịch vụ | `service` | Thứ khách đặt; có biến thể, giá, các đoạn chiếm dụng |
| Biến thể dịch vụ | `serviceVariant` | Cùng dịch vụ nhưng khác thời lượng, giá (tóc ngắn/dài, liệu trình 60/90 phút); khách tự chọn khi đặt (BR-13) |
| Nhóm dịch vụ | `serviceGroup` | Tiêu đề gom dịch vụ ở trang khách và danh sách (Cắt, Nhuộm và uốn); dịch vụ không nhóm hiện cuối dưới tên "Khác" (BR-94.7) |
| Tên trên lịch | `shortName` | Nhãn ngắn của biến thể trên lịch lễ tân, tối đa 20 ký tự (BR-94.18) |
| Giá gốc, giá riêng chi nhánh | `priceVnd`, `branchPrices` | Giá của biến thể; chi nhánh có thể đặt giá riêng, không đặt thì dùng giá gốc (BR-02, BR-94.29) |
| Đoạn chiếm dụng | `serviceSegment` | Một khoảng thời gian trong dịch vụ mà một loại tài nguyên bị chiếm, ví dụ thợ bận 0–20', rảnh 20–50', bận 50–70' |
| Đoạn chờ | `segment.kind = 'wait'` | Đoạn mà nhân viên được rảnh nhưng ghế, giường, phòng vẫn bị chiếm (processing time) |
| Đoạn chuẩn bị | `segment.kind = 'prep'` | Đoạn đầu dịch vụ, trước giờ hẹn, khách không thấy; ví dụ thợ pha thuốc (BR-51) |
| Đoạn làm | `segment.kind = 'work'` | Đoạn mà mọi tài nguyên đã chọn cùng bận |
| Dọn dẹp sau khi dùng | `cleanupMinutes` (theo loại tài nguyên của biến thể) | Số phút một tài nguyên còn bận sau đoạn cuối dùng nó (BR-52) |
| Gốc | `origin` | Đầu đoạn đầu tiên của một mục; mọi đoạn tính phút từ gốc. Giờ khách thấy = gốc + thời lượng chuẩn bị |
| Mẫu chiếm dụng | `occupation` | Các khoảng (tính từ gốc) mà một loại tài nguyên bị chiếm trong một biến thể, đã gồm dọn dẹp |
| Cấp nhân viên | `staffLevel` | Bậc của nhân viên (Thợ, Thợ chính, Thợ cả); biến thể có thể có giá theo cấp (BR-56) |
| Giờ trống | `availableSlot` | Thời điểm bắt đầu mà mọi đoạn chiếm dụng của dịch vụ đều xếp được |
| Giữ chỗ | `hold` | Các đoạn chiếm dụng tạm thời trong 10 phút khi khách đang hoàn tất đặt lịch |
| Lịch hẹn | `appointment` | Một lần khách đến, có thể gồm nhiều dịch vụ |
| Mục lịch hẹn | `appointmentItem` | Một dịch vụ cho một người trong lịch hẹn: người đặt, hoặc người đi cùng khi đặt nhóm (BR-19) |
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
