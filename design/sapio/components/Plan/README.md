# Plan

Thẻ gói Sapio đặt cạnh nhau: `.sp-plans` (2 cột, 1 cột dưới 768px) > `section.sp-plan` (`--current` cho gói đang dùng hoặc đang dùng thử) gồm `.sp-plan__head` (tên + nhãn), `.sp-plan__price` + `.sp-plan__unit`, `.sp-plan__note`, `ul.sp-plan__features`, nút chọn.

- Cùng một danh sách tính năng, cùng thứ tự ở mọi thẻ. Tính năng không có trong gói: `li[data-off]`, dấu gạch thay dấu ✓, chữ mờ, kèm chữ ẩn "Không có:".
- Ô chọn thời hạn (`Segmented`: 1 tháng, 3 tháng −10%, 12 tháng −20%) đặt **trên** các thẻ, dùng chung; giá trong thẻ đổi theo thời hạn (hiện giá mỗi tháng và tổng).
- Gói đang dùng có nút chính (`--primary`); gói còn lại nút phụ. Nút ghi động từ cụ thể: "Chọn Chuyên nghiệp", "Gia hạn Cơ bản", "Nâng cấp, trả 147.000 ₫".
- Dưới các thẻ ghi một câu về đổi gói: nâng gói có hiệu lực ngay, trả phần chênh cho số ngày còn lại; hạ gói từ kỳ sau.
- **Tính năng bị khóa** theo gói: ổ khóa `.sp-lock` (14px, `ink-muted`) bên phải mục trên thanh bên hoặc menu cài đặt; mở trang đó thì hiện thẻ giải thích tính năng làm gì, bảng tiền nâng gói (`dl.sp-dialog__facts`) và nút "Nâng cấp, trả …". Không ẩn hẳn mục để người dùng biết tính năng tồn tại.
- Giá và danh sách tính năng lấy từ dữ liệu gói (quản trị nền tảng cấu hình), không viết cứng trong giao diện.
