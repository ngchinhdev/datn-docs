# Segmented

Chọn một trong 2–4 lựa chọn ngang hàng: `.sp-segmented` > `.sp-segmented__item`. Mục đang chọn nổi lên nền `fill-selected` và `shadow-xs`; không dùng màu nhấn, để màu nhấn dành cho giờ và ngày đang chọn.

- Đổi trang (Nhân viên / Tài nguyên): dùng `<nav>` với `a` và `aria-current="page"`.
- Đổi nội dung trong trang (Sáng / Chiều / Tối): `role="tablist"`, mục `role="tab"` + `aria-selected`; phím mũi tên trái/phải chuyển mục.
- Chọn một giá trị trong biểu mẫu (Cả ngày / Vài giờ, thời hạn gói): `<div role="group">` với nhãn, các mục là nút bật tắt `aria-pressed`; không dùng `role="radio"` cùng `aria-pressed`.
- Trang khách thêm `--lg` (cao 44px, bo tròn) và `--block` (rộng hết cột).
- `.sp-segmented__count` ghi số lựa chọn bên trong (số giờ trống mỗi buổi). Buổi không còn giờ thì `disabled`, vẫn hiện để khách biết.
