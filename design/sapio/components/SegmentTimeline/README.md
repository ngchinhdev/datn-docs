# SegmentTimeline

Trục thời gian của một biến thể dịch vụ: mỗi hàng là một loại tài nguyên, mỗi thanh là một khoảng nó bị chiếm. Dùng ở Chi tiết dịch vụ (MH-45) và Gói cấu hình ngành (MH-59).

- **Cấu trúc:**
  - `.sp-timeline` có `--total` là tổng số phút.
  - Hàng: `.sp-timeline__row` gồm `.sp-timeline__label` và `.sp-timeline__track`.
  - Thanh: `.sp-timeline__bar` có `--from` và `--to` (phút tính từ gốc).
  - Thước giờ: `.sp-timeline__scale` chứa các `.sp-timeline__tick` với `--at`.
- **Loại thanh:**
  - `--work` (Làm): nền `brand-soft`, vạch `brand` bên trái.
  - `--wait` (Chờ): vạch chéo giống đoạn chờ trên lịch.
  - `--buffer` (Chuẩn bị, Dọn dẹp): viền đứt, chữ mờ.
  - `--span`: hàng "Khách thấy", từ đầu đoạn Làm đầu tiên tới hết đoạn Làm cuối (BR-51).
- **Chọn đoạn:** thanh là `<button>`, đoạn đang sửa có `aria-pressed="true"` và viền `brand`. Thanh hẹp thì chữ bị cắt, tên đầy đủ nằm trong `title` và trong `.sp-sr-only`.
- **Chú thích:** `.sp-timeline__legend`, ô màu `.sp-kind--work|wait|buffer`. Ô màu này cũng đứng đầu mỗi dòng của bảng đoạn.
- **Bảng đoạn:** `.sp-table.sp-segtable`, mỗi dòng một đoạn:
  - nút kéo đổi thứ tự;
  - tên đoạn trên lịch;
  - loại (Chuẩn bị, Làm, Chờ);
  - số phút (`.sp-mins`);
  - các loại tài nguyên bị chiếm (nhóm `.sp-chip` có `aria-pressed`);
  - nút xóa.

  Đoạn Chờ tắt nút của loại nhân viên (BR-50). Dòng đang sửa có `aria-selected="true"`.
- **Dọn dẹp sau khi dùng:** khai theo từng loại tài nguyên, dưới bảng đoạn (BR-52). Trục tự vẽ thanh dọn ngay sau đoạn cuối dùng loại đó.
- **Thu nhỏ:** `.sp-timeline--mini` cho danh sách (dịch vụ mẫu) và điện thoại: không có thước giờ, thanh cao 16px, nhãn cột 44–76px.
- Người dùng component cung cấp: các đoạn, dọn dẹp theo loại, giờ ví dụ cho thước (mặc định 09:00), đoạn đang chọn.
