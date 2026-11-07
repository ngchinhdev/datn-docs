---
title: Kế hoạch code giao diện mock
description: Các bước code hai màn hình đầu (luồng đặt lịch của khách, lịch lễ tân) vào /mock theo thiết kế Sapio, kèm điều kiện "Xong khi". Viết để Claude Code trên máy làm theo.
---

> **Dành cho Claude Code:** làm lần lượt từng bước trong repo `datn-docs`, mỗi bước một commit (Conventional Commits, tiếng Anh). Trước khi viết giao diện, đọc `design/README.md` và `design/sapio/README.md`. **Không tự đặt màu, cỡ chữ, góc, bóng**: chỉ dùng biến trong `design/sapio/tokens.css` và class trong `design/sapio/components.css`. Bố cục, chữ và số liệu lấy theo file `design/screens/*.dc.html` tương ứng. Gặp chỗ thiết kế chưa nói rõ: chọn cách đơn giản nhất phù hợp README, ghi lại trong mô tả PR mục "Tự quyết". Làm trên nhánh `feat/ui-mock`, xong mở pull request, **không merge**: người review là phiên claude.ai.

## Bước 1. Đưa hệ thống thiết kế vào app

- Chép `design/sapio/tokens.css` và `design/sapio/components.css` vào `app/sapio/` (giữ nguyên nội dung, thêm dòng đầu `/* Copied from design/sapio, do not edit here */`). Bỏ dòng `@import` Google Fonts trong `components.css`; font nạp bằng `next/font/google` (`Be_Vietnam_Pro`, weight 400/500/600/700, subsets `latin` và `vietnamese`), gán vào biến `--font-sans`.
- Import hai file trong `app/layout.tsx`, sau `global.css`.
- Trong `app/global.css`, gán biến shadcn/Fumadocs từ token Sapio theo bảng "Dùng trong code" ở cuối `design/sapio/README.md` (cả `:root` lẫn `.dark`). Theme tối của Fumadocs dùng lớp `.dark`: thêm quy tắc để `.dark` nhận các giá trị của `[data-theme="dark"]` (hoặc đặt `data-theme` theo theme hiện tại), sao cho `/docs` và `/mock` cùng đổi theme.
- Xóa mọi màu shadcn mặc định (`neutral`) còn sót trong `global.css`.

**Xong khi:** `/docs` và `/mock` hiện font Be Vietnam Pro, nút chính màu ngọc, theme tối đổi đúng ở cả hai; `grep -rn "#[0-9a-fA-F]\{3,6\}" app components mock --include=*.tsx` không ra màu nào ngoài file token đã chép.

## Bước 2. Dữ liệu giả cho ngày 07/11/2026

- `mock/fixtures/types.ts`: thêm `StaffProfile` hai lớp theo [Thuật ngữ](../nghiep-vu/thuat-ngu.md) và BR-15: công khai `displayName`, `title`, `specialty`, `avatarUrl?`, `bookableOnline`; nội bộ `fullName`, `employeeCode`, `phone`. Cập nhật `Staff` dùng `StaffProfile`.
- Đổi `ServedSubject.kind` từ `'self' | 'pet'` thành `'self' | 'other'`; loài, giống, cân nặng nằm trong `attributes` (ghi chú ERD ở tiến độ 07/11).
- Thêm lịch hẹn ngày 07/11/2026 cho Tóc Mây đúng như `design/screens/LeTanChiTiet.dc.html` và `LeTanTaiNguyen.dc.html`: chị Hà (nhuộm ngắn, Mai, Ghế 1, đã check-in), anh Tuấn (cắt ngắn, Mai trong khe chờ, Ghế 2, hoàn thành), chị Ngọc, chị Vy, anh Phúc (không đến), giữ chỗ 10:30 của Lan, anh Bảo An, chị Vân, chị Thư. Mỗi lịch hẹn có các đoạn chiếm dụng (`resourceBooking`) theo nhân viên và tài nguyên, giờ lưu UTC.
- Thêm `mock/availability.ts`: hàm thuần trả giờ trống theo (dịch vụ, biến thể, ngày, nhân viên hoặc "bất kỳ"). Trong mock được phép tính đơn giản từ giờ mở cửa trừ các đoạn đã đặt, bước 15 phút; **không** cần đúng hoàn toàn: thuật toán thật nằm ở `datn-saas/packages/scheduling-core`. Ghi rõ điều này ở comment đầu file.

**Xong khi:** `pnpm typecheck` xanh; trang `/mock` cũ vẫn chạy.

## Bước 3. Component React dùng chung

Tạo trong `components/sapio/`, mỗi component bọc đúng class của `components.css`, props có kiểu, không thêm style riêng ngoài layout:

