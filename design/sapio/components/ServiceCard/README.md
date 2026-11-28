# ServiceCard

Thẻ một dịch vụ trên trang khách, mỗi biến thể là một lựa chọn radio: `.sp-service` > `.sp-service__name` + các `label.sp-variant` (radio, tên + thời lượng, giá).

- Đặt trong phạm vi cơ sở (`.sp-tenant-*`): biến thể chưa chọn nền `fill-tonal`; đang chọn nền `--accent-soft` và viền trong 1.5px `--accent`.
- Người dùng component cung cấp: tên dịch vụ, mô tả một dòng, các biến thể (tên, thời lượng tính bằng phút, giá VND định dạng `vi-VN`).
- Không nói về "đoạn chờ" với khách; chỉ hiện tổng thời lượng.
- Spa: biến thể theo thời lượng ("Massage body 60 phút", "Massage body 90 phút"); khách tự chọn.
