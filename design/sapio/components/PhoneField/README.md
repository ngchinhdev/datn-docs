# PhoneField

Ô nhập có nhãn, tiền tố và dòng hướng dẫn: `.sp-field` > `.sp-field__label`, `.sp-field__control` (tiền tố `.sp-field__prefix` + `input`), `.sp-field__help`; lỗi thêm `.sp-field--error`.

- Người dùng component cung cấp: `id` ổn định, nhãn, giá trị, thông báo lỗi. Lỗi nối với ô bằng `aria-describedby`, ô có `aria-invalid="true"`.
- Số điện thoại: `type="tel"`, `inputmode="tel"`; chấp nhận `0912…`, `+84912…`, `84912…` và chuẩn hóa trước khi gửi (BR-61).
- Cỡ chữ trong ô 16px để điện thoại không tự phóng to. Placeholder là ví dụ, không thay cho nhãn.
