# ChoiceCard

Lựa chọn lớn có icon, tiêu đề và mô tả, dùng cho lựa chọn quan trọng có ít phương án (chọn ngành lúc đăng ký): `.sp-choices` (lưới 2 cột, 1 cột dưới 768px) > `label.sp-choice` chứa `input type="radio"` thật (ẩn khỏi mắt, vẫn focus được), `.sp-choice__mark` (dấu ✓ góc phải khi chọn), `.sp-choice__icon`, `.sp-choice__title`, `.sp-choice__desc`.

- Đang chọn: nền `brand-soft`, viền `brand` 1,5px, icon chuyển sang nền `surface-raised` màu `brand`.
- Nhóm có `role="radiogroup"` và nhãn trỏ tới tiêu đề câu hỏi; phím mũi tên chuyển lựa chọn (do radio có sẵn).
- Mô tả nói hệ quả cụ thể ("Ghế cắt, giường gội"), không quảng cáo.
- Khi chọn có hệ quả cần xem trước (gói ngành), đặt bảng xem trước bên cạnh (máy tính) hoặc ngay dưới (điện thoại) và cập nhật theo lựa chọn.
