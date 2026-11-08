# FormSection

Mẫu trang form cho mọi màn mức **Form**: `.sp-form` > nhiều `section.sp-form-section` (cột trái tiêu đề và giải thích, cột phải `.sp-form-section__fields` hai cột) > `.sp-savebar`.

- **Nhóm trường:** mỗi nhóm một việc ("Hồ sơ công khai", "Kỹ năng", "Lịch làm"), câu giải thích ngắn nói hậu quả của trường, ghi BR nếu có. Dưới 900px hai cột thành một.
- **Trường:** dùng `.sp-field` của PhoneField, thêm `--sm` (cao 40px) cho khu quản trị; `select` và `textarea` (`.sp-field__control--area`) chung kiểu; đơn vị sau ô bằng `.sp-field__suffix` ("phút", "₫"); trường không bắt buộc ghi `(không bắt buộc)`, không đánh dấu sao cho trường bắt buộc. Lỗi: `.sp-field--error` + câu nói rõ sửa thế nào.
- **Bật/tắt:** `.sp-switch` cho thiết lập có hiệu lực ngay khi lưu ("Nhận đặt lịch online"); `.sp-check` cho chọn nhiều (kỹ năng, ngày trong tuần).
- **Lưu:** `.sp-savebar` chỉ hiện khi có thay đổi, dính đáy vùng nội dung: "Còn 2 thay đổi chưa lưu", nút "Bỏ thay đổi" (ghost) và "Lưu" (primary). Rời trang khi còn thay đổi thì hỏi lại. Lưu xong toast "Đã lưu hồ sơ Mai.".
- **Trang cài đặt:** cột trái `.sp-subnav` (Chi nhánh, Dịch vụ, Tài nguyên, Nhân sự, Gói liệu trình, Chính sách, Thương hiệu, Thanh toán, Thông báo, Chatbot, Nhật ký); dưới 900px ẩn menu này: trang `/settings` thành danh sách các mục (mỗi mục một dòng, bấm vào trang riêng, có nút quay lại).
- **Nhóm trường rộng:** `.sp-form-section--stack` (tiêu đề trên, nội dung rộng hết khung) cho bảng, trục thời gian; xem `DetailPage`. `textarea` trong `.sp-field--sm` tự cao theo số dòng.
- Người dùng component cung cấp: các nhóm, trường, giá trị ban đầu, kiểm tra hợp lệ (schema Zod dùng chung, quy tắc 8).
