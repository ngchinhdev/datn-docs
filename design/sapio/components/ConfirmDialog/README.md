# ConfirmDialog

Hộp hỏi lại trước một thao tác về **tiền** hoặc **khó đảo lại**: `dialog.sp-dialog` mở bằng `showModal()` > `.sp-dialog__title`, tùy chọn `.sp-dialog__body` hoặc bảng số `dl.sp-dialog__facts`, rồi `.sp-dialog__actions`.

- Dùng khi: Hoàn thành và thu tiền, Hoàn tiền, Hủy lịch, Đánh dấu không đến, xóa dữ liệu, duyệt nghỉ phép có lịch bị ảnh hưởng. Không dùng cho thao tác hay làm và đảo lại được (dùng `Toast` có Hoàn tác).
- Tiêu đề là câu hỏi nêu **động từ, đối tượng và con số**: "Thu 400.000 ₫ của chị Hà?", "Hủy lịch 11:00 của chị Ngọc?". Không viết "Bạn có chắc không?".
- Nút xác nhận lặp lại động từ và con số ("Thu 400.000 ₫", "Hủy lịch"), không viết "OK", "Đồng ý". Nút còn lại luôn là "Quay lại" (`--secondary`), đứng bên trái; trên điện thoại hai nút chia đôi hàng.
- Thao tác phá hủy dùng `--danger`; thu tiền dùng `--primary`. Mỗi hộp một nút chính.
- Focus đầu tiên vào "Quay lại". Escape và bấm ra ngoài bằng "Quay lại". Đóng xong, focus về nút đã mở hộp.
- Nền phủ (`::backdrop` hoặc `.sp-scrim`) pha từ `surface`, không dùng nền đen.
- Người dùng component cung cấp: tiêu đề, nội dung hoặc các dòng số, nhãn và kiểu nút xác nhận, hàm xử lý. Đang xử lý thì khóa cả hai nút và đổi nhãn ("Đang thu…").
