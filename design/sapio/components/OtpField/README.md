# OtpField

Ô nhập mã xác nhận 6 số dạng 6 ô vuông: `.sp-otp` chứa 6 `.sp-otp__slot` và **một** `input.sp-otp__input` thật phủ lên trên.

- **Một ô nhập thật, không phải 6 ô:**
  - Input có `autocomplete="one-time-code"`, `inputmode="numeric"`, `maxlength="6"`, `pattern="[0-9]*"`, gắn `<label>` "Mã xác nhận".
  - Nhờ vậy dán cả mã, tự điền mã từ email hoặc SMS, trình đọc màn hình và phím xóa đều chạy như ô thường.
  - Các ô vuông chỉ vẽ lại từng ký tự.
  - Trong code dùng `InputOTP` của shadcn/ui (thư viện `input-otp`).
- **Ô đang nhập** có viền 2px màu `--accent` (trang khách) hoặc `--brand` (Sapio), kèm con trỏ nhấp nháy. Người dùng bật giảm chuyển động thì con trỏ không nhấp nháy.
- **Gõ đủ 6 số thì tự gửi.** Nút "Xác nhận" vẫn để lại cho người dùng bàn phím và trình đọc màn hình.
- **Sai mã:** thêm `.sp-otp--error`, dòng lỗi nói rõ còn mấy lần thử (BR-16), rồi xóa mã và focus về ô đầu.
- Dùng cho cả xác thực email lúc đăng ký cơ sở (MH-02) và đăng nhập của khách (MH-12, MH-16).
