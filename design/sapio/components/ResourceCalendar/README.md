# ResourceCalendar

Lưới lịch của lễ tân: mỗi cột một tài nguyên, trục dọc là thời gian. `.sp-cal` (đặt `--cols` bằng số cột), hàng đầu `.sp-cal__head` (tên + loại tài nguyên), cột thước `.sp-cal__ruler` với `.sp-cal__hour`, mỗi tài nguyên một `.sp-cal__col` chứa các `AppointmentBlock`.

- Người dùng component cung cấp: danh sách tài nguyên theo thứ tự hiển thị, khoảng giờ mở cửa, các lịch hẹn đã tính `top`/`height`, giờ hiện tại.
- Chiều cao cột = số ô 15 phút × `slot-height`. Kẻ giờ bằng `line`, nửa giờ bằng `surface-sunken`.
- Ngoài giờ mở cửa: `.sp-cal__closed` (nền `surface-sunken`). Giờ hiện tại: `.sp-cal__now` trên mọi cột.
- Thiếu chỗ ngang thì `.sp-cal` tự cuộn ngang, cột không hẹp hơn `column-min-width`; tiêu đề cột dính trên cùng khi cuộn dọc.
- Trong app, mỗi lần chỉ xem một kiểu: **Nhân viên** (mặc định) hoặc **Tài nguyên**; không đặt cột nhân viên và cột ghế chung một lưới, vì một lịch hẹn sẽ hiện hai lần. Preview đặt cạnh nhau chỉ để minh họa khác biệt giữa hai kiểu.
- Ví dụ: chị Hạnh nhuộm chiếm Mai 09:00–09:30 và 10:15–10:45 (kiểu Nhân viên: có vạch chờ), nhưng chiếm Ghế 1 suốt 09:00–10:45 (kiểu Tài nguyên: liền khối); anh Tuấn được xếp vào khe chờ của Mai.
- **Tạo từ ô trống:** bấm một ô thì hiện `.sp-cal__target` (viền đứt `brand`) và mở `SidePanel` với giờ, người điền sẵn.
- **Kéo thả (MH-27):**
  - Trong lúc kéo, mỗi cột phủ `.sp-cal__drop` ở chỗ thả được (nền `brand-soft` nhạt) và `.sp-cal__drop--blocked` ở chỗ không được (gạch chéo `danger-soft`).
  - Khối đang kéo mang `--dragging`, chỗ cũ mờ đi. Nhãn `.sp-drag-label` đi theo, ghi giờ mới, người và tài nguyên.
  - Esc để hủy kéo.
  - Thả lịch "Bất kỳ ai" là đổi ngay, kèm toast Hoàn tác. Thả lịch khách chọn đích danh sang người khác thì mở `ConfirmDialog` (BR-32).
- Đoạn chuẩn bị nằm trước giờ mở cửa thì vẫn vẽ trên vùng `.sp-cal__closed`.
