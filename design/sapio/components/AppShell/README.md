# AppShell

Khung của mọi trang trong khu nội bộ (`/app/[tenant]`): `.sp-shell` > `nav.sp-shell__side` (thanh bên) + `.sp-shell__main` > `.sp-shell__content`.

- **Thanh bên:** hàng đầu `.sp-brand` (chữ Sapio và nút `.sp-icon-btn` thu gọn/mở rộng, `aria-expanded`, `aria-controls` trỏ tới thanh bên); dưới đó `.sp-switcher` trông như ô chọn có viền (dấu chữ cái màu của cơ sở, tên cơ sở, chi nhánh đang xem, mũi tên lên xuống `.sp-switcher__chevron`), bấm mở `.sp-menu` gồm danh sách chi nhánh (dấu ✓ ở chi nhánh đang xem), danh sách cơ sở khác của tài khoản và "Đăng ký cơ sở mới"; rồi `.sp-nav` gồm các `a.sp-nav__item` có icon Lucide 18px, nhóm bằng `.sp-nav__group`; dưới cùng là `.sp-account` (avatar, tên, vai trò, nút sáng/tối; bấm tên mở menu Hồ sơ, Đăng xuất). Mục đang mở: `aria-current="page"`, nền `brand-soft`, chữ `brand`. Số việc chờ xử lý: `.sp-nav__badge`.
- **Thu gọn:** từ 1200px người dùng bấm nút thu gọn để thanh bên còn dải icon 68px (`.sp-shell--collapsed`); lựa chọn lưu theo người dùng trên trình duyệt. Ở dải icon, mỗi mục có `aria-label` và `.sp-tooltip` khi rê chuột hoặc focus; số việc chờ đổi thành chấm nhỏ.
- **Ba bề rộng:** từ 1200px thanh bên 240px (thu gọn được); 768–1199px mặc định là dải icon, bấm mở rộng thì thanh bên trượt đè lên nội dung (`.sp-shell--expanded`), bấm ra ngoài hoặc Escape thì đóng; dưới 768px bỏ thanh bên, dùng `.sp-tabbar` cố định ở đáy (4 mục, mục cuối "Thêm" mở danh sách đầy đủ trong bảng trượt lên).
- **Mục theo vai trò** (chỉ hiện mục người đó có quyền):
  - Lễ tân: Hôm nay, Lịch, Khách hàng, Hóa đơn, Hoàn tiền.
  - Kỹ thuật viên: Lịch của tôi, Xin nghỉ, Hoa hồng.
  - Quản lý: thêm Xếp ca, Nghỉ phép, Báo cáo.
  - Chủ cơ sở: thêm Tổng quan, Hoa hồng, Cài đặt (trang cài đặt có `.sp-subnav` riêng).
- `.sp-shell__content` rộng tối đa 1200px, lề `space-6`; trang lịch dùng `--wide` để hết chiều ngang.
- Người dùng component cung cấp: vai trò hiện tại, cơ sở và chi nhánh, mục đang mở, số việc chờ.
