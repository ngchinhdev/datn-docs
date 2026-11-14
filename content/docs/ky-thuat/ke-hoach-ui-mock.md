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

## Bước 7. Sửa theo review PR #2

Review ngày 07/11/2026 (phiên claude.ai, đã xem bản deploy ở 390px, 1024px, 1280px, 1440px, hai theme). Hệ thống thiết kế đã cập nhật: `design/sapio/README.md` (mục "Xác nhận và hoàn tác", "Trang khách"), component mới `ConfirmDialog`, `Toast`, `Segmented`, token `fill-selected`; bản chép `app/sapio/*.css` đã cập nhật sẵn. Quyết định: [D-13](../du-an/quyet-dinh.md#d-13-otp-của-khách-gửi-qua-email-không-qua-sms), [D-14](../du-an/quyet-dinh.md#d-14-mẫu-xác-nhận-thao-tác-và-cách-hiện-giờ-trống); quy tắc BR-16, BR-17. Làm tiếp trên nhánh `feat/ui-mock`, mỗi mục 7a–7f một commit, đẩy lên cùng PR #2.

### 7a. Component mới và sửa component cũ

- Thêm `ConfirmDialog` (bọc `<dialog>` + `showModal()`), `Toast` kèm `useToast()` (một vùng `.sp-toast-region` trong layout của `/mock`, hỗ trợ nút Hoàn tác, dừng đếm khi rê chuột hoặc focus), `Segmented` theo README của từng component. Thêm ví dụ vào `/mock/components`.
- `StaffPicker` dùng nền phủ `.sp-scrim` thay cho lớp `bg-(--surface) opacity-70` tự viết.
- `AppointmentBlock`: không đặt `<div>` trong `<button>`; đổi thành `<span className="block ...">` (HTML không cho phần tử khối trong nút).
- `ResourceCalendar`: bỏ `role="grid"`/`columnheader`/`gridcell` (lưới thiếu `role="row"` nên axe báo lỗi). Mỗi cột là `<section aria-label="Mai, Thợ chính, 3 lịch hẹn">`, khối lịch hẹn là nút có tên đọc được.
- Tab Nhân viên / Tài nguyên ở lễ tân dùng `Segmented` dạng `<nav>`.

### 7b. Luồng đặt lịch của khách

- **Giờ theo buổi (D-14):** thay các nhóm giờ bằng `Segmented` Sáng / Chiều / Tối (`--lg --block`, có số giờ mỗi buổi), mỗi lần hiện một buổi; mặc định buổi sớm nhất còn giờ, đổi ngày thì chọn lại; buổi hết giờ để `disabled`. Theo `design/sapio/components/SlotPicker/`.
- **Máy tính ≥ 900px:** làm đúng `KhachDesktop.dc.html`: cột trái gồm tóm tắt cơ sở, dịch vụ đã chọn, **danh sách thợ dạng dọc** (cùng dữ liệu và BR-14 như bảng trượt), giờ đã chọn và nút chính; cột trái `position: sticky` để nút chính luôn nhìn thấy ở 1280×800. Bảng trượt chọn thợ chỉ dùng dưới 900px.
- **OTP qua email (D-13, BR-16):** bước Thông tin có Họ và tên, Số điện thoại, Email. "Gửi mã" gửi tới email: "Đã gửi mã 6 số tới thu@example.com." Bỏ mọi chữ "tin nhắn". Mã nào 6 số cũng đúng (giữ như cũ). Màn Đã đặt lịch ghi "Đã gửi email xác nhận tới …".
- **Pawpaw, bước "Cho bé nào?" (BR-17):** luôn có lựa chọn "Thêm bé" như `KhachMotTrang.dc.html` (tên, loài, cân nặng; giá biến thể lọc theo BR-13 ngay khi nhập). Thêm tham số `?khach=moi` cho `/mock/dat-lich`: khách mới không có bé đã lưu, chỉ có "Thêm bé"; mặc định là khách cũ như hiện tại. Bộ chọn ở `/mock` có thêm "Khách cũ / Khách mới".
- **Xác nhận:** nút cuối "Xác nhận đặt lịch" (không thêm hộp hỏi). Bảng tóm tắt không để nhãn xuống dòng ("Liên hệ"): nhãn một dòng, giá trị xuống dòng nếu dài.
- **Đã đặt lịch:** bỏ mũi tên quay lại và "Bước 4/4"; thêm ba việc: "Thêm vào lịch điện thoại" (tải file `.ics` tạo tại chỗ), "Xem lịch hẹn của bạn", "Về trang Tóc Mây". Hai nút sau chỉ cần thông báo "chưa có trong mock".
- Chữ gợi ý trong ô nhập dạng "Ví dụ: Nguyễn Minh Thư", "Ví dụ: 0912 345 678".

### 7c. Lịch lễ tân và Hôm nay

- **Xác nhận theo D-14:**
  - "Hoàn thành và thu tiền" và "Thu tiền" (trang Hôm nay) mở `ConfirmDialog`: tiêu đề "Thu 400.000 ₫ của chị Hà?", bảng giá dịch vụ, đã cọc, còn phải thu, chọn Tiền mặt / Chuyển khoản; nút "Thu 400.000 ₫". Xong hiện toast "Đã thu 400.000 ₫ tiền mặt. Lịch hẹn hoàn thành."
  - "Đánh dấu không đến" và "Hủy lịch" (thêm vào bảng chi tiết, kiểu `--danger`, chỉ hiện khi hợp lệ) mở `ConfirmDialog` nêu giờ, thợ và tiền cọc theo BR-23.
  - "Check-in" chạy ngay, toast "Đã check-in chị Ngọc lúc 10:20." có Hoàn tác 5 giây.
- **Ẩn nút không còn hợp lệ:** lịch hoàn thành không còn Check-in, Đổi giờ, Thêm dịch vụ, Thu tiền; lịch không đến hoặc đã hủy chỉ còn xem.
- **Mở trang không chọn sẵn lịch hẹn** ở dưới 1200px (ngăn trượt che cột Hùng ở 1024px). Từ 1200px, cột phải khi chưa chọn hiện `.sp-empty` "Chọn một lịch hẹn để xem chi tiết.".
- **Đổi ngày:** nút ngày trước, ngày sau và "Hôm nay" chạy thật trên dữ liệu 7a–7d; ngày đóng cửa hiện vùng `surface-sunken` toàn cột với dòng "Đóng cửa: …".

### 7d. Dữ liệu một tuần, cả hai cơ sở

- Dữ liệu từ **Thứ Hai 02/11 đến Chủ Nhật 08/11/2026** cho cả Tóc Mây và Pawpaw. Ngày 07/11 của Tóc Mây giữ nguyên như hiện tại (khớp canvas). Pawpaw có lịch 07/11 riêng, dùng được ở lịch lễ tân (chọn tenant Pawpaw ở `/mock`).
- Các ngày khác sinh bằng hàm có seed cố định (`mock/fixtures/generate.ts`, không dùng `Math.random()` không seed), mỗi lần chạy cùng kết quả, mỗi ngày 6–14 lịch hẹn, đúng kỹ năng (BR-03) và không chồng tài nguyên (BR-01). Ngày đã qua có lịch Hoàn thành, Không đến, Đã hủy; ngày tới chỉ có Đã xác nhận.
- Phải có, mỗi trường hợp ít nhất một lần (ghi danh sách vào comment đầu file):
  - Mai kín lịch Chủ Nhật 08/11 → trang khách hiện Mai mờ, "Hết giờ ngày này" (BR-14).
  - Lan nghỉ Thứ Ba 03/11 (thêm `StaffTimeOff` vào `types.ts`) → không có cột lịch hẹn, cột ghi "Nghỉ".
  - Một ngày đặc biệt đóng cửa (`specialDays`, ví dụ Thứ Hai 09/11 bảo trì) → trang khách gạch ngày đó, lễ tân thấy "Đóng cửa".
  - Một ngày chỉ có 1–2 lịch hẹn (gần trống).
  - Lịch hẹn nhiều dịch vụ (gội, cắt, nhuộm nối nhau, có đoạn chờ).
  - Lịch đã hủy (vẽ gạch ngang theo README), khách tên dài trên 30 ký tự, lịch có ghi chú dài.
  - Pawpaw: một khách hai bé đặt cùng giờ (đặt nhóm), một bé trên 10 kg (biến thể giá khác), lồng sấy là tài nguyên bận trong đoạn chờ của thợ.
- `mock/availability.ts` dùng dữ liệu mới (giữ comment "không phải thuật toán thật").

### 7e. Khung `/mock`

- **Nút sáng/tối** ở thanh trên của `/mock` (ba trạng thái Sáng / Tối / Theo máy, dùng `useTheme` của provider đang có trong `app/layout.tsx`), đổi một chỗ thì `/docs` và `/mock` cùng đổi.
- **Bộ chọn vai trò theo trang:** vai trò đang sáng suy ra từ route (`/mock/dat-lich` → Khách, `/mock/le-tan*` và `/mock/hom-nay` → Lễ tân, `/mock` → theo query như cũ). Bấm vai trò thì chuyển sang trang chính của vai trò đó, giữ `tenant`.
- Trên điện thoại, thanh chọn của mock thu gọn thành một dòng (tenant · vai trò · nút mở rộng), để màn hình thật không bị đẩy xuống 170px.

### 7f. Kiểm tra và hoàn tất

- Thêm `@axe-core/playwright` vào script kiểm tra Playwright đang dùng; chạy trên `/mock/dat-lich` (mỗi bước), `/mock/le-tan`, `/mock/le-tan/tai-nguyen`, `/mock/hom-nay`: 0 lỗi mức serious/critical ở cả hai theme.
- `pnpm build`, `pnpm typecheck`, `pnpm exec prettier --check app components lib mock` xanh.
- Cập nhật mô tả PR #2 (mục "Đã sửa theo review" theo 7a–7e, "Tự quyết" mới nếu có) và một mục [Tiến độ](../du-an/tien-do.md).

**Xong khi:**
- Ở 1280×800, bước Ngày giờ của khách thấy nút Tiếp tục mà không cuộn, danh sách thợ nằm ở cột trái.
- Không còn chữ "tin nhắn" trong `app/` và `components/`.
- Đi hết luồng khách mới của Pawpaw bằng "Thêm bé".
- Mọi nút thu tiền, không đến, hủy lịch đều qua hộp xác nhận. Check-in có Hoàn tác.
- Lịch lễ tân bấm được qua 7 ngày, ở cả hai cơ sở, thấy đủ các trường hợp ở 7d.
- Nút sáng/tối đổi cả `/docs` lẫn `/mock`.
- Kiểm tra axe không có lỗi serious/critical.

## Bước 8. Route tiếng Anh, khung ứng dụng, mẫu danh sách và form

Sau khi PR #2 merge. Căn cứ:
- [T-15](./quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url) và [Danh sách màn hình](../thiet-ke/man-hinh.md).
- Các màn đã chốt trong `design/screens/QuanTri*.dc.html` (bảng ở `design/README.md`).
- README của `AppShell`, `DataTable`, `FormSection` trong `design/sapio/components/`, và mục "Khu quản trị" của `design/sapio/README.md`.

Bản chép `app/sapio/*.css` đã cập nhật sẵn. Làm trên nhánh `feat/mock-app-shell`, mỗi mục 8a–8f một commit, mở PR mới, không merge.

### 8a. Route theo T-15

- Đổi route:

  | Route cũ | Route mới |
  |---|---|
  | `/mock/dat-lich?tenant=` | `/mock/[tenant]/book` |
  | `/mock/le-tan` và `/mock/le-tan/tai-nguyen` | gộp thành `/mock/app/[tenant]/calendar?view=staff\|resources` (một màn MH-24, hai kiểu xem) |
  | `/mock/hom-nay` | `/mock/app/[tenant]/today` |

  `[tenant]` là `toc-may` hoặc `pawpaw`. Slug lạ thì trả `notFound()`.
- Trạng thái xem vào query: `?date=`, `?view=`, `?step=`, `?khach=moi`.
- Route cũ chuyển hướng 308 sang route mới (`redirects()` trong `next.config.mjs`), vì link cũ có thể đã gửi cho cô.
- Bộ chọn cơ sở ở thanh trên của `/mock` đổi slug trong đường dẫn, không còn dùng `?tenant=`.
- Thêm vai trò `technician` (Kỹ thuật viên) và `manager` (Quản lý chi nhánh) vào `mock/selection.ts`. Vai trò ở khu `/mock/app` lấy từ `?role=` (mặc định `owner`). Vai trò quyết định các mục trên thanh bên, theo README của AppShell.
- Thêm `app/mock/app/[tenant]/[...rest]/page.tsx`: các mục trên thanh bên chưa có màn hình thì vào trang này, hiện "MH-xx · <tên màn> · Chưa làm" (lấy từ `mock/screens.ts`) và link về danh sách màn, không trả 404.

### 8b. Khung ứng dụng (MH-07)

- **Component `AppShell`** trong `components/sapio/` dùng cho mọi trang trong `/mock/app/[tenant]`. Dựng theo `QuanTriKhachHang.dc.html` và `QuanTriThuGon.dc.html`.
- **Hàng đầu:** chữ Sapio và nút thu gọn/mở rộng.
  - Lưu lựa chọn trong `localStorage` (khóa `sapio.sidebar`). Đọc và ghi trong `try/catch`.
  - Từ 768 đến 1199px mặc định thu gọn. Mở rộng thì thanh bên trượt đè lên nội dung; Escape hoặc bấm ra ngoài thì đóng.
  - Ở dải icon, mỗi mục có `aria-label` và tooltip.
- **Ô đổi cơ sở** mở `.sp-menu` gồm:
  - Các chi nhánh của cơ sở, có dấu ✓ ở chi nhánh đang xem (lưu vào `?branch=`).
  - Cơ sở kia, kèm vai trò.
  - Mục "Đăng ký cơ sở mới", trỏ tới trang chưa làm.
- **Phím trong menu:** mũi tên lên/xuống đi giữa các mục, Escape đóng, đóng xong focus về lại ô.
- **Hàng tài khoản:** avatar, tên, vai trò, nút sáng/tối. Nút này dùng chung `useTheme` với nút ở thanh trên của `/mock`.
- **Dưới 768px:** bỏ thanh bên, dùng `.sp-tabbar` với 4 mục:
  - Lễ tân: Hôm nay, Lịch, Khách, Thêm.
  - Kỹ thuật viên: Lịch của tôi, Xin nghỉ, Hoa hồng, Thêm.
  - "Thêm" mở `.sp-sheet` chứa các mục còn lại.
  - "Thu chi" trong `LeTanDienThoai.dc.html` bỏ, chuyển vào "Thêm" (Hóa đơn).
- **Đưa Lịch và Hôm nay vào khung:**
  - Chữ Sapio dời lên thanh bên.
  - Thanh trên của trang lịch còn: ngày (trước, Hôm nay, sau), `Segmented` Nhân viên / Tài nguyên, tìm khách, nút "Lịch hẹn".
  - Trang lịch dùng `.sp-shell__content--wide`.

### 8c. Mẫu danh sách: Khách hàng (MH-32) và Nhân sự (MH-47)

- **Component:** `DataTable` (cột có kiểu: nhãn, căn, sắp xếp, ô hiển thị), `Pagination`, `PageSizeSelect`, `FilterSheet`, `PageHeader`, `Toolbar`.
- **`/mock/app/[tenant]/customers`:** đúng `QuanTriKhachHang.dc.html`, `QuanTriDienThoai.dc.html`, `QuanTriDienThoaiLoc.dc.html`.
  - Bảng cuộn trong khung, dòng tiêu đề cột và chân bảng dính.
  - Chân bảng: "Hiển thị 1–20 trong N khách" bên trái; số trang rồi ô "20 / trang" bên phải.
  - Bấm tiêu đề cột thì sắp xếp được.
- **Dữ liệu:** thêm khách cho đủ nhiều trang. Sinh bằng `seeded()` sẵn có, khoảng 130 khách cho Tóc Mây và 60 cho Pawpaw. Số lần đến và số lần không đến tính từ lịch hẹn trong dữ liệu.
- **Tìm và lọc:**
  - Tìm theo tên không dấu (gõ "ha" ra "Hà") và theo số điện thoại đã chuẩn hóa: gõ "0934 567" hay "+84934567" đều khớp (BR-61).
  - Bộ lọc nhanh chạy thật trên dữ liệu.
  - Trang, số dòng, sắp xếp, bộ lọc, từ khóa đều nằm trong URL.
  - Đổi bộ lọc hoặc số dòng thì về trang 1.
- **Trạng thái trống:** khi lọc không ra kết quả, hiện `.sp-empty` kèm nút "Bỏ lọc".
- **Điện thoại:**
  - Danh sách thẻ, nút "Bộ lọc" có số bộ lọc đang bật.
  - Bộ lọc đang bật hiện thành chip có nút ✕, không cuộn ngang.
  - Phân trang rút gọn "‹ Trang 1/65 ›".
- **`/mock/app/[tenant]/settings/staff`:** dùng lại đúng các component trên, không thêm style.
  - Cột: nhân viên (avatar, tên hiển thị, chức danh), vai trò, chi nhánh, nhận đặt online, số kỹ năng.
  - Mỗi hàng có nút ghost "Xem lịch".

### 8d. Mẫu form: Hồ sơ nhân viên (MH-48)

- **Component:** `FormSection`, `Field` (`--sm`), `Select`, `Switch`, `Checkbox`, `SaveBar`, `SettingsNav`.
- **`/mock/app/[tenant]/settings/staff/[id]`:** đúng `QuanTriNhanVien.dc.html`, với 4 nhóm trường:
  - Hồ sơ công khai (BR-15).
  - Thông tin nội bộ.
  - Vai trò.
  - Cấp và kỹ năng (BR-03): danh sách kỹ năng lấy từ dịch vụ của cơ sở.
- **Thanh lưu:**
  - Chỉ hiện khi có thay đổi, kèm số thay đổi.
  - "Bỏ thay đổi" trả về giá trị ban đầu.
  - "Lưu" cập nhật state của trang, hiện toast "Đã lưu hồ sơ Mai.", và tên mới hiện ngay trên thanh bên và trong bảng Nhân sự.
  - Rời trang khi còn thay đổi: hỏi lại bằng `ConfirmDialog` khi bấm link trong app, và bằng `beforeunload` khi đóng tab.
- **Kiểm tra hợp lệ:** tên hiển thị bắt buộc, thế mạnh tối đa 40 ký tự, email đúng dạng. Lỗi hiện dưới từng trường theo `FormSection`.
- **`/mock/app/[tenant]/settings`:**
  - Từ 900px: chuyển sang mục đầu tiên, có menu cài đặt bên trái.
  - Dưới 900px: hiện danh sách các mục cài đặt, mỗi mục một dòng. Trang con có nút quay lại.

### 8e. Từ ngữ và luật của ngành ra gói cấu hình (sửa theo review PR #2)

- **Kiểu dữ liệu:** thêm `IndustryTemplate` vào `mock/fixtures/types.ts` và một bản cho mỗi ngành (`hair_salon`, `pet_spa`):

  ```ts
  interface IndustryTemplate {
    id: string;
    name: string;
    vocabulary: {
      staff: string;
      subject: string | null;
      subjectQuestion: string | null;
      addSubject: string | null;
    };
    subjectSchema: SubjectField[]; // ngành không có đối tượng khác thì rỗng
  }
  type SubjectField =
    | { key: string; label: string; type: 'enum'; options: { value: string; label: string }[]; required: boolean }
    | { key: string; label: string; type: 'number'; unit?: string; required: boolean | Record<string, string> }
    | { key: string; label: string; type: 'text'; required: boolean };
  ```

  Ví dụ một trường số: `{ key: 'weightKg', label: 'Cân nặng', type: 'number', unit: 'kg', required: { species: 'dog' } }`.
- **Điều kiện chọn biến thể:** `ServiceVariant.match` nhận cả khoảng số, ví dụ `{ species: 'dog', weightKg: { max: 10 } }` (cận trên không tính). Bỏ thuộc tính `size` và hằng số `SMALL_DOG_MAX_KG`. Biến thể vẫn chọn theo BR-13.
- **Trang đặt lịch:** form "Thêm bé" dựng từ `subjectSchema`. Mọi chữ "bé", "Cho bé nào?", "Thêm bé", "Chó", "Mèo" lấy từ gói cấu hình. Kiểm tra theo BR-71.
- **Lỗi nhỏ còn lại:** toast `persist` có nút đóng (`.sp-icon-btn`, `aria-label="Đóng"`).
- **Xong khi:** `grep -rnE "bé|Chó|Mèo|tóc|Tóc|groom" app/mock components/sapio` chỉ còn tên cơ sở trong dữ liệu, không còn trong code giao diện.

### 8f. Danh sách màn hình trên `/mock` và hoàn tất

- **`mock/screens.ts`:** đủ 60 màn MH-01 đến MH-60 theo [Danh sách màn hình](../thiet-ke/man-hinh.md). Mỗi màn có mã, tên, khu, vai trò, đợt, mức, route, trạng thái.
  - "Đang làm": MH-07, MH-08, MH-09, MH-12, MH-24, MH-25, MH-32, MH-47, MH-48.
  - Các màn còn lại: "Chưa làm".
- **Trang `/mock`:**
  - Nhóm màn theo khu A–H.
  - Lọc theo đợt và theo trạng thái.
  - Mỗi màn có link nếu đã có route.
  - Đếm số màn theo trạng thái ("9/60 đang làm").
- **Kiểm tra:**
  - Chạy lại axe trên các route mới, cả hai theme. Không được có lỗi serious hoặc critical.
  - `pnpm build`, `pnpm typecheck`, `pnpm exec prettier --check app components lib mock` xanh.
- **Mở PR:** mô tả theo 8a–8f, mục "Tự quyết", ảnh ba bề rộng (1440, 1024, 390). Ghi một mục vào Tiến độ.

**Xong khi:**
- Mọi route cũ chuyển hướng đúng.
- Ở 1440px, thanh bên thu gọn được và tải lại trang vẫn nhớ. Ở 1024px, thanh bên mặc định là dải icon.
- Menu đổi chi nhánh và đổi cơ sở dùng được bằng bàn phím.
- Bảng Khách hàng ở 1440×900: cuộn trong khung, tiêu đề cột và chân bảng không trôi. Tìm "ha" ra chị Hà. Sang trang 2, đổi "50 / trang", tải lại vẫn giữ nguyên.
- Ở 390px: không có cuộn ngang trên mọi trang `/mock/app`. Bộ lọc mở bằng bảng trượt lên.
- Hồ sơ Mai: sửa tên thì thanh lưu hiện; rời trang thì bị hỏi lại; lưu xong thấy tên mới ở bảng Nhân sự.
- Trang đặt lịch của Pawpaw không còn chữ của ngành trong code.

## Bước 9. Đăng ký cơ sở, dùng thử và gói Sapio

Sau khi PR #3 merge. Căn cứ:
- Màn hình đã chốt: `design/screens/DangKy*.dc.html` và `Goi*.dc.html` (bảng ở `design/README.md`).
- README của `SignupFlow`, `ChoiceCard`, `OtpField`, `Banner`, `Checklist`, `Plan` trong `design/sapio/components/`.
- Quyết định [D-15](../du-an/quyet-dinh.md#d-15-dùng-thử-7-ngày-và-hai-gói-sapio-thay-cho-duyệt-tay), [T-16](./quyet-dinh-ky-thuat.md#t-16-trang-khách-của-mỗi-cơ-sở-trên-tên-miền-con), [T-17](./quyet-dinh-ky-thuat.md#t-17-gói-sapio-gói-và-tính-năng-là-dữ-liệu-kiểm-qua-một-hàm).
- Quy tắc BR-72 đến BR-75, BR-80 đến BR-88.

Bản chép `app/sapio/*.css` đã cập nhật sẵn. Làm trên nhánh `feat/mock-signup-plan`, mỗi mục 9a–9f một commit, mở PR mới, không merge.

### 9a. Component mới

- **Các component:** `SignupLayout` (bố cục `.sp-auth` và các bước `.sp-steps`), `ChoiceCards`, `QuantityInput` (`.sp-qty`), `OtpField`, `Banner`, `Checklist`, `PlanCards`, `LockIcon`. Mỗi cái một ví dụ trên `/mock/components`.
- **`OtpField`:** dùng `InputOTP` của shadcn/ui.
  - Thêm gói `input-otp`, ghim đúng phiên bản (người dùng đã đồng ý). Đổi class cho khớp `.sp-otp`.
  - Phải có `autocomplete="one-time-code"`, `inputmode="numeric"`, dán được cả mã.
  - Gõ đủ 6 số thì tự gửi.
  - **Thay ô mã ở bước Thông tin của `/mock/[tenant]/book`** bằng component này.

### 9b. Đăng ký cơ sở (MH-02): `/mock/signup?step=account|verify|industry|business|done`

Làm đúng 6 màn `DangKy*`. Bước nằm trong `?step=`, và chỉ đi tới được bước kế tiếp khi bước hiện tại đã hợp lệ.

- **Bước 1, tài khoản.**
  - Mật khẩu theo BR-73: tối thiểu 15 ký tự, không ép loại ký tự.
  - So với danh sách mật khẩu phổ biến: chép khoảng 200 mật khẩu thường gặp vào `mock/fixtures/common-passwords.ts`, trong đó có các mật khẩu tiếng Việt kiểu `matkhau123456789`. Trùng thì báo "Mật khẩu này quá phổ biến, chọn câu khác.".
  - Nút hiện/ẩn mật khẩu. Bắt buộc tick đồng ý điều khoản.
- **Bước 2, mã xác nhận.** Mã nào 6 số cũng đúng, trừ `000000`: mã này dùng để thử trạng thái lỗi "Mã chưa đúng. Còn 2 lần thử.". Nút "Gửi lại mã sau 0:42" đếm ngược bằng `MOCK_NOW` cộng thời gian đã trôi.
- **Bước 3, ngành.**
  - 4 thẻ ngành. Bảng xem trước lấy từ `IndustryTemplate`: thêm trường `sampleServices` (tên, biến thể, thời lượng, giá, có đoạn chờ không), `resourceTypes` có sẵn, và `vocabulary` có sẵn.
  - Nail và Spa chưa có dữ liệu thì thẻ hiện "Sắp có" ở trạng thái `disabled`.
  - Chọn ngành nào thì bảng xem trước đổi theo ngành đó.
- **Bước 4, thông tin cơ sở.**
  - Ô địa chỉ có đuôi `.sapio.vn`. Kiểm theo BR-72:
    - khi rời ô: sai định dạng, hoặc trùng tên dành riêng;
    - sau khi ngừng gõ 500 ms: trùng `toc-may` hoặc `pawpaw` thì báo "Đã có cơ sở dùng địa chỉ này"; còn trống thì báo "toc-may.sapio.vn còn trống".
  - Gõ tên cơ sở thì tự gợi ý địa chỉ: bỏ dấu, thay dấu cách bằng gạch ngang.
  - Giờ mở cửa: 7 dòng, mỗi dòng một công tắc. Tài nguyên dùng `QuantityInput`, tối thiểu 1, tối đa 20.
- **Bước 5, đã tạo.**
  - Nội dung tóm tắt lấy từ dữ liệu đã nhập.
  - "Vào trang quản trị" dẫn tới `/mock/app/toc-may/calendar?plan=trial`. Mock không tạo cơ sở mới thật; ghi điều này ở mục "Tự quyết".
- Lỗi hiện ngay dưới ô (`.sp-field--error`, `aria-describedby`, `aria-invalid`). Ở 390px không có cuộn ngang. Bước 3 trên điện thoại có thanh nút dính đáy.

### 9c. Quyền theo gói trong mock (T-17)

- **`mock/subscription.ts`:**
  - Có `plans` (dữ liệu theo BR-83) và hàm thuần `entitlements(tenant, now)` trả `{ mode, features, limits, trialEndsAt, periodEnd }`, kèm `can(e, feature)` và `canBook(e)`.
  - Có hàm thuần `upgradeCharge(fromPlan, toPlan, daysLeft)` theo BR-85, và `periodPrice(plan, months)` theo BR-84 (làm tròn tới nghìn đồng).
  - Viết comment đầu file: đây là bản mẫu để chép sang `datn-saas` kèm test.
- **Trạng thái mặc định:** Tóc Mây dùng gói Chuyên nghiệp, hết hạn 30/11/2026. Pawpaw dùng gói Cơ bản, hết hạn 30/11/2026.
- **Ghi đè trạng thái** bằng `?plan=trial|basic|pro|expired`. Giá trị này phải giữ khi bấm sang trang khác trong khu `/mock/app`. Thêm một bộ chọn "Gói" trên thanh của `/mock`.
- **Dùng thử (`trial`):**
  - `Banner` "Dùng thử · còn 5 ngày" trên mọi trang `/mock/app`. Tính từ `MOCK_NOW`, dùng thử hết lúc 23:59 ngày 13/11.
  - Trang Lịch thay lưới lịch bằng thẻ "Lịch hẹn mở khi kích hoạt gói" và `Checklist` (đúng `GoiDungThu.dc.html`). Checklist tính từ dữ liệu: số dịch vụ, tài nguyên, nhân viên nhận đặt online, ca.
  - "Tạo lịch hẹn" và nút Check-in ở trang Hôm nay bị tắt, có câu giải thích.
  - `/mock/[tenant]/book` hiện "Cơ sở chưa nhận đặt lịch online", chỉ cho xem thử.
- **Hết hạn (`expired`):** mọi trang `/mock/app/[tenant]/...` hiện màn `GoiHetHan.dc.html`, trừ trang `settings/plan`. Bảng "lịch đã đặt sau hạn" lấy từ lịch hẹn thật trong dữ liệu sau ngày hết hạn. Trang đặt lịch báo tạm ngưng.
- **Gói Cơ bản (`basic`):**
  - Ổ khóa trên thanh bên và trong menu cài đặt cho mọi tính năng không có trong gói (BR-87).
  - Bấm vào thì mở trang khóa đúng `GoiKhoaTinhNang.dc.html`. Bảng tiền nâng gói tính bằng `upgradeCharge`, số ngày còn lại tính từ `MOCK_NOW`.
  - Trang Chatbot là `/mock/app/[tenant]/settings/chatbot`. Hoa hồng và Gói liệu trình dùng chung trang khóa đó, chỉ đổi tên tính năng.
- **Sắp hết hạn** (còn 3 ngày trở xuống): `Banner` dạng cảnh báo. Thử bằng `?plan=pro&periodEnd=2026-11-09`.

### 9d. Cài đặt › Gói Sapio (MH-61): `/mock/app/[tenant]/settings/plan`

- Làm đúng `GoiSapio.dc.html`.
- **Chọn kỳ:** chọn 1, 3 hay 12 tháng thì giá trong hai thẻ đổi theo: hiện giá mỗi tháng sau giảm và tổng tiền, tính bằng `periodPrice`.
- **Thanh toán:** nút "Chọn …" hoặc "Gia hạn …" mở `ConfirmDialog`.
  - Hộp ghi gói, kỳ, tổng tiền và ngày hết hạn mới, kèm ô QR giả (khung có chữ "QR giả lập").
  - Có nút "Giả lập thanh toán thành công". Bấm vào thì trạng thái đổi sang `active` trong state của trang, hiện toast "Đã kích hoạt gói Chuyên nghiệp đến 08/12/2026.", và lịch sử thanh toán thêm một dòng.
- **Nâng gói giữa kỳ:** hộp hiện đúng số tiền của `upgradeCharge`.
- **Hạ gói:** ghi "có hiệu lực từ kỳ sau". Nếu cơ sở đang có nhiều hơn 1 chi nhánh hoạt động thì nút bị tắt, kèm lý do "Tạm dừng bớt chi nhánh, chỉ giữ 1, rồi mới hạ được gói" (BR-85). Dữ liệu mock chỉ có 1 chi nhánh, nên thêm ghi đè `?branches=3` để thử trạng thái này.
- Thêm mục "Gói Sapio" lên đầu menu cài đặt. Thêm MH-61 và MH-62 vào `mock/screens.ts`. Trạng thái "Đang làm": MH-02, MH-61.

### 9e. Thay đổi nhỏ theo các quyết định mới

- Màn "Đã tạo" và mọi chỗ hiện địa chỉ trang khách đều ghi `toc-may.sapio.vn`. Route mock vẫn là `/mock/toc-may/...`, theo T-16.
- Ô địa chỉ hiển thị phải đọc tên miền gốc từ một hằng số `BASE_DOMAIN = 'sapio.vn'` trong `mock/`, không viết thẳng trong component.

### 9f. Kiểm tra và hoàn tất

- Chạy axe trên 5 bước đăng ký, `settings/plan`, trang khóa, và màn hết hạn, cả hai theme. Không có lỗi serious hoặc critical.
- `pnpm build`, `pnpm typecheck`, `pnpm exec prettier --check app components lib mock` xanh.
- Mở PR mới: mô tả theo 9a–9f, mục "Tự quyết", ảnh ở 1280px và 390px. Ghi một mục Tiến độ.

**Xong khi:**
- Đi hết 5 bước đăng ký chỉ bằng bàn phím, ở cả 1280px và 390px. Ở 390px không có cuộn ngang.
- Mật khẩu `matkhau123456789` bị từ chối. Mật khẩu `tiem toc may mo cua 8 gio` được chấp nhận.
- Gõ địa chỉ `toc-may` thì báo đã có người dùng. Gõ `app` thì báo tên dành riêng. Gõ `-abc` thì báo sai định dạng.
- Dán `482193` vào ô mã thì điền đủ 6 ô và tự gửi.
- Với `?plan=trial`: không tạo được lịch hẹn ở đâu cả, và trang đặt lịch báo chưa nhận khách.
- Với `?plan=expired`: mọi trang `/mock/app` chỉ còn màn gia hạn.
- Với `?plan=basic`: Chatbot có ổ khóa, và trang khóa ghi "Trả thêm hôm nay 147.000 ₫" (còn 22 ngày tính từ 08/11).
- Giả lập thanh toán xong thì dải báo dùng thử biến mất ngay.

## Bước 10. Cấu hình dịch vụ (MH-44, MH-45), gói cấu hình ngành (MH-59) và thanh cuộn

Sau khi PR #4 merge. Căn cứ:
- Màn đã chốt: `design/screens/DichVu*.dc.html` và `GoiNganh*.dc.html`.
- README của `SegmentTimeline`, `DetailPage`, `FormSection`, `AppointmentBlock` trong `design/sapio/components/`.
- Quy tắc BR-50 đến BR-59 và BR-70.
- [Thuật toán tính giờ trống](./thuat-toan-gio-trong.md), mục 2 và mục 4.

Bản chép `app/sapio/components.css` đã cập nhật sẵn, gồm cả thanh cuộn. Làm trên nhánh `feat/mock-services`, mỗi mục 10a–10f một commit, mở PR mới, không merge.

### 10a. Dữ liệu và hàm thuần

**Kiểu dữ liệu (`mock/fixtures/types.ts`):**
- `ServiceSegment.kind` thành `'prep' | 'work' | 'wait'`.
- `ServiceVariant` thêm:
  - `cleanupMinutes: Record<resourceTypeId, number>`;
  - `pricesByLevel?: bigint[]`, xếp theo `staffLevels`. `priceVnd` vẫn là giá cấp thấp nhất.
- `Service` thêm `group` và `variantSelection: 'customer' | 'subject'`.

**Tóc Mây:**
- **Nhuộm ngắn** đúng bảng ở mục 2.2 của trang thuật toán:
  - Pha thuốc 15′ (Thợ);
  - Bôi thuốc 30′ (Thợ, Ghế cắt);
  - Chờ lên màu 45′ (Ghế cắt);
  - Xả thuốc, gội 15′ (Thợ, Giường gội);
  - Sấy, tạo kiểu 15′ (Thợ, Ghế cắt);
  - dọn ghế 10′;
  - giá 500.000 / 550.000 / 600.000 ₫.
- **Nhuộm dài:** Pha 15′, Bôi 40′, Chờ 45′, Xả gội 15′, Sấy 20′, dọn ghế 10′; giá 700.000 / 770.000 / 840.000 ₫.
- Thêm kỹ năng Nhuộm cho Lan. Hùng giữ nguyên.
- Bỏ `match: { hairLength }` ở các biến thể salon: salon có `subjectSchema` rỗng và `variantSelection: 'customer'`.

**Pawpaw:**
- `variantSelection: 'subject'`.
- Tắm sấy chó từ 10 kg đúng bảng mục 2.2. Mọi biến thể Tắm sấy dọn bồn 10′, lồng 5′.

**Sinh lịch hẹn mẫu:**
- `mock/fixtures/bookings.ts` sinh thêm đoạn chuẩn bị trước giờ hẹn và đoạn dọn sau khi dùng (BR-51, BR-52).
- `Appointment.startAt` vẫn là giờ khách thấy.
- Chạy lại sinh lịch, rồi kiểm không có hai đoạn chồng nhau trên cùng một tài nguyên (BR-01). Chỗ nào chồng thì dời lịch mẫu, không bỏ đoạn.

**Hàm thuần mới trong `mock/occupation.ts`** (mẫu để chép sang `scheduling-core` kèm test):
- `occupation(variant, resourceTypeId)`;
- `visibleRange(variant)`;
- `busyMinutes(variant)`: số phút bận theo từng loại, cho ô Tóm tắt;
- `priceFor(variant, staff | 'any', staffList)` (BR-56);
- `checkVariantCoverage(service, subjectSchema)` (BR-55). Cách kiểm:
  - Trường chọn một: thử từng giá trị.
  - Trường số: lấy mọi mốc `min` và `max` của các biến thể, thử từng mốc và một giá trị giữa hai mốc liền nhau.
  - Trả về danh sách lỗi đọc được, ví dụ "Chó 10 kg khớp 2 biến thể: Chó dưới 12 kg, Chó từ 10 kg." hoặc "Chó từ 10 đến dưới 12 kg chưa khớp biến thể nào."

**Giờ trống:**
- Viết lại `mock/availability.ts` theo mã giả mục 3 (phép vừa, từng loại tài nguyên độc lập, `pick` theo BR-57). Bỏ chú thích "không đúng hẳn" ở đầu file.
- Thêm `scripts/check-availability.ts`, chạy bằng `node scripts/check-availability.ts` (Node 24 tự bỏ kiểu). Script dựng lại bối cảnh A và B của mục 4 rồi so 10 kết quả với trang thuật toán. Thêm lệnh `pnpm check:availability`.

### 10b. Cài đặt › Dịch vụ (MH-44): `/mock/app/[tenant]/settings/services`

- Mẫu danh sách (MH-08). Cột:
  - dịch vụ và nhóm;
  - số biến thể;
  - thời gian khách thấy (ngắn nhất–dài nhất);
  - giá từ;
  - số người làm được;
  - công tắc "Nhận đặt online".
- Bấm một dòng thì mở MH-45. Mục "Dịch vụ" trong menu cài đặt trỏ tới đây.

### 10c. Chi tiết dịch vụ (MH-45): `/mock/app/[tenant]/settings/services/[id]`

Làm đúng `DichVuChiTiet` (Tóc Mây, `may-dye`), `DichVuThuCung` (Pawpaw, `paw-bath`) và `DichVuDienThoai` (dưới 768px).

**Component mới:** `SegmentTimeline`, `SegmentTable`, `DetailLayout`, `Panel`, `KeyValueList`. Mỗi cái một ví dụ trên `/mock/components`.
- Trục vẽ từ `occupation()`, thước giờ lấy ví dụ hẹn 09:00.
- Bấm một thanh thì chọn đúng dòng trong bảng, và ngược lại.

**Bảng đoạn:**
- Sửa tên, loại và số phút: số nguyên 5–480, bước 5.
- Bật/tắt từng loại tài nguyên.
- Thêm, xóa, đổi thứ tự. Nút kéo dùng được bằng bàn phím: lấy focus rồi bấm ↑/↓.
- Đoạn Chờ tắt nút của loại nhân viên. Đổi một đoạn sang Chờ thì bỏ chọn nhân viên ngay (BR-50).
- Đoạn Chuẩn bị chỉ đứng đầu: chọn Chuẩn bị cho đoạn ở giữa thì báo lỗi ngay dưới ô.
- Dọn dẹp sau khi dùng: một ô cho mỗi loại tài nguyên không phải nhân viên.

**Biến thể:**
- Bảng biến thể; biến thể đang sửa nằm trong `?variant=`. Có "Nhân bản" và "Thêm biến thể".
- Chọn biến thể bằng `Segmented`.
- Pawpaw có ô sửa điều kiện (Loài; Cân nặng từ, đến dưới).
- Dải báo kiểm phủ đủ, không trùng chạy theo từng thay đổi (`checkVariantCoverage`). Còn lỗi thì nút Lưu tắt và câu lỗi nằm trong dải báo.

**Giá theo cấp:**
- Công tắc và bảng ba cấp.
- Cột "Người ở cấp này" lấy từ nhân viên.
- Giá ở bảng biến thể hiện khoảng giá của những người làm được (500.000–550.000 ₫).

**Ai làm được:** hộp kiểm theo `skillServiceIds`, dùng chung state với `staff-store`, để hồ sơ Mai đổi theo.

**Cột phải:**
- Xem trước trên lịch: `ResourceCalendar` thu nhỏ với cột Thợ và các tài nguyên của biến thể. Đoạn chuẩn bị và dọn dẹp dùng `.sp-appt__seg--buffer`.
- Thẻ "Khách thấy": giá cho "Bất kỳ ai" (BR-56).
- Tóm tắt (`busyMinutes`) và số lịch sắp tới dùng biến thể.

**Lưu:**
- Thanh lưu đếm số thay đổi và ghi "N lịch đã đặt giữ thời gian và giá cũ (BR-12)".
- Lưu thì toast "Đã lưu Nhuộm tóc. 6 lịch đã đặt giữ thời gian và giá cũ." Thay đổi giữ trong state của phiên (như `staff-store`), không ghi đè lịch đã sinh.

**Điện thoại:**
- Tab biến thể, trục thu nhỏ, danh sách thẻ đoạn.
- Bấm một thẻ thì mở `.sp-sheet` để sửa đoạn đó.
- Không cuộn ngang.

**Nối sang trang khác:**
- "Xem như khách" mở `/mock/[tenant]/book?service=…`.
- Ở bước chọn thợ của trang đặt lịch, giá đổi theo người đã chọn: "Bất kỳ ai" 500.000 ₫, Mai 550.000 ₫ (BR-56).
- Lịch lễ tân vẽ đoạn chuẩn bị và dọn dẹp bằng `--buffer`.

### 10d. Gói cấu hình ngành (MH-59): `/mock/admin/templates`, `/mock/admin/templates/[code]`

**Khung quản trị nền tảng:**
- `AppShell` với menu Tổng quan, Khách thuê, Gói cấu hình ngành, Gói và giá, Nhật ký. Mục chưa làm mở trang "Chưa làm".
- Bộ chọn vai trò của `/mock` thêm "Quản trị nền tảng", dẫn tới `/mock/admin/templates`.

**Dữ liệu `IndustryTemplate` thêm:**
- `code`;
- `status: 'open' | 'soon' | 'hidden'`;
- `publishedVersion` (số bản, ngày xuất bản, số cơ sở đã tạo);
- `draft` (danh sách thay đổi);
- `defaultPolicies` (đặt trước ít nhất, đặt xa nhất, đổi/hủy trước, số lần tự đổi, không đến sau, số lần không đến thì bắt buộc cọc);
- loại tài nguyên có cờ nhân viên;
- dịch vụ mẫu có đủ đoạn.

Thêm `nail_salon` và `beauty_spa` ở trạng thái `soon`. Bước chọn ngành của `/mock/signup` đọc trạng thái từ đây.

**Hai trang:**
- Danh sách và chi tiết đúng `GoiNganhDanhSach` và `GoiNganhChiTiet`. Dịch vụ mẫu dùng `SegmentTimeline` dạng `--mini`.
- "Xuất bản bản 3" mở `ConfirmDialog`: "Xuất bản bản 3 của Spa thú cưng? Chỉ cơ sở tạo sau đó nhận bản này; 4 cơ sở đã tạo giữ dữ liệu của mình (BR-70)."
- Xuất bản xong thì số bản tăng, bản nháp trống, và hiện toast.

### 10e. Thanh cuộn và rà lại

- Thanh cuộn đã nằm trong `components.css`. Xóa mọi style thanh cuộn riêng trong mock nếu có, rồi kiểm ở bảng khách hàng, lịch lễ tân và trang dài.
- Cần kiểm trên Chrome và Edge (Windows), ở cả hai theme.
- `mock/screens.ts`: MH-44, MH-45, MH-59 thành "Đang làm".

### 10f. Kiểm tra và hoàn tất

- Chạy axe trên MH-44, MH-45 (cả hai cơ sở), sheet sửa đoạn trên điện thoại, MH-59 danh sách và chi tiết, ở hai theme và hai bề rộng. Không có lỗi serious hoặc critical.
- `pnpm check:availability`, `pnpm build`, `pnpm typecheck`, `pnpm exec prettier --check app components lib mock scripts` đều xanh.
- Mở PR mới: mô tả theo 10a–10f, mục "Tự quyết", ảnh ở 1440px và 390px. Ghi một mục Tiến độ.

**Xong khi:**
- **Trục thời gian:** Nhuộm tóc, Tóc ngắn có hàng "Khách thấy" ghi "09:00–10:45 · 1 giờ 45". Sửa Chờ lên màu thành 60′ thì thành "09:00–11:00 · 2 giờ". Tóm tắt "Ghế cắt bận" đổi theo, thanh lưu ghi "1 thay đổi".
- **Đoạn chờ:** đổi đoạn Bôi thuốc sang Chờ thì nút Thợ của đoạn đó tắt và bỏ chọn.
- **Dọn dẹp:** đặt dọn ghế 0′ thì thanh Dọn biến mất. Đặt lại 10′ thì thanh nằm ngay sau đoạn Sấy, không phải sau đoạn cuối của cả dịch vụ.
- **Điều kiện biến thể (Tắm sấy):**
  - "Chó từ 10 kg" đổi "từ" thành 12 thì dải báo ghi "Chó từ 10 đến dưới 12 kg chưa khớp biến thể nào." và nút Lưu tắt.
  - "Chó dưới 10 kg" đổi "đến dưới" thành 12 thì báo trùng.
- **Giá:** trang đặt lịch Tóc Mây, Nhuộm tóc, "Bất kỳ ai" hiện 500.000 ₫. Chọn Mai thì hiện 550.000 ₫.
- **Lịch lễ tân:** khối nhuộm có đoạn Pha thuốc trước giờ hẹn và Dọn sau, viền đứt. Script kiểm báo 0 đoạn chồng nhau.
- **Giờ trống:** `pnpm check:availability` khớp cả 10 ví dụ.
- **Gói ngành:** `/mock/admin/templates` có 4 dòng. Xuất bản Spa thú cưng thì hỏi lại, rồi thành bản 3.
- **Điện thoại:** ở 390px, MH-44, MH-45 và MH-59 không cuộn ngang.

## Bước 11. Đợt A: nghiệp vụ lịch (MH-26, MH-27, MH-28, MH-35, MH-36, MH-38, MH-39, MH-40)

Sau khi PR #5 merge. Căn cứ:
- Màn đã chốt: `design/screens/LichTao*.dc.html`, `LichKeoTha`, `LichDoiNguoi`, `LichChiTietDienThoai`, `KtvLich`, `KtvXinNghi`, `XepCa`, `NghiPhep*` (bảng ở `design/README.md`).
- README của `SidePanel`, `ShiftGrid`, `AffectedList`, `ResourceCalendar` trong `design/sapio/components/`, và mục "Khu quản trị" của `design/sapio/README.md`.
- Quy tắc BR-11, BR-30 đến BR-36.
- Hàm `findSlots` và `pick` đã có ở `mock/availability.ts`.

Bản chép `app/sapio/components.css` đã cập nhật sẵn. Làm trên nhánh `feat/mock-scheduling-ops`, mỗi mục 11a–11g một commit, mở PR mới, không merge.

### 11a. Dữ liệu và màu chọn trong quản trị

**Dữ liệu mẫu:**
- `AppointmentItem` thêm `staffChoice: 'any' | 'chosen'` (BR-31). Sinh lại dữ liệu sao cho mỗi cơ sở có cả hai loại. Riêng Chị Ngọc (Tóc Mây, 11:00) là đích danh Mai.
- Thêm ca làm `Shift` (nhiều khung mỗi ngày) cho tuần 09/11–15/11, đúng `XepCa.dc.html`. Ca Mai bắt đầu 08:45 để kịp pha thuốc trước 09:00.
- `StaffTimeOff` thêm `status` (`pending`, `approved`, `rejected`), `reason`, `sentAt`, giờ bắt đầu và kết thúc (nghỉ vài giờ), và cách xử lý từng lịch bị ảnh hưởng. Dữ liệu đúng `NghiPhepDanhSach.dc.html`.
- `findSlots` đọc ca làm thay cho "nhân viên làm trong giờ mở cửa".
- `pnpm check:availability` vẫn phải đạt.

**Chính sách:** thêm cài đặt "Kỹ thuật viên thấy số điện thoại khách", mặc định tắt (BR-36).

**Màu chọn:** trong `/mock/app` và màn kỹ thuật viên, ngày, biến thể, ô giờ đang chọn dùng `brand`. Lớp `.sp-shell` và `.sp-admin` đã lo việc này; kiểm không còn chỗ nào trong quản trị dùng màu của cơ sở, trừ ô chữ cái.

### 11b. Tạo lịch hẹn (MH-26)

- Bấm một ô trống trên lịch thì hiện `.sp-cal__target` và mở `SidePanel` bên phải, giờ và người điền sẵn. Nút "Tạo lịch hẹn" ở đầu trang mở panel với giờ trống gần nhất.
- **Tìm khách:**
  - Theo số đã chuẩn hóa (BR-61) hoặc tên.
  - Luôn có "Khách mới với số …" và "Khách vãng lai".
  - Pawpaw: chọn khách rồi chọn bé, hoặc "Thêm bé". Biến thể tự chọn theo thông tin của bé (BR-55).
- **Kiểm ngay** bằng `findSlots` mỗi lần đổi dịch vụ, người hoặc giờ:
  - Hợp lệ: `.sp-fit--ok` "Trống: Lan, Ghế 2. Xong lúc 14:45."
  - Không hợp lệ: `.sp-fit--bad` nói rõ vướng gì, kèm 3 giờ gần nhất dạng chip; bấm chip là điền giờ đó. Nút Tạo tắt.
- Giờ lệch lưới (14:05) gõ được (BR-30, BR-58). Không áp đặt trước 2 giờ.
- Hộp "Khách yêu cầu đích danh" mặc định tắt (BR-31). Bật thì giá theo cấp người đó (BR-56).
- Tạo xong thì lịch hiện trên lưới ở trạng thái Đã xác nhận, kèm toast "Đã tạo lịch cho Lê Thu Hà lúc 14:00." có Hoàn tác.
- Dưới 768px, panel mở thành `.sp-sheet`.

### 11c. Kéo thả (MH-27)

- Kéo một khối trên lịch (chuột và cảm ứng). Trong lúc kéo:
  - Tính vùng thả được cho từng cột bằng `findSlots` với chính lịch đó bỏ ra. Vẽ `.sp-cal__drop` và `--blocked`.
  - Nhãn `.sp-drag-label` ghi giờ mới, người, tài nguyên; chỗ cũ mờ đi.
  - Esc để hủy.
- **Thả:**
  - Lịch "Bất kỳ ai": đổi ngay, toast "Đã dời Chị Vân sang 11:30, Lan." có Hoàn tác 5 giây.
  - Lịch đích danh sang người khác: `ConfirmDialog` đúng `LichDoiNguoi.dc.html`. Có hộp "Gửi email báo …" mặc định bật. Đổi xong thì khối mang dấu "Chưa xác nhận đổi người" (BR-32).
- Giá giữ nguyên. Ghế cũ bận ở giờ mới thì tự chọn ghế khác, và dòng meta của khối đổi theo.
- Bàn phím: chọn khối, Enter mở menu "Dời giờ, đổi người" thay cho kéo. Kéo thả không là cách duy nhất.

### 11d. Chi tiết lịch hẹn trên điện thoại (MH-28)

- `/mock/app/[tenant]/appointments/[id]` đúng `LichChiTietDienThoai.dc.html`. Từ 768px trở lên vẫn là panel cạnh lịch như hiện có.
- Các nút theo trạng thái như trên máy tính.

### 11e. Màn kỹ thuật viên (MH-35, MH-36)

- Chọn vai trò Kỹ thuật viên ở `/mock` thì vào `/mock/app/[tenant]/my/schedule` (mặc định Mai), với thanh dưới riêng: Lịch của tôi, Xin nghỉ, Hoa hồng, Tài khoản.
- **Lịch của tôi:**
  - Có Ngày và Tuần.
  - Lịch đang chờ quay lại (hết đoạn chờ) đứng đầu, viền `brand`. Nút "Bắt đầu phần tiếp" hoặc "Bắt đầu" và "Xong" đổi trạng thái của mục (BR-36).
  - Không hiện số điện thoại khách khi cài đặt tắt, kèm câu giải thích.
- **Xin nghỉ:**
  - Chọn ngày, Cả ngày hoặc Vài giờ, lý do.
  - Danh sách lịch của mình trong khoảng đó, đánh dấu lịch khách chọn mình.
  - Gửi thì tạo đơn `pending`, toast, và đơn hiện ở MH-39.

### 11f. Xếp ca và nghỉ phép (MH-38, MH-39, MH-40)

- **Xếp ca (MH-38):** `ShiftGrid` đúng `XepCa.dc.html`.
  - Bấm ô thì sửa ở `SidePanel`: nhiều khung, "Thêm khung trong ngày", "Áp cho mọi Thứ … từ nay".
  - Bớt ca mà còn lịch thì cảnh báo, nút thành "Lưu và xếp lại N lịch". Lưu xong các lịch vào danh sách "Cần xếp lại" (BR-35), mở được bằng màn MH-40.
  - Có "Chép tuần trước". Hàng "Mở cửa" cảnh báo giờ không ai trực.
- **Đơn nghỉ phép (MH-39):** mẫu danh sách (MH-08) đúng `NghiPhepDanhSach.dc.html`. Mục "Nghỉ phép" trên thanh bên đếm số đơn chờ duyệt.
- **Xử lý (MH-40):** `AffectedList` đúng `NghiPhepXuLy.dc.html`.
  - Mỗi lịch có gợi ý tính bằng `findSlots`: người khác cùng giờ, hoặc giờ gần nhất.
  - Các nút: "Đổi sang …", "Gửi email hỏi ý", "Ghi nhận khách đồng ý", "Dời sang …", "Hủy và báo khách" (hoàn cọc 100%, BR-24), "Hoàn tác".
  - Hạn trả lời tính theo BR-33. Quá hạn thì dòng đổi thành "Quá hạn trả lời. Gọi khách." kèm nút Gọi.
  - "Duyệt nghỉ" chỉ bật khi mọi lịch đã xử lý (BR-11, BR-34). "Từ chối đơn" mở `ConfirmDialog` có ô lý do.
  - Duyệt xong thì lưới ca hiện "Nghỉ phép" ở ngày đó.

### 11g. Kiểm tra và hoàn tất

- `mock/screens.ts`: 8 màn của đợt A thành "Đang làm".
- Chạy axe trên mọi màn và trạng thái mới, ở hai theme, 1440px và 390px. Không có lỗi serious hoặc critical.
- `pnpm check:availability`, `pnpm build`, `pnpm typecheck`, `prettier --check` đều xanh.
- Mở PR mới: mô tả theo 11a–11g, mục "Tự quyết", ảnh. Ghi một mục Tiến độ.

**Xong khi:**
- **Tạo lịch (Tóc Mây):** bấm ô 14:00 ở cột Lan, tìm "0934 5", chọn Lê Thu Hà, Cắt tóc Tóc ngắn. Panel báo "Trống: Lan, Ghế 2. Xong lúc 14:45.", tạo xong thì khối hiện ở 14:00–14:45.
- **Tạo lịch (Pawpaw):** chọn Phạm Khánh Linh, bé Lucky, Tắm sấy, Vy, 11:00. Panel báo không đặt được và gợi ý 10:00 Vy, 12:00 Khoa, 12:30 Vy.
- **Kéo thả:**
  - Kéo Chị Vân (Hùng 11:30) sang Lan 11:30 thì đổi ngay, có Hoàn tác.
  - Kéo Chị Ngọc (đích danh Mai) sang Lan thì hỏi lại.
  - Kéo vào vùng gạch chéo thì không thả được.
- **Bàn phím:** dời được một lịch mà không dùng chuột.
- **Kỹ thuật viên:** vai trò Kỹ thuật viên chỉ thấy lịch của Mai, không thấy số điện thoại khách. Bật cài đặt ở Chính sách thì số hiện.
- **Xếp ca:** sửa ca Hùng Thứ Sáu thành 10:00–15:00 thì cảnh báo 2 lịch; lưu xong 2 lịch nằm trong "Cần xếp lại".
- **Nghỉ phép:** ở đơn của Lan, "Duyệt nghỉ" tắt cho tới khi xử lý xong cả 4 lịch.
- **Điện thoại:** ở 390px, mọi màn mới không cuộn ngang, trừ lưới lịch và lưới ca.

## Bước 12. Đợt B: phía khách (MH-11, MH-13 đến MH-21, MH-23)

Sau khi PR #6 merge. Căn cứ:
- Các bảng `design/screens/Khach*.dc.html` của đợt B (bảng ở `design/README.md`).
- Quy tắc BR-08, BR-16 đến BR-19, BR-23, BR-29, BR-64 và BR-32, BR-33 (phía khách trả lời đề nghị đổi người).
- Hàm `findSlots`, `pick`, `placeItem` ở `mock/`.

**Chữ và số trên bảng là minh họa.** Mock lấy từ dữ liệu mẫu và tính bằng hàm thật. Bảng ghi "Thư", nhưng khách đăng nhập trong mock là chị Quyên (Tóc Mây), người có lịch 10/11 14:00 với Lan đang chờ hỏi ý, và chị Linh (Pawpaw).

Làm trên nhánh `feat/mock-customer`, mỗi mục 12a–12i một commit, mở PR mới, không merge.

### 12a. Dọn sau Bước 11 và dữ liệu khách

- Gỡ `aria-pressed:hover:bg-(--accent)!` trong `components/sapio/date-strip.tsx`; CSS Sapio đã sửa.
- Lưới ca dùng `.sp-shiftgrid td[data-selected]` thay cho class Tailwind tự viết.
- Đổi "(BR-11)" thành:
  - BR-31 ở ô "Khách yêu cầu đích danh";
  - BR-32 ở hộp đổi người;
  - BR-35 ở panel bớt ca.
- **Khách đăng nhập:** `CustomerSession` theo từng cơ sở, giữ khách đang đăng nhập.
- **Dữ liệu cho chị Quyên:**
  - thêm email;
  - một lịch đã qua (hoàn thành) và một lịch đã hủy;
  - một lịch sắp tới nữa;
  - một lịch hôm nay trong vòng 4 giờ tới, để có trạng thái "quá hạn tự đổi";
  - gói 10 lần gội sấy còn 6 buổi;
  - ví có tiền nạp và tiền tặng.
- **Dữ liệu cho chị Linh:** email, Mochi và Lucky.
- Đưa `ScheduleStoreProvider` lên layout chung của `/mock`, để trang khách và khu quản trị cùng thấy một lịch. Ví dụ: khách bấm "Đồng ý" thì ở MH-40 dòng đó thành "Khách đã đồng ý". Không làm được gọn thì ghi vào "Tự quyết".

### 12b. Trang cơ sở (MH-11)

- `/mock/[tenant]`, đúng `KhachTrangCoSo` (điện thoại) và `KhachTrangCoSoDesktop` (từ 900px).
- Dịch vụ theo nhóm, giá "từ …" khi có nhiều biến thể hoặc giá theo cấp. Nút "Đặt" mở `/book` với dịch vụ đó đã chọn.
- Thợ theo hồ sơ công khai (BR-15), kèm giờ trống sớm nhất hôm nay tính bằng `findSlots` với dịch vụ đầu tiên người đó làm được.
- Giờ mở cửa theo tuần, ngày đặc biệt ghi riêng. Chính sách lấy từ cài đặt của cơ sở.
- Header có "Đăng nhập", hoặc ảnh đại diện khi đã đăng nhập.

### 12c. Nhiều dịch vụ (MH-13, BR-18)

- **Bước Dịch vụ:**
  - Chọn được tối đa 4 dịch vụ.
  - Khối "Làm theo thứ tự" có nút lên, xuống, bỏ. Thứ tự mặc định là thứ tự chọn.
  - Thanh dưới hiện tổng giá, tổng thời gian và cọc.
- **Giờ trống cho cả chuỗi:** thêm `findChainSlots` (hàm thuần) ở `mock/`:
  - Mục sau bắt đầu đúng lúc phần khách thấy của mục trước kết thúc.
  - Cùng một người làm và mục sau có đoạn Chuẩn bị thì lùi đúng đoạn đó.
  - "Bất kỳ ai" xếp từng mục theo BR-57; cùng cấp thì ưu tiên người làm mục trước. Mỗi mục trừ phần chiếm dụng của mình trước khi tính mục sau.
- **Bước Ngày giờ:**
  - Dòng "Thợ" kèm link "Chọn thợ riêng cho từng dịch vụ", mở `.sp-sheet` đúng bảng vẽ. Mỗi lựa chọn ghi giá theo BR-56.
  - Chọn giờ thì khối "Lịch của bạn" liệt kê từng mục: giờ, người, đoạn chờ nếu có.
- Xác nhận và email ghi đủ các mục.
- `check:availability` thêm:
  - Nhuộm rồi Cắt cùng Lan, nối liền nhau;
  - Cắt rồi Nhuộm cùng Lan, lùi 15 phút pha thuốc;
  - "Bất kỳ ai" cùng cấp thì giữ người;
  - đối chứng vét cạn cho chuỗi 2 mục.

### 12d. Đặt nhóm (MH-14, BR-19)

- **Pawpaw:** bước "Cho bé nào?" chọn nhiều bé (tối đa 4), mỗi bé chọn một dịch vụ, giá theo thuộc tính của từng bé.
- **Tóc Mây:**
  - Ở bước Dịch vụ có "Đặt cho nhiều người" mở "Đi mấy người?" đúng bảng vẽ.
  - Người đi cùng chỉ cần tên.
  - Đặt nhóm thì mỗi người một dịch vụ; khối "Làm theo thứ tự" tắt.
- **Giờ:** thêm `findGroupSlots` (hàm thuần):
  - "Cùng giờ": các mục cùng gốc, mỗi loại tài nguyên khác nhau, thử gán bằng quay lui.
  - "Giờ lệch nhau": khi không có giờ chung, gợi ý tổ hợp bắt đầu cách nhau không quá 60 phút, sắp theo giờ xong sớm nhất, tối đa 3 gợi ý mỗi buổi.
- Một người đặt, một mã OTP, một email.
- `check:availability` thêm:
  - Mochi và Lucky cùng giờ khi chỉ còn một lồng sấy rảnh: không có;
  - gợi ý lệch nhau đúng giới hạn 60 phút;
  - đối chứng vét cạn cho nhóm 2 mục.

### 12e. Trả cọc (MH-15, BR-29)

- Lịch có cọc thì "Xác nhận đặt lịch" sang `/mock/[tenant]/book/pay`, đúng `KhachTraCoc`:
  - QR tĩnh, số tiền, nội dung chuyển khoản, nút chép;
  - đếm ngược giữ chỗ lấy từ lúc chọn giờ, không cộng thêm.
- Mock có hai nút **chỉ cho người xem mock**, tách riêng và ghi rõ: "Giả lập: tiền về" và "Giả lập: tiền về sau khi hết giữ chỗ".
  - Tiền về kịp: thành màn "Đã đặt lịch".
  - Tiền về muộn, giờ còn trống: vẫn xác nhận.
  - Tiền về muộn, giờ đã có người đặt: màn "vừa có người đặt", báo đã hoàn đủ và 3 giờ gần nhất.
- Hết giữ chỗ mà chưa trả thì quay về bước Ngày giờ, giữ lựa chọn dịch vụ.

### 12f. Đăng nhập, lịch hẹn của khách (MH-16, MH-17, MH-18)

- **`/mock/[tenant]/login`:**
  - Email, rồi mã 6 số (mock nhận mã `482193`).
  - Email chưa có lịch thì màn "Chưa có lịch nào".
  - Phiên chỉ có ở cơ sở đó.
- **`/me`:** Sắp tới, Đã qua. Lịch chờ trả lời có badge "Cần bạn trả lời" và nút. "Đặt lại" mở `/book` với cùng dịch vụ và người.
- **`/me/appointments/[id]`:**
  - **Đề nghị đổi người** (lịch đang có cách xử lý "asked" ở đơn nghỉ):
    - "Đồng ý đổi sang …" thì cách xử lý thành "agreed".
    - "Chọn lại giờ" mở bước Ngày giờ với người khách đã chọn; không tính vào số lần đổi.
    - Hạn trả lời tính theo BR-33.
  - **Đổi giờ** ghi "còn N lần". Dùng lại bước Ngày giờ; đổi xong lịch giữ giá (BR-12).
  - **Hủy** mở `.sp-sheet`:
    - thời gian còn tới giờ hẹn;
    - tiền cọc, tiền hoàn theo BR-23 tính từ giờ mock;
    - lý do không bắt buộc.
    Hủy xong thì lịch trên lịch lễ tân thành Đã hủy.
  - **Quá hạn tự đổi** (dưới X giờ): ẩn hai nút, hiện số điện thoại cơ sở.
  - Lịch chuỗi hoặc nhóm chỉ đổi, hủy được cả lịch (BR-08).

### 12g. Bé, gói và ví, thông tin (MH-19, MH-20, MH-21)

- Thanh "Lịch hẹn · Bé của tôi · Gói và ví · Thông tin" ở mọi trang `/me`. "Bé của tôi" chỉ có ở ngành có đối tượng khác.
- **`/me/subjects`:**
  - Danh sách, Thêm, Sửa với trường theo schema ngành (dùng lại `SubjectFields`).
  - Kiểm theo BR-71.
  - Bé còn lịch sắp tới thì không có nút Xóa và ghi lý do.
  - Sửa thuộc tính không đổi lịch đã đặt.
- **`/me/wallet`:** gói (số buổi còn, hạn), ví (tiền nạp, tiền tặng), lịch sử. Chỉ xem.
- **`/me/profile`:**
  - Họ tên, số điện thoại (chuẩn hóa BR-61).
  - Email, với "Đổi email" gửi mã tới email mới.
  - "Nhận tin khuyến mãi" mặc định tắt (BR-64), ngày đồng ý xử lý dữ liệu.
  - Đăng xuất.

### 12h. Email (MH-23)

- `/mock/[tenant]/emails`: trang chỉ có trong mock, xem các mẫu email theo `KhachEmail`.
- Các mẫu: mã xác nhận, đã đặt lịch, nhắc trước 24 giờ, nhắc trước 2 giờ, đã đổi giờ, đã hủy, đã hoàn cọc, hỏi ý đổi người.
- Chung một khung: tên cơ sở, địa chỉ, dòng "gửi qua Sapio". Nội dung lấy từ lịch mẫu thật.
- Nút trong email trỏ tới route mock tương ứng.

### 12i. Kiểm tra và hoàn tất

- `mock/screens.ts`: MH-11, MH-13 đến MH-21, MH-23 thành "Đang làm".
- Trang khách dùng màu nhấn của cơ sở cho nút chính, ô chọn và link. Không dùng `sp-btn--primary` ở trang khách.
- axe trên mọi màn và trạng thái mới, hai theme, 390px và 1280px: 0 serious hoặc critical. Không cuộn ngang ở 390px.
- `pnpm check:availability`, `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- Mở PR mới: mô tả theo 12a–12i, mục "Tự quyết", ảnh. Ghi một mục Tiến độ.

**Xong khi:**
- **Trang cơ sở:** `/mock/toc-may` hiện giờ trống sớm nhất của Mai, Lan, Hùng. Bấm "Đặt" ở Nhuộm tóc vào `/book` với Nhuộm đã chọn.
- **Nhiều dịch vụ:**
  - Chọn Nhuộm tóc ngắn rồi Cắt tóc ngắn, ngày 07/11. Mọi giờ hiện ra đều có lịch "Lịch của bạn" đúng BR-18, và vét cạn khớp.
  - Đổi thứ tự sang Cắt rồi Nhuộm, chọn Lan cho cả hai: giữa hai mục có 15 phút chờ.
- **Đặt nhóm:**
  - Pawpaw, chọn Mochi và Lucky, Tắm sấy cả hai: có giờ "cùng giờ" hoặc gợi ý lệch nhau không quá 60 phút.
  - Tóc Mây 2 người: hai mục khác thợ, khác ghế.
- **Trả cọc:** đủ ba trạng thái bằng hai nút giả lập. Hết đếm ngược thì quay về bước Ngày giờ.
- **Đổi người:** đăng nhập chị Quyên, mở lịch 10/11 và bấm "Đồng ý". Ở `/mock/app/toc-may/time-off/may-lv-1`, dòng đó thành "Khách đã đồng ý" (hoặc ghi lý do trong "Tự quyết" nếu chưa chung store).
- **Hủy:** lịch có cọc, còn trên 24 giờ, hủy thì hoàn 100%. Lịch hôm nay trong 4 giờ thì không có nút hủy, có số điện thoại.
- **Bé:** sửa cân nặng Lucky thành 0 thì báo lỗi. Lucky còn lịch nên không có nút Xóa.
- **Điện thoại:** ở 390px mọi màn mới không cuộn ngang.

## Bước 13. Đợt C: tiền (MH-29, MH-30, MH-31, MH-33, MH-34)

Sau khi PR #7 merge. Căn cứ:
- Các bảng của đợt C: `ThuTien`, `ThuTienQR`, `BanGoi`, `NapVi`, `HoaDon*`, `HoSoKhach`, `HoanTien*` (bảng ở `design/README.md`).
- Quy tắc BR-10, BR-20 đến BR-29, BR-40, BR-42, BR-62, BR-63.

Chữ và số trên bảng là minh họa; mock tính từ dữ liệu mẫu. Kiểm trên máy theo `CLAUDE.md`: không chạy Playwright hay axe. Làm trên nhánh `feat/mock-money`, mỗi mục 13a–13g một commit, mở PR mới, không merge.

### 13a. Dọn sau Bước 12 và dữ liệu tiền

- Trang khách đọc X, N (BR-08) và BR-06 từ chính sách của cơ sở trong store, không đọc từ chính sách mặc định của gói ngành. Sửa ở Cài đặt › Chính sách thì trang khách đổi theo.
- **Hàm thuần ở `mock/money.ts`** (đơn vị VND `bigint`, không dùng số thực):
  - `invoiceTotals(lines, discount, deposit)`: tính theo thứ tự BR-22.
  - `splitWallet(amount, real, bonus)`: trừ tiền thật trước (BR-25).
  - `refundable(invoice, payment)`: số còn hoàn được của một khoản (BR-28).
  - `packageRefund` theo BR-27.
  - `sessionRevenue` theo BR-26.
  - `commissionClawback` theo BR-40, BR-42.
- **Sổ ví** chỉ thêm bút toán (BR-20); số dư là tổng bút toán.
- **Dữ liệu mẫu:**
  - Hóa đơn của ngày 06/11 và 07/11 như `HoaDonDanhSach`.
  - Ví của Lê Thu Hà: nạp 1.000.000 ₫, tặng 100.000 ₫, đã trả 850.000 ₫.
  - Gói 5 lần gội sấy của Nguyễn Bảo An, còn 2 buổi.
  - 4 yêu cầu hoàn tiền, trong đó có một yêu cầu "Tự động" theo BR-29.
- **`check:availability`** (hoặc script mới `check:money`) thêm các ca: ví 200.000 ₫ trừ 150.000 ₫ tiền thật và 50.000 ₫ tiền tặng; hoàn gói 700.000 − 3 × 80.000 − 50.000; hoàn không vượt số đã thu.

### 13b. Thu tiền (MH-29)

- `/mock/app/[tenant]/checkout/[appointmentId]`, đúng `ThuTien` và `ThuTienQR`. Lịch hoàn thành thì có hóa đơn nháp; nút "Thu tiền" ở Hôm nay, Lịch và chi tiết lịch mở trang này thay cho hộp thu tiền hiện có.
- **Dòng:**
  - Dịch vụ theo giá lúc đặt (BR-12), không sửa được.
  - "Thêm dòng bán lẻ" (tên, số lượng, đơn giá), bỏ được.
  - "Dùng buổi gói" khi khách có gói áp dụng cho dòng đó: dòng thành 0 ₫ kèm badge Gói.
- **Giảm giá:** phần trăm hoặc số tiền, lý do bắt buộc. Lễ tân không có quyền quản lý thì ô tắt, ghi "Cần quản lý".
- **Phương thức:**
  - Ví ghi rõ phần tiền thật, tiền tặng.
  - Tiền mặt có ô "Khách đưa" và tiền thối.
  - Chuyển khoản mở hộp QR đúng `ThuTienQR`. Trong mock có nút "Giả lập: tiền về".
  - Thẻ chỉ ghi tay.
- Tổng các khoản chưa đúng số còn phải thu thì dòng báo thiếu hoặc thừa, nút Thu tắt.
- **Bấm Thu:** nút khóa ngay; bấm hai lần chỉ ghi một khoản (BR-21). Thu xong:
  - lịch thành đã thanh toán, sổ ví thêm bút toán;
  - buổi gói bị trừ;
  - hoa hồng ghi vào kỳ đang mở;
  - chuyển sang chi tiết hóa đơn.

### 13c. Bán gói, nạp ví (MH-30)

- `/mock/app/[tenant]/sales/new?type=package|wallet`, đúng `BanGoi`, `NapVi`. Gói lấy từ cấu hình gói; mức tặng lấy từ cài đặt thanh toán (mặc định nạp từ 1.000.000 ₫ tặng 10%).
- "Thu …" mở MH-29 với một dòng gói hoặc nạp ví. Thu xong thì gói hoặc số dư hiện ngay ở hồ sơ khách.
- Nút "Bán gói, nạp ví" ở Hóa đơn và hồ sơ khách.

### 13d. Hóa đơn (MH-31)

- **`/invoices`:** mẫu danh sách (MH-08) đúng `HoaDonDanhSach`. Lọc Hôm nay, Phương thức, Trạng thái; tìm theo số, tên, số điện thoại.
- **`/invoices/[id]`:** đúng `HoaDonChiTiet`, gồm dòng, khoản thanh toán có mã, lịch sử.
  - "In" mở bản in gọn (`@media print`).
  - "Gửi email" chỉ hiện toast trong mock.
  - "Yêu cầu hoàn tiền" mở hộp đúng `HoanTienTao`:
    - chọn khoản đã trả;
    - nhập số tiền, tối đa số còn hoàn được;
    - lý do bắt buộc;
    - khoản cọc đã trừ vào dịch vụ thì tắt và ghi lý do.

### 13e. Hồ sơ khách (MH-33)

- `/customers/[id]`, đúng `HoSoKhach`. Bấm tên ở danh sách khách mở trang này.
- **Lịch sử lịch hẹn** có link hóa đơn.
- **Sổ ví** theo từng bút toán.
- **Ví và gói:** "Rút tiền thật" chỉ bật khi còn tiền thật (BR-25).
- **Ghi chú nội bộ** (BR-62).
- **Bắt buộc đặt cọc:** tự bật khi đủ K lần không đến (BR-10); tắt tay cần quản lý và lý do.
- **Ngày đồng ý xử lý dữ liệu** và lựa chọn nhận tin khuyến mãi (BR-64).
- Ngành có đối tượng thì có thêm phần "Bé" (dùng lại danh sách của trang khách, chỉ xem).

### 13f. Hoàn tiền (MH-34)

- `/refunds` đúng `HoanTien`. Lọc Chờ duyệt mặc định. Số trên thanh bên đếm số yêu cầu chờ duyệt.
- Bấm một dòng chờ duyệt thì mở `SidePanel` duyệt:
  - các con số;
  - lý do;
  - khối "Duyệt thì", liệt kê bút toán đảo, hoa hồng bị thu hồi vào kỳ nào, buổi gói được trả lại.
- **Duyệt:** hóa đơn thành "Đã hoàn" hoặc "Đã hoàn một phần", và ghi nhật ký (BR-63).
- **Từ chối:** cần ghi chú.
- Vai trò lễ tân thấy danh sách nhưng không có nút duyệt (BR-28).
- Hoàn cọc tự động (BR-29) hiện với người tạo "Tự động", không cần duyệt.

### 13g. Hoàn tất

- `mock/screens.ts`: MH-29, MH-30, MH-31, MH-33, MH-34 thành "Đang làm".
- `pnpm check:availability` (và `check:money` nếu có), `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- Mở PR mới: mô tả theo 13a–13g, mục "Tự quyết". Ghi một mục Tiến độ.

**Xong khi** (người dùng tự kiểm):
- **Thu tiền:** Lê Thu Hà, lịch 09:00, thêm một dòng bán lẻ 120.000 ₫, chọn Ví và Tiền mặt. Ví trừ đúng 150.000 ₫ tiền thật và 50.000 ₫ tiền tặng; khách đưa 500.000 ₫ thì thối 180.000 ₫. Bấm Thu hai lần chỉ có một hóa đơn.
- **Dùng gói:** Nguyễn Bảo An dùng 1 buổi gói cho Gội sấy, phần còn lại chuyển khoản; bấm "Giả lập: tiền về" thì hóa đơn thành Đã thu, gói còn 1 buổi.
- **Nạp ví:** nạp 1.000.000 ₫ cho một khách thì ví có thêm 100.000 ₫ tiền tặng.
- **Hoàn tiền:**
  - Yêu cầu hoàn 120.000 ₫ ở HĐ-0187, rồi duyệt bằng vai trò Quản lý: hóa đơn thành Đã hoàn một phần, hoa hồng của Mai có một dòng thu hồi.
  - Vai trò Lễ tân không duyệt được.
- **Hồ sơ khách:** Lê Thu Hà có số dư 50.000 ₫ tiền tặng, "Rút tiền thật" tắt.

## Bước 14. Đợt D: cấu hình cơ sở (MH-42, MH-43, MH-46, MH-49 đến MH-54, MH-57)

Sau khi PR #8 merge. Căn cứ:
- Các bảng `ChiNhanhChiTiet`, `TaiNguyen`, `ChinhSach`, `ThuongHieu`, `GoiLieuTrinh`, `ThanhToan`, `ThongBao`, `ChatbotCaiDat`, `NhatKy` (bảng ở `design/README.md`).
- Quy tắc BR-02, BR-06 đến BR-10, BR-23, BR-25, BR-27, BR-35 đến BR-38, BR-63, BR-65 đến BR-67.

Chữ và số trên bảng là minh họa; mock đọc và ghi vào store. Kiểm trên máy theo `CLAUDE.md`. Làm trên nhánh `feat/mock-settings`, mỗi mục 14a–14h một commit, mở PR mới, không merge.

### 14a. Store cấu hình

- Cấu hình của cơ sở vào store chung: chi nhánh, giờ mở cửa, ngày đặc biệt, giá riêng, tài nguyên và khoảng ngưng, chính sách, thương hiệu, gói, thanh toán, thông báo, chatbot.
- Mọi màn đã có đọc từ store:
  - `findSlots` dùng giờ mở cửa và ngày đặc biệt của store, tài nguyên đang ngưng thì không dùng được;
  - giá theo chi nhánh;
  - trang khách theo chính sách và thương hiệu;
  - Thu tiền theo mức tặng và phương thức.
- Mỗi lần lưu ghi một dòng nhật ký (BR-63). Đổi số chỉ áp từ lúc lưu (BR-38).

### 14b. Chi nhánh (MH-42, MH-43)

- **`/settings/branches`:** mẫu danh sách, cột tên, địa chỉ, số nhân viên, số tài nguyên. Gói Cơ bản chỉ một chi nhánh: nút Thêm khóa kèm "cần nâng gói".
- **`/settings/branches/[id]`** đúng `ChiNhanhChiTiet`:
  - Giờ mỗi ngày nhiều khung, kiểm không chồng nhau (BR-02).
  - Ngày đặc biệt: đóng cửa, hoặc giờ khác.
  - Giá riêng: để trống là giá chung.
- **Lưu mà có lịch nằm ngoài giờ mới:** hiện cảnh báo, nút thành "Lưu và xếp lại N lịch". Lưu xong các lịch vào "Cần xếp lại" (dùng lại của BR-35).

### 14c. Tài nguyên (MH-46, BR-37)

- `/settings/resources` đúng `TaiNguyen`: nhóm theo loại từ gói ngành, cột lịch 7 ngày tới.
- **"Tạm ngưng"** mở `SidePanel`: khoảng giờ, lý do, danh sách lịch bị ảnh hưởng tính bằng hàm thuần.
  - Lịch còn tài nguyên cùng loại trống: ghi "Ghế 1 trống" và tự chuyển khi lưu.
  - Lịch không còn chỗ: vào "Cần xếp lại".
- "Mở lại" kết thúc khoảng ngưng ngay. Thêm, sửa tài nguyên bằng form nhỏ.

### 14d. Chính sách (MH-49)

- Trang hiện có, đổi theo `ChinhSach`: mỗi ô có câu ví dụ tính từ giờ mock và số đang nhập (ví dụ "bây giờ là 10:20 thì khách đặt được từ 13:30").
- Thêm ba mức hoàn cọc (BR-23).
- Thanh lưu ghi rõ đang đổi gì.

### 14e. Thương hiệu (MH-50, BR-65)

- `/settings/branding` đúng `ThuongHieu`.
- Ảnh chỉ là ô chọn tệp, xem trước trong trình duyệt, không tải lên đâu.
- **Màu nhấn:**
  - Có 5 màu gợi ý và ô mã màu.
  - Tính tương phản với chữ trắng; dưới 4,5 : 1 thì báo lỗi và nút Lưu tắt.
  - Màu nhạt cho nền ô chọn sinh ra từ màu nhấn.
- **Đường dẫn:**
  - Kiểm định dạng và trùng với cơ sở khác.
  - Đổi thì ghi "link cũ chuyển hướng 90 ngày"; mock giữ slug cũ trỏ về slug mới.
- Khung xem trước dùng đúng màu đang chọn. Lưu xong thì trang khách đổi màu.

### 14f. Gói liệu trình, thanh toán (MH-51, MH-52)

- **`/settings/packages`** đúng `GoiLieuTrinh`:
  - Danh sách và `SidePanel` sửa.
  - Dòng "X ₫ mỗi buổi, rẻ hơn giá lẻ Y%".
  - Công tắc Đang bán.
  - Sửa chỉ áp cho gói bán sau (BR-38).
  - Bán gói ở MH-30 chỉ liệt kê gói đang bán.
- **`/settings/payments`** đúng `ThanhToan`:
  - Cổng giả lập: khóa che, "Tạo khóa mới", "Gửi thử một thông báo" ghi một dòng vào lịch sử cổng.
  - Phương thức tại quầy; Tiền mặt luôn bật.
  - Mức tặng nhiều bậc, áp bậc cao nhất đạt được.
  - Phí hủy gói.
  - MH-29 và MH-30 đọc từ đây.

### 14g. Thông báo, chatbot (MH-53, MH-54, BR-66, BR-67)

- **`/settings/notifications`** đúng `ThongBao`:
  - Email bắt buộc thì công tắc khóa, ghi lý do.
  - Nhắc 24 giờ và 2 giờ tắt được.
  - Xem trước dùng mẫu ở `mock/emails.ts` với một lịch thật. "Gửi thử" chỉ hiện toast.
- **`/settings/chatbot`** đúng `ChatbotCaiDat`:
  - Bật tắt, lời chào (tối đa 200 ký tự), hai giới hạn lượt, số lượt đã dùng tháng này.
  - Khung xem trước dùng lời chào đang nhập.
  - Gói Cơ bản thì trang khóa như hiện có.

### 14h. Nhật ký và hoàn tất (MH-57)

- `/audit-log` đúng `NhatKy`: mẫu danh sách, lọc người, thao tác, khoảng ngày; tìm theo đối tượng.
- Gom các dòng đã ghi ở Bước 13, 14 và các thao tác hệ thống tự làm (bật bắt buộc cọc, hoàn cọc tự động). Không có nút sửa hay xóa.
- `mock/screens.ts`: 10 màn của đợt D thành "Đang làm".
- `pnpm check:availability`, `pnpm check:money`, `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- Mở PR mới, mô tả theo 14a–14h, có mục "Tự quyết". Ghi một mục Tiến độ.

**Xong khi** (người dùng tự kiểm):
- **Giờ mở cửa:** Chủ Nhật nghỉ trưa 12:00–14:00 thì trang khách không còn giờ trong khoảng đó; lịch đã có lúc 12:30 vào "Cần xếp lại".
- **Đóng cửa:** thêm ngày đóng cửa 15/11 thì lịch trên trang khách ngày đó không còn giờ.
- **Tạm ngưng:** tạm ngưng Ghế 2 ngày 10/11 09:00–13:00 thì lịch có ghế khác trống tự chuyển ghế, lịch không còn chỗ vào "Cần xếp lại".
- **Chính sách:** đổi "Đặt trước ít nhất" thành 3 giờ thì trang khách bỏ các giờ trước 13:30 hôm nay, và nhật ký có dòng mới.
- **Thương hiệu:** chọn màu vàng nhạt thì báo không đạt tương phản, không lưu được; chọn Xanh biển rồi lưu thì trang khách đổi màu.
- **Gói và ví:** ngừng bán "Gói 5 lần gội sấy" thì MH-30 không còn gói này; thêm mức nạp 3.000.000 ₫ tặng 15% thì MH-30 tính đúng.

## Bước 15. Đợt E: tổng quan, báo cáo, hoa hồng (MH-37, MH-41, MH-55, MH-56)

Sau khi PR #9 merge. Căn cứ:
- Các bảng `TongQuan`, `BaoCao`, `HoaHong`, `HoaHongKy`, `KtvHoaHong` (bảng ở `design/README.md`).
- Quy tắc BR-26, BR-28, BR-36, BR-40 đến BR-47, BR-63, BR-87.

Chữ và số trên bảng là minh họa; mock tính từ store bằng hàm thuần. Kiểm trên máy theo `CLAUDE.md`. Làm trên nhánh `feat/mock-reports`, mỗi mục 15a–15g một commit, mở PR mới, không merge.

### 15a. Hoa hồng trong store (BR-40 đến BR-42)

- Bỏ `commissionPercent`; thêm quy tắc: phạm vi (`all`, một dịch vụ, `retail`), cấp (một cấp hoặc mọi cấp), tỉ lệ, ngày hiệu lực. Dữ liệu mẫu như bảng `HoaHong`: mọi dịch vụ 10% từ 01/10/2026; Nhuộm tóc, Thợ chính 12% từ 01/12/2026; bán lẻ 5% từ 01/10/2026. Pawpaw có bộ quy tắc riêng tương tự.
- `mock/commission.ts` (hàm thuần):
  - `ruleFor(line, staffLevel, date)`: quy tắc cụ thể nhất đang hiệu lực (dịch vụ và cấp > dịch vụ > mọi dịch vụ và cấp > mọi dịch vụ).
  - Khoản hoa hồng lưu kèm quy tắc, tỉ lệ, số tính trên, dòng hóa đơn, để khoản thu hồi dùng đúng tỉ lệ đó.
  - `periodFor(date)`: kỳ theo tháng, giờ chi nhánh. Khoản hoa hồng vào kỳ của ngày thu tiền; khoản thu hồi vào kỳ của ngày duyệt hoàn (sửa `commissionClawback`, hiện đang lấy kỳ mở đầu tiên).
  - Chốt kỳ: chỉ khi tháng đã hết; kỳ đã chốt không nhận thêm khoản nào.
- **Dòng bán lẻ** ở Thu tiền có ô "Người bán", mặc định người làm dịch vụ đầu tiên của hóa đơn, chọn "Không ai" được (BR-40).
- Dữ liệu mẫu: kỳ 09/2026 đã chốt, 10/2026 hết kỳ chưa chốt, 11/2026 đang mở. Có một hoàn tiền duyệt 05/11 cho hóa đơn tháng 10 để thấy khoản thu hồi.
- `scripts/check-reports.ts` và lệnh `pnpm check:reports`: quy tắc cụ thể hơn thắng, quy tắc 01/12 không áp cho hóa đơn 30/11, buổi gói tính trên doanh thu buổi, bán lẻ để trống người bán thì không ai có, thu hồi vào kỳ của ngày duyệt với tỉ lệ gốc, kỳ đã chốt không đổi.

### 15b. Số liệu báo cáo (BR-45 đến BR-47)

- `mock/reports.ts` (hàm thuần), mọi hàm nhận chi nhánh và khoảng ngày:
  - doanh thu thực hiện, tiền thu vào, tiền trả trước còn giữ;
  - lấp đầy (đoạn Chuẩn bị và Làm trên phút trong ca sau nghỉ phép; đoạn Chờ không tính);
  - không đến (kèm giá trị lịch mất, tiền cọc giữ);
  - theo ngày, theo nhân viên, theo dịch vụ; khoảng liền trước cùng độ dài để so sánh.
- Thêm vào `check:reports`: ví dụ gói 5 buổi 350.000 ₫ dùng 1 buổi (tiền thu vào 350.000 ₫, doanh thu thực hiện 70.000 ₫, trả trước còn 280.000 ₫); trả bằng ví không là tiền thu vào; tổng theo nhân viên và theo dịch vụ bằng tổng doanh thu thực hiện.

### 15c. Tổng quan (MH-41)

- `/app/[tenant]` đúng `TongQuan`, cho chủ cơ sở và quản lý (thay trang "Chưa làm" hiện tại).
- Bốn ô số tính bằng 15b. "Việc cần xử lý" lấy từ store, mỗi dòng có nút "Mở" tới đúng màn:
  - đơn nghỉ chờ duyệt → `/time-off/[id]`;
  - hoàn tiền chờ duyệt → `/refunds`;
  - lịch "Cần xếp lại" → nơi xử lý hiện có;
  - kỳ hoa hồng hết 7 ngày chưa chốt → `/commission` (chỉ chủ cơ sở thấy).
- Bảng "Đang diễn ra" và biểu đồ "Lấp đầy 7 ngày tới" (SVG như bảng vẽ, không thêm thư viện biểu đồ; ngày đóng cửa ghi rõ).

### 15d. Báo cáo (MH-55)

- `/reports` đúng `BaoCao`: chọn Hôm nay, 7 ngày, Tháng này, Tùy chọn; chọn chi nhánh; năm ô số so với khoảng trước; biểu đồ theo ngày hai đường; bảng theo nhân viên và theo dịch vụ.
- "Xuất CSV" tạo tệp trong trình duyệt (Blob), ghi một dòng nhật ký.
- Gói Cơ bản vẫn khóa như hiện có (BR-87).

### 15e. Hoa hồng (MH-56)

- `/commission` đúng `HoaHong`, chỉ chủ cơ sở:
  - Bảng quy tắc; quy tắc chưa tới ngày hiệu lực có nhãn "Chưa áp". "Thêm quy tắc" và "Sửa" mở `SidePanel`; ngày hiệu lực không trước hôm nay. Sửa quy tắc đã áp thì tạo quy tắc mới từ ngày chọn, quy tắc cũ giữ nguyên cho hóa đơn trước đó (BR-41). Mỗi lần lưu ghi nhật ký.
  - Bảng các kỳ. Kỳ hết tháng chưa chốt có nút "Chốt kỳ": khung bên phải liệt kê tổng từng người, xác nhận rồi khóa, ghi nhật ký (BR-42, BR-63).
- `/commission/periods/[id]?staff=` đúng `HoaHongKy`: chọn người, bốn ô (tạm tính, từ dịch vụ, từ bán lẻ, thu hồi), bảng từng dòng gắn hóa đơn, xuất CSV.

### 15f. Hoa hồng của kỹ thuật viên (MH-37)

- `/my/commission` đúng `KtvHoaHong`, giao diện điện thoại như "Lịch của tôi"; thanh dưới thêm "Hoa hồng".
- Chỉ số của chính người đang đăng nhập, kỳ đang mở, các dòng gần đây và khoản thu hồi; tên khách không kèm số điện thoại (BR-36, BR-44). Đổi người qua bộ chọn vai trò thì số đổi theo.

### 15g. Việc còn lại từ Bước 14 và hoàn tất

- Ngày đặc biệt có nhiều khung giờ như ngày thường (`SpecialDay.hours` thành danh sách khung; form ở `/settings/branches/[id]` thêm, bớt khung; `openingWindows` đọc đủ). Thêm ca vào `check:shop`.
- `/settings/branding`: ô "Tên miền" ghi `toc-may` với phần đuôi `.sapio.vn`, câu kiểm "toc-may.sapio.vn đang là của bạn" (bảng `ThuongHieu` đã sửa theo T-16).
- `mock/screens.ts`: MH-37, MH-41, MH-55, MH-56 thành "Đang làm".
- `pnpm check:availability`, `pnpm check:money`, `pnpm check:shop`, `pnpm check:reports`, `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- Mở PR mới, mô tả theo 15a–15g, có mục "Tự quyết". Ghi một mục Tiến độ.

**Xong khi** (người dùng tự kiểm):
- **Tổng quan:** có dòng "Kỳ hoa hồng 10/2026 chưa chốt"; chốt kỳ xong dòng đó mất. Duyệt đơn nghỉ của Lan thì dòng của Lan mất.
- **Báo cáo:** đổi 7 ngày sang Tháng này thì năm ô và hai bảng đổi theo; tổng cột doanh thu thực hiện của bảng nhân viên bằng ô Doanh thu thực hiện.
- **Quy tắc:** thêm "Gội sấy, mọi cấp, 15%, từ hôm nay", thu tiền một lịch gội sấy thì kỳ đang mở có dòng 15%; lịch cắt tóc vẫn 10%.
- **Thu hồi:** duyệt hoàn một phần hóa đơn tháng 10 thì khoản âm vào kỳ 11/2026, kỳ 10/2026 không đổi.
- **Kỹ thuật viên:** vào vai Mai thì thấy đúng 794.000 ₫ như chủ cơ sở thấy ở kỳ 11/2026 của Mai (số có thể khác bảng vẽ nếu dữ liệu mẫu khác, nhưng hai màn phải bằng nhau).
- **Ngày đặc biệt:** thêm 20/11 mở 09:00–12:00 và 15:00–20:00 thì trang khách ngày đó không có giờ 12:00–15:00.

## Câu lệnh gợi ý cho Claude Code

Bước 1–6:

```
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md,
datn-docs/design/README.md và datn-docs/design/sapio/README.md.
Thực hiện datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md từ Bước 1,
trên nhánh feat/ui-mock, mỗi bước một commit, kiểm tra "Xong khi" trước khi
sang bước sau. Xong thì mở pull request, không merge. Dừng lại hỏi mình nếu
thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```

Bước 7 (sau review):

```
git checkout feat/ui-mock && git pull. Đọc CLAUDE.md, mục mới nhất của
datn-docs/content/docs/du-an/tien-do.md, D-13 và D-14 trong quyet-dinh.md,
BR-16 và BR-17 trong quy-tac.md, design/sapio/README.md và README của
ConfirmDialog, Toast, Segmented, SlotPicker. Làm Bước 7 trong
datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 7a đến 7f, mỗi mục một
commit, đẩy lên PR #2. Kiểm "Xong khi" trước khi báo xong. Không merge.
Dừng lại hỏi mình nếu thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```

Bước 8:

```
git checkout main && git pull && git checkout -b feat/mock-app-shell.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, T-15 trong
quyet-dinh-ky-thuat.md, content/docs/thiet-ke/man-hinh.md, design/README.md,
design/sapio/README.md (mục "Khu quản trị") và README của AppShell, DataTable,
FormSection. Làm Bước 8 trong datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md,
mục 8a đến 8f, mỗi mục một commit. Bố cục và chữ lấy theo design/screens/QuanTri*.dc.html.
Kiểm "Xong khi" trước khi báo xong, mở PR mới, không merge. Dừng lại hỏi mình nếu
thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```

Bước 9:

```
git checkout main && git pull && git checkout -b feat/mock-signup-plan.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, D-15 trong
quyet-dinh.md, T-16 và T-17 trong quyet-dinh-ky-thuat.md, BR-72 đến BR-75 và BR-80 đến
BR-88 trong quy-tac.md, design/README.md và README của SignupFlow, ChoiceCard, OtpField,
Banner, Checklist, Plan. Làm Bước 9 trong datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md,
mục 9a đến 9f, mỗi mục một commit. Bố cục và chữ lấy theo design/screens/DangKy*.dc.html
và Goi*.dc.html. Kiểm "Xong khi" trước khi báo xong, mở PR mới, không merge. Dừng lại hỏi
mình nếu thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```

Bước 10:

```
git checkout main && git pull && git checkout -b feat/mock-services.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, BR-50 đến BR-59
và BR-70 trong quy-tac.md, content/docs/ky-thuat/thuat-toan-gio-trong.md (mục 2 đến 4),
T-05 trong quyet-dinh-ky-thuat.md, design/README.md và README của SegmentTimeline,
DetailPage, FormSection, AppointmentBlock. Làm Bước 10 trong
datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 10a đến 10f, mỗi mục một commit.
Bố cục và chữ lấy theo design/screens/DichVu*.dc.html và GoiNganh*.dc.html. Kiểm "Xong khi"
trước khi báo xong, mở PR mới, không merge. Dừng lại hỏi mình nếu thiết kế mâu thuẫn với
quy tắc nghiệp vụ hoặc với 10 ví dụ của trang thuật toán.
```

Bước 11:

```
git checkout main && git pull && git checkout -b feat/mock-scheduling-ops.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, BR-11 và BR-30 đến
BR-36 trong quy-tac.md, design/README.md, mục "Khu quản trị" của design/sapio/README.md và README
của SidePanel, ShiftGrid, AffectedList, ResourceCalendar. Làm Bước 11 trong
datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 11a đến 11g, mỗi mục một commit.
Bố cục và chữ lấy theo các bảng của đợt A trong design/screens/. Kiểm "Xong khi" trước khi báo
xong, mở PR mới, không merge. Dừng lại hỏi mình nếu thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```

Bước 12:

```
git checkout main && git pull && git checkout -b feat/mock-customer.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, BR-08, BR-16 đến BR-19,
BR-23, BR-29, BR-32, BR-33, BR-64 trong quy-tac.md, và design/README.md (các bảng Khach*). Làm Bước 12
trong datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 12a đến 12i, mỗi mục một commit. Bố cục
theo các bảng của đợt B trong design/screens/; chữ và số lấy từ dữ liệu mẫu, tính bằng hàm thật. Kiểm
"Xong khi" trước khi báo xong, mở PR mới, không merge. Dừng lại hỏi mình nếu thiết kế mâu thuẫn với quy
tắc nghiệp vụ.
```

Bước 13:

```
git checkout main && git pull && git checkout -b feat/mock-money.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, BR-10, BR-20 đến BR-29,
BR-40, BR-42, BR-62, BR-63 trong quy-tac.md, và design/README.md (các bảng của đợt C). Làm Bước 13
trong datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 13a đến 13g, mỗi mục một commit. Bố cục
theo bảng; chữ và số lấy từ dữ liệu mẫu, tính bằng hàm thuần ở mock/money.ts, tiền là bigint. Chỉ chạy
các lệnh kiểm trong CLAUDE.md, không chạy Playwright hay axe. Mở PR mới, không merge. Dừng lại hỏi mình
nếu thiết kế mâu thuẫn với quy tắc nghiệp vụ.
```

Bước 14:

```
git checkout main && git pull && git checkout -b feat/mock-settings.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, BR-02, BR-06 đến BR-10,
BR-23, BR-25, BR-27, BR-35 đến BR-38, BR-63, BR-65 đến BR-67 trong quy-tac.md, và design/README.md
(các bảng của đợt D). Làm Bước 14 trong datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 14a
đến 14h, mỗi mục một commit. Bố cục theo bảng; chữ và số lấy từ store, logic là hàm thuần ở mock/.
Chỉ chạy các lệnh kiểm trong CLAUDE.md. Mở PR mới, không merge. Dừng lại hỏi mình nếu thiết kế mâu
thuẫn với quy tắc nghiệp vụ.
```

Bước 15:

```
git checkout main && git pull && git checkout -b feat/mock-reports.
Đọc CLAUDE.md, mục mới nhất của datn-docs/content/docs/du-an/tien-do.md, BR-26, BR-28, BR-36,
BR-40 đến BR-47, BR-63, BR-87 trong quy-tac.md, và design/README.md (các bảng của đợt E). Làm Bước 15
trong datn-docs/content/docs/ky-thuat/ke-hoach-ui-mock.md, mục 15a đến 15g, mỗi mục một commit. Bố cục
theo bảng; chữ và số tính từ store bằng hàm thuần ở mock/, tiền là bigint. Chỉ chạy các lệnh kiểm trong
CLAUDE.md và các lệnh check của mục 15g. Mở PR mới, không merge. Dừng lại hỏi mình nếu thiết kế mâu
thuẫn với quy tắc nghiệp vụ.
```
