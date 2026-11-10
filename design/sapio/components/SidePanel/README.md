# SidePanel

Bảng bên phải lịch lễ tân (`aside.sp-side`, rộng 400px), dùng cho Tạo lịch hẹn (MH-26) và chi tiết lịch hẹn. Có tiêu đề và nút đóng ở `.sp-side__head`, nút cuối ở `.sp-side__foot`. Lịch vẫn nhìn thấy và bấm được bên trái, không có lớp phủ.

- **Tìm khách:** ô tìm theo số hoặc tên. Kết quả là `.sp-pick`, gồm các `.sp-pick__item` có `role="option"`, mục đang chọn mang `aria-selected="true"`. Khách đã chọn hiện riêng một thẻ (không còn danh sách) thì dùng `data-selected`, không có vai trò. Luôn có thêm hai lựa chọn cuối: "Khách mới với số …" và "Khách vãng lai" (không cần số).
- **Giờ, thợ điền sẵn** từ ô người dùng bấm trên lịch. Ô bấm hiện khối viền đứt `.sp-cal__target` "Lịch mới · 14:00–14:45".
- **Kiểm ngay:** dòng `.sp-fit--ok` ("Trống: Lan, Ghế 2. Xong lúc 14:45.") hoặc `.sp-fit--bad`. Dòng `--bad` nói rõ vướng người nào, tài nguyên nào, lúc nào. Khi không đặt được thì có 3 giờ gần nhất dạng `.sp-chip`, khối trên lịch đổi viền `danger`, nút Tạo tắt.
- **"Khách yêu cầu đích danh"** là hộp kiểm, mặc định tắt (BR-31).
- Trên điện thoại, cùng nội dung này mở thành `.sp-sheet` hoặc một trang riêng.
