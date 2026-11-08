# AffectedList

Danh sách lịch hẹn bị ảnh hưởng khi nhân viên nghỉ phép hoặc bị bớt ca (MH-40). Dạng `ul.sp-affected`, mỗi `li.sp-affected__item` gồm ba cột:
- giờ;
- tên khách, dịch vụ, badge cách khách chọn ("Bất kỳ ai" hoặc "Chọn đích danh …");
- các nút xử lý.

Dòng `.sp-affected__fix` nói cách xử lý: gợi ý, đang chờ, hoặc đã xong.

- **Đã xử lý:** `data-done`, nền `surface`, nút "Hoàn tác".
- **Không ai trống:** `.sp-affected__fix--bad`, gợi ý giờ gần nhất, kèm "Hủy và báo khách".
- **Đang chờ khách trả lời:** chữ thường, ghi giờ đã gửi và hạn trả lời (BR-33).
- **Tiến độ:** `.sp-progress` (role `progressbar`) đặt trên danh sách, ghi "N lịch bị ảnh hưởng · M đã xử lý". Nút Duyệt ở thanh lưu tắt cho tới khi xử lý xong (BR-34).
- Dưới 640px, các nút xuống dòng dưới nội dung.
