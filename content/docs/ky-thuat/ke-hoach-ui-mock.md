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
