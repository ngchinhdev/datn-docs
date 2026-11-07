# Button

Nút bấm, hai họ: nút quản trị (`.sp-btn` + `--primary` nền ngọc bích, `--secondary` nền `fill-tonal`, `--ghost` trong suốt, `--danger` nền `danger-soft`, cỡ `--sm`; không nút nào có viền) và nút trang khách (`.sp-btn--accent.sp-btn--lg`, thêm `--block` để rộng hết cột).

- Mỗi màn hình tối đa **một** `--primary` (quản trị) hoặc **một** `--accent` (trang khách), cho việc chính của màn hình.
- `--accent` chỉ dùng bên trong một phạm vi cơ sở (`.sp-tenant-may`, `.sp-tenant-pawpaw`); ngoài phạm vi đó nó không có màu.
- Nhãn là động từ, viết hoa chữ đầu: "Check-in", "Đổi giờ", "Đặt lịch". Thao tác về tiền hoặc khó đảo lại (thu tiền, hủy lịch, không đến) hỏi lại bằng `ConfirmDialog`; thao tác phá hủy dùng `--danger`. Xem mục "Xác nhận và hoàn tác" trong README chung.
- Người dùng component cung cấp: nhãn, `type`, `disabled`, và icon Lucide 16px (quản trị) hoặc 20px (trang khách) đặt trước nhãn nếu cần.
