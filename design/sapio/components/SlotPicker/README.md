# SlotPicker

Chọn ngày rồi giờ trên trang khách: dải 7 ngày `.sp-dates` (`button.sp-date`, `aria-pressed`), các nhóm giờ `.sp-slots` (`button.sp-slot`), và `.sp-empty` khi một buổi hết giờ.

- Đặt trong phạm vi cơ sở (`.sp-tenant-*`); ngày và giờ đang chọn tô `--accent`, chữ `--on-accent`.
- Người dùng component cung cấp: danh sách giờ trống do API tính (đã xét đủ mọi đoạn chiếm dụng), ngày đóng cửa (`disabled`, gạch ngang), giờ gần nhất còn trống để gợi ý.
- Chỉ hiện giờ còn trống, không hiện giờ bận bị làm mờ. Chia theo buổi (sáng, chiều, tối).
- Chọn giờ là bắt đầu giữ chỗ: sau khi bấm, hiện `HoldBanner`.