`Button`, `StatusBadge`, `AppointmentBlock` (nhận các đoạn, tự tính `top`/`height` từ giờ, 16px mỗi 15 phút), `ResourceCalendar` (nhận danh sách cột và lịch hẹn, có vạch giờ hiện tại), `DateStrip`, `SlotGrid`, `StaffPicker` (dòng "Bất kỳ ai · Đổi" + bảng trượt lên, BR-14), `ServiceVariantList`, `HoldBanner` (đếm ngược từ thời điểm hết hạn), `PhoneField`, `BottomBar`.

Giờ hiện tại của mock cố định ở **Thứ Bảy 07/11/2026 10:20** (giờ Việt Nam) qua một hằng số `MOCK_NOW`, không dùng `Date.now()`.

**Xong khi:** mỗi component có một ví dụ trên trang `/mock/components` (trang nội bộ, không cần đẹp).

## Bước 4. Luồng đặt lịch của khách: `/mock/dat-lich`

Theo `Main.dc.html`, `KhachChonTho.dc.html`, `KhachDesktop.dc.html`, phần chọn bé của `KhachMotTrang.dc.html`.

- Một route, bước lưu trong state (hoặc `?step=`), đổi tenant bằng bộ chọn có sẵn ở `/mock`. Màu nhấn lấy từ lớp `.sp-tenant-may` / `.sp-tenant-pawpaw` trên phần tử gốc.
- Các bước: **Dịch vụ** (danh sách dịch vụ và biến thể) → **Cho bé nào?** (chỉ khi ngành có đối tượng khác khách, tức Pawpaw; lọc biến thể theo BR-13) → **Ngày giờ** (dòng chọn thợ + bảng trượt, dải 7 ngày, giờ theo buổi) → **Thông tin** (tên, `PhoneField`, ô OTP giả: mã nào 6 số cũng đúng) → **Xác nhận** (tóm tắt, tiền cọc nếu có, trạng thái "Đã xác nhận").
- Chọn giờ là bắt đầu giữ chỗ 10 phút (BR-07): `HoldBanner` hiện ở các bước sau; hết giờ thì quay về bước Ngày giờ với thông báo "Chỗ đã được trả lại. Chọn giờ khác."
- Thanh dưới cùng cố định trên điện thoại; từ 900px trở lên dùng bố cục hai cột như `KhachDesktop.dc.html`.

**Xong khi:** đi hết luồng ở cả hai tenant, ở bề rộng 390px và 1280px, chỉ bằng bàn phím (Tab, Enter, Space) cũng làm được; không có màu đen làm nền ở đâu.

## Bước 5. Lịch lễ tân: `/mock/le-tan`, `/mock/le-tan/tai-nguyen`, `/mock/hom-nay`

Theo `LeTanChiTiet.dc.html`, `LeTanTaiNguyen.dc.html`, `LeTanTablet.dc.html`, `LeTanDienThoai.dc.html`, `LeTanHangCho.dc.html`.

- Hai tab **Nhân viên** (mặc định) và **Tài nguyên** là hai route; một lịch hẹn chỉ hiện một lần trong mỗi kiểu xem.
- Bấm một lịch hẹn mở bảng chi tiết: cột bên phải ở ≥ 1200px, ngăn trượt đè lên lịch ở 768–1199px, trang riêng hoặc bảng trượt lên ở < 768px.
- Dưới 768px: tab chọn từng nhân viên, thẻ "Tiếp theo", thanh điều hướng dưới như `LeTanDienThoai.dc.html`.
- Nút trong bảng chi tiết (Hoàn thành và thu tiền, Đổi giờ, Thêm dịch vụ) chỉ cần đổi trạng thái trong state của trang và hiện thông báo; không cần lưu.
- `/mock/hom-nay`: danh sách Đang làm, Chờ thanh toán, Sắp đến; nút Check-in đổi trạng thái lịch hẹn sang "Đã check-in".

**Xong khi:** ba bề rộng 1440px, 1024px, 390px hiển thị đúng như canvas; bấm qua lại hai tab thấy lịch hẹn của chị Hà có vạch chờ bên cột Mai và liền khối bên cột Ghế 1.

## Bước 6. Hoàn tất

- Cập nhật `mock/screens.ts`: các màn đã làm chuyển trạng thái "Đang làm"; tách "Trang đặt lịch của khách" thành "Trang cơ sở" (chưa làm) và "Luồng đặt lịch".
- `pnpm build`, `pnpm typecheck`, `pnpm exec prettier --check app components lib mock` xanh (CI chạy đúng các lệnh này).
- Mở pull request vào `main` với mô tả: đã làm gì theo từng bước, mục "Tự quyết", ảnh chụp ba bề rộng nếu chụp được. Ghi một mục vào [Tiến độ](../du-an/tien-do.md).

## Câu lệnh gợi ý cho Claude Code

```
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md,
datn-docs/design/README.md và datn-docs/design/sapio/README.md.
Thực hiện datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md từ Bước 1,
trên nhánh feat/ui-mock, mỗi bước một commit, kiểm tra "Xong khi" trước khi
sang bước sau. Xong thì mở pull request, không merge. Dừng lại hỏi mình nếu
thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```
