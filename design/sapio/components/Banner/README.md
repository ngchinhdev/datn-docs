# Banner

Thông báo cho cả tài khoản, nằm sát trên cùng vùng nội dung của `AppShell`: `.sp-banner` > `.sp-banner__text` + một nút. Không đóng được, vì nó phản ánh trạng thái (dùng thử, sắp hết hạn).

- **Dùng thử:** nền `brand-soft`. Câu "**Dùng thử · còn 5 ngày** (đến 23:59 ngày 13/11). Đặt lịch online và tạo lịch hẹn mở khi kích hoạt gói.", nút "Kích hoạt gói".
- **Sắp hết kỳ** (còn 3 ngày trở xuống): `.sp-banner--warning`. Câu "Gói Chuyên nghiệp hết hạn 23:59 ngày 30/11. Gia hạn để không gián đoạn.", nút "Gia hạn".
- `role="status"`. Mỗi trang chỉ có một dải báo; khi có nhiều thông báo thì hiện cái quan trọng nhất.
