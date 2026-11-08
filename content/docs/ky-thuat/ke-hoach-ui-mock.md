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
