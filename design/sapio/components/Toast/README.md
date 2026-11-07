# Toast

Thông báo ngắn sau một thao tác, hiện ở giữa phía dưới màn hình: vùng `.sp-toast-region` (đặt một lần mỗi trang) chứa các `.sp-toast` > `.sp-toast__text`, tùy chọn `button.sp-toast__action`.

- **Có Hoàn tác:** cho thao tác hay làm và đảo lại được: Check-in, kéo lịch hẹn sang giờ khác, đổi thợ, thêm dịch vụ. Thao tác chạy ngay, toast giữ 5 giây, dừng đếm khi rê chuột hoặc focus vào toast. Bấm "Hoàn tác" trả về đúng trạng thái trước và hiện "Đã hoàn tác.".
- **Chỉ báo:** sau một thao tác đã hỏi lại qua `ConfirmDialog` ("Đã thu 400.000 ₫ tiền mặt."), tự tắt sau 4 giây.
- **Lỗi:** `.sp-toast--danger`, `role="alert"`, nói rõ sai gì và làm gì tiếp; không tự tắt nếu có việc phải làm.
- Câu ở thì đã xong, có đối tượng và giờ: "Đã check-in chị Ngọc lúc 10:20." Tối đa 3 toast cùng lúc, mới nhất ở dưới.
- Có thanh điều hướng dưới (điện thoại) thì nâng vùng toast lên trên thanh đó.
- Người dùng component cung cấp: nội dung, có Hoàn tác hay không và hàm hoàn tác.
