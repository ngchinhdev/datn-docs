---
title: D-15. Dùng thử 7 ngày và hai gói Sapio, thay cho duyệt tay
---

> **Cập nhật theo [D-16](./d16-beauty-only-scope.md):** gói cấu hình ngành đã bỏ; câu so sánh với nó chỉ còn ý nghĩa lịch sử.

Chốt ngày 08/11/2026 khi thiết kế MH-02 Đăng ký cơ sở.

- **Bối cảnh:** bản đầu cho tự đăng ký rồi chờ quản trị nền tảng duyệt mới mở trang đặt lịch. Không có bước chặn thì dễ có tiệm ảo, trang giả mạo để lừa khách đặt cọc. Thực tế các nền tảng chặn bằng **thanh toán** chứ không bằng duyệt tay: Mangomint cho tự thiết lập miễn phí, tính tiền khi bắt đầu nhận khách.
- **Chọn:**
  - Tự đăng ký, **dùng thử 7 ngày** chỉ để cấu hình và xem thử (BR-80, BR-81).
  - Muốn nhận lịch thì **kích hoạt gói**. Có hai gói, **Cơ bản** và **Chuyên nghiệp**, giá và tính năng là dữ liệu (BR-83 đến BR-85).
  - Hết hạn thì chỉ còn trang mua gói (BR-82).
  - Bỏ bước duyệt tay. Quản trị nền tảng chỉ khóa cơ sở vi phạm (BR-75) và cấu hình gói, giá.
- **Phạm vi:**
  - Thanh toán qua `MockPaymentProvider` (D-09). Mục 3.3 của roadmap vẫn ghi "không thu phí nền tảng **thật**".
  - Đây là **phần thêm so với đề cương đã gửi**: cần báo cô ở buổi gặp tiếp theo. Cô không đồng ý thì quay lại bước duyệt tay; giao diện chỉ đổi màn "Đã tạo" và MH-58.
- **Vì sao trong dùng thử không cho đặt lịch:** không có lịch hẹn nào treo khi hết hạn, và tiệm ảo không thu được tiền của khách. Nhờ vậy không cần duyệt tay.
- **Vì sao hai gói:** giống sản phẩm thật. Kiến trúc "gói là dữ liệu, code hỏi qua `can()`" (T-17) cùng tinh thần với gói cấu hình ngành. Chi phí thêm khoảng 3–5 ngày, nằm ở giai đoạn 4.
- **Demo khi bảo vệ:** cơ sở chính dùng gói Chuyên nghiệp; thêm một cơ sở gói Cơ bản để cho thấy chatbot bị khóa đúng cách; dùng `Clock` giả để tua tới lúc hết dùng thử.
