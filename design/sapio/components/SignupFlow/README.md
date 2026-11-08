# SignupFlow

Bố cục các trang công khai nhiều bước (đăng ký cơ sở, sau này đăng nhập, quên mật khẩu): `.sp-auth` > `.sp-auth__top` (chữ Sapio, link phụ bên phải) + `main.sp-auth__main` (rộng 560px; `--wide` 1080px cho bước có bảng xem trước).

- **Các bước:** `.sp-steps` với 5 vạch (`data-state="done"` cho bước đã qua, `aria-current="step"` cho bước hiện tại), nhãn từng bước dưới vạch. Dưới 768px ẩn nhãn, hiện một dòng `.sp-steps__caption` "Bước 3/5 · Ngành".
- **Đầu trang:** `.sp-auth__title` (28px, 24px trên điện thoại) và `.sp-auth__lead` nói bước này để làm gì.
- **Nhóm nội dung:** `.sp-auth__card`. Nút ở cuối trang trong `.sp-auth__actions`: "Quay lại" (phụ) bên trái, nút chính bên phải ghi việc sắp làm ("Tiếp tục với Salon tóc", "Tạo cơ sở"). Trên điện thoại thanh nút dính đáy.
- **Lưu dở:** từ bước 3, link "Lưu và làm tiếp sau" ở `.sp-auth__top`. Quay lại bằng đăng nhập.
- **Lỗi** hiện ngay dưới ô (`.sp-field--error`). Ô địa chỉ kiểm định dạng khi rời ô, kiểm còn trống sau khi ngừng gõ 500 ms; còn trống thì `.sp-field--ok` với dòng "toc-may.sapio.vn còn trống".
- **Số lượng:** `.sp-qty` (− số +) cho số tài nguyên ban đầu.
- **Mật khẩu** theo BR-73: dòng gợi ý dưới ô, nút hiện/ẩn, cho dán.
