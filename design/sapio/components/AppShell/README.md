# AppShell

Khung của mọi trang trong khu nội bộ (`/app/[tenant]`) và khu super admin: `.sp-shell` > `nav.sp-shell__side` (thanh bên, nằm trên nền `surface`) + `.sp-shell__card` (card của trang) > `.sp-shell__bar` + `.sp-shell__scroll` > `.sp-shell__content`. Bản vẽ: `design/screens/Khung*.dc.html`.

- **Thanh bên** (248px, không nền, viền, bóng): `.sp-brand` (ô "S" `.sp-brand__mark`, chữ Sapio; khu super admin thêm dòng phụ `.sp-brand__sub`); `.sp-switcher` nền `fill-tonal` (dấu chữ cái màu của cơ sở, tên cơ sở, chi nhánh đang xem, `.sp-switcher__chevron`), bấm mở `.sp-menu` gồm chi nhánh (dấu ✓ ở chi nhánh đang xem), cơ sở khác của tài khoản và "Đăng ký cơ sở mới"; khu super admin không có ô này. Tiếp theo `.sp-nav` gồm các `.sp-nav__section`, mỗi section có `.sp-nav__group` (không in hoa) và các `a.sp-nav__item` có icon Lucide 18px. Mục đang mở: `aria-current="page"`, nền `brand-soft`, chữ `brand`. Số việc chờ: `.sp-nav__badge`.
- **Dưới cùng:** `.sp-shell__tools` (nút VI/EN và sáng/tối, `.sp-icon-btn--tonal`), rồi `.sp-account` nền `fill-tonal` (avatar, tên, vai trò, nút đăng xuất `.sp-account__out`). Bấm avatar hoặc tên mở menu Hồ sơ, Đăng xuất. Thanh bên cao bằng màn hình (`position: sticky; height: 100vh`) và tự cuộn khi có nhiều mục.
- **Tên đọc của ô đổi cơ sở:** không đặt `aria-label` lên nút (chữ nhìn thấy phải nằm trong tên đọc, axe `label-content-name-mismatch`). Chữ cái trên `.sp-switcher__mark` để `aria-hidden="true"`; trong nút thêm `<span class="sp-sr-only">Đổi cơ sở hoặc chi nhánh:</span>` trước tên cơ sở và chi nhánh. Nút có `aria-haspopup="menu"` và `aria-expanded`. Chữ cái lấy từ trường viết tắt của cơ sở (Tóc Mây "M"), không lấy chữ đầu của tên đầy đủ.
- **Card** (từ 768px): nền `surface-raised`, viền `line`, bóng `shadow-card`, bo 16px, cách mép 8px, cao `calc(100dvh - 16px)`. Chỉ `.sp-shell__scroll` cuộn; thanh bên và `.sp-shell__bar` đứng yên. Trang có bảng chiếm hết card dùng `.sp-shell__content--fill`.
- **Đầu card** `.sp-shell__bar`: nút thu gọn thanh bên (`aria-expanded`, `aria-controls` trỏ tới thanh bên), vạch ngăn, breadcrumb. Breadcrumb gồm nhóm menu của mục đang mở rồi tên mục; trang có `crumbs` trong `PageHeader` thì đưa chúng lên đây (từ 768px `PageHeader` không vẽ breadcrumb nữa).
- **Thu gọn:** từ 1200px bấm nút ở đầu card để thanh bên còn dải icon 68px (`.sp-shell--collapsed`); lựa chọn lưu theo người dùng trên trình duyệt. Ở dải icon, mỗi mục có `aria-label` và `.sp-tooltip`; số việc chờ đổi thành chấm nhỏ; hai nút công cụ xếp dọc, nút ngôn ngữ chỉ còn icon; thẻ tài khoản chỉ còn avatar.
- **Ba bề rộng:** từ 1200px thanh bên đầy đủ (thu gọn được); 768–1199px mặc định là dải icon, nút ở đầu card mở thanh bên đè lên card (`.sp-shell--expanded`), bấm ra ngoài hoặc Escape thì đóng; dưới 768px bỏ thanh bên và card, dùng `.sp-tabbar` cố định ở đáy (3 mục và "Thêm", mục cuối mở danh sách đầy đủ trong bảng trượt lên, trên cùng là nút VI/EN và sáng/tối). Ô đổi cơ sở lên **hàng đầu trang** (trái), nút chính của trang ở bên phải; tên rút gọn.
- **Ngôn ngữ:** nút VI/EN chỉ dịch phần khung (menu, breadcrumb mặc định, ô đổi cơ sở, thẻ tài khoản, `aria-label`); nội dung trang và tên riêng giữ tiếng Việt. Chữ ở `mock/shell-copy.ts`.
- **Mục theo vai trò** (chỉ hiện mục người đó có quyền):
  - Lễ tân: Hôm nay, Lịch, Khách hàng, Hóa đơn, Hoàn tiền.
  - Kỹ thuật viên: Lịch của tôi, Xin nghỉ, Hoa hồng.
  - Quản lý: thêm Xếp ca, Nghỉ phép, Báo cáo.
  - Chủ cơ sở: thêm Tổng quan, Hoa hồng, Cài đặt (trang cài đặt có `.sp-subnav` riêng).
- `.sp-shell__content` rộng tối đa 1200px, đệm 28px 32px; trang lịch dùng `--wide` để hết chiều ngang.
- Người dùng component cung cấp: vai trò hiện tại, cơ sở và chi nhánh, mục đang mở, số việc chờ.
