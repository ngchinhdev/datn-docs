# HoldBanner

Thanh báo giữ chỗ ở đầu các bước đặt lịch sau khi khách chọn giờ: `.sp-hold` > tiêu đề, đồng hồ `.sp-hold__time`, ghi chú, thanh còn lại `.sp-hold__bar`.

- Người dùng component cung cấp: giờ đã chọn, tài nguyên được giữ, thời điểm hết hạn do server trả về (không tự đếm từ lúc bấm).
- Đồng hồ dạng `mm:ss`, số thẳng cột; thanh chạy từ 100% về 0%. Gắn `role="status"` và `aria-label` đọc được ("Còn 7 phút 42 giây").
- Hết giờ: thay bằng thông báo "Chỗ đã được trả lại. Chọn giờ khác." và quay về `SlotPicker`.
