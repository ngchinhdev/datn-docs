# DetailPage

Trang chi tiết có phần xem trước: `.sp-detail` > `.sp-detail__main` (một `.sp-form`) + `aside.sp-detail__side` (các `.sp-panel`). Dùng cho Chi tiết dịch vụ (MH-45) và Gói cấu hình ngành (MH-59).

- **Cột phải** rộng tới 380px, dính khi cuộn (`position: sticky`). Chỉ chứa thứ đọc, không chứa trường nhập: xem trước trên lịch, khách thấy gì, tóm tắt, phiên bản.
- Hẹp hơn khoảng 1000px thì cột phải xuống dưới cột chính.
- **Panel:** `.sp-panel` có `.sp-panel__title` và `.sp-panel__note`. Danh sách số liệu hai cột dùng `.sp-kv` (`dl`, cột phải căn phải, số dạng tabular).
- **Nhóm trường rộng:** `.sp-form-section--stack`, tiêu đề ở trên, nội dung rộng hết khung. Dùng cho bảng và trục thời gian. Nút thêm ("Thêm đoạn") đặt bên phải tiêu đề, trong `.sp-form-section__head`.
- Bảng trong form dùng `.sp-table-wrap` (không có `.sp-table-card`, không phân trang).
- Trang không có menu cài đặt bên trái. Đường dẫn `.sp-breadcrumb` (Cài đặt / Dịch vụ / Nhuộm tóc) thay cho menu.
