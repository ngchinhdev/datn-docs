# ShiftGrid

Lưới ca tuần (MH-38): `table.sp-shiftgrid`, hàng là nhân viên (tên, cấp, tổng giờ trong tuần), cột là 7 ngày. Mỗi khung ca là một `.sp-shift` (nút, bấm để sửa).

- **Một ngày có thể nhiều khung:** mỗi khung một `.sp-shift`, xếp dọc.
- **Trạng thái của ô:**
  - `--off`: nghỉ, viền mảnh.
  - `--leave`: nghỉ phép, màu của trạng thái không đến, kèm badge Chờ duyệt hoặc Đã duyệt.
  - `--warn`: khung vừa sửa mà còn lịch bên ngoài, viền `danger`.
- Ô đang sửa có `aria-selected="true"`. Bảng sửa ca nằm ở `SidePanel` bên phải: các khung giờ, "Thêm khung trong ngày", "Áp cho mọi Thứ … từ nay", và cảnh báo các lịch không còn người làm (BR-35).
- **Hàng chân "Mở cửa":** giờ mở cửa từng ngày, kèm cảnh báo khoảng giờ mở cửa mà không ai trực.
- Lưới nằm trong `.sp-table-wrap` và cuộn ngang bên trong khi hẹp; dưới 768px đổi thành danh sách theo ngày.
