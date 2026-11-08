---
title: Tiến độ
description: Nhật ký tiến độ theo tuần. Mỗi phiên làm việc kết thúc bằng một dòng ở đây.
---

**Quy ước:** mới nhất ở trên. Mỗi mục ghi: đã làm gì, vướng gì, việc tiếp theo. Cuối đồ án, trang này dùng làm phụ lục báo cáo.

## Tuần 1 (02/11 – 08/11/2026)

### 08/11/2026 (chiều): chốt cấu hình dịch vụ, gói cấu hình ngành, thuật toán giờ trống
- **Đã làm:**
  - Review PR #4 (Bước 9), người dùng đã merge sau khi sửa ba điểm: một đồng hồ chung cho mock, giá trung bình mỗi tháng, ngày gia hạn trên trang khóa.
  - Vẽ và chốt MH-45 Chi tiết dịch vụ (Tóc Mây, Pawpaw, điện thoại) và MH-59 Gói cấu hình ngành (danh sách, chi tiết) trên canvas.
  - Sapio thêm `SegmentTimeline`, `DetailPage`, đoạn chuẩn bị, dọn dẹp trên khối lịch hẹn, thanh cuộn mảnh theo theme.
  - Viết [Thuật toán tính giờ trống](../ky-thuat/thuat-toan-gio-trong.md) (BT1): mô hình, mã giả, 10 ví dụ tính tay, đối chứng vét cạn cho E1. Cả 10 ví dụ đã kiểm lại bằng một bản vét cạn viết riêng; bản này bắt được bốn chỗ tính tay sai ở cận trên, đã sửa.
- **Chốt:**
  - Khách chỉ thấy phần làm; chuẩn bị trước giờ hẹn, dọn dẹp sau.
  - Dọn dẹp tính theo từng loại tài nguyên, bắt đầu ngay khi đoạn cuối dùng loại đó xong.
  - Đoạn chờ không giữ nhân viên.
  - Một mục giữ cùng một thợ, cùng một ghế.
  - Dọn dẹp phải xong trước giờ đóng cửa.
  - Lưới 15′.
  - "Bất kỳ ai" trả giá cấp thấp nhất và được xếp cho cấp thấp nhất trước.
  - Biến thể theo thuộc tính phải phủ đủ, không trùng.
  - Lịch đã đặt giữ thời gian và giá cũ.

  Các ý trên ghi thành BR-50 đến BR-59. BR-12, BR-14, BR-70 sửa theo; gói ngành có bản nháp và xuất bản.
  - [T-05](../ky-thuat/quyet-dinh-ky-thuat.md#t-05-packagesscheduling-core-thuật-toán-thuần) đổi sang phút từ mốc Unix (UTC).
- **Vướng:** dữ liệu mẫu Tóc Mây cho Hùng làm nhuộm, Lan thì không. Thiết kế giữ cả ba thợ làm được nhuộm (thêm kỹ năng cho Lan) để "Bất kỳ ai" có giá 500.000 ₫.
- **Tiếp theo:**
  - Claude Code làm [Bước 10](../ky-thuat/ke-hoach-ui-mock.md#bước-10-cấu-hình-dịch-vụ-mh-44-mh-45-gói-cấu-hình-ngành-mh-59-và-thanh-cuộn).
  - Phiên claude.ai làm ERD (giai đoạn 1).

### 07/11/2026 (đêm khuya): mock Bước 8, khung ứng dụng, danh sách và form
- **Đã làm:** Bước 8 (8a–8f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-8-route-tiếng-anh-khung-ứng-dụng-mẫu-danh-sách-và-form), mỗi mục một commit trên nhánh `feat/mock-app-shell`.
  - Route theo [T-15](../ky-thuat/quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url): `/mock/[tenant]/book`, `/mock/app/[tenant]/…`; URL cũ chuyển hướng 308; trạng thái xem nằm trong query.
  - `AppShell` (MH-07): thanh bên 240px, dải icon 68px, thanh tab dưới 768px; menu đổi chi nhánh và cơ sở dùng bàn phím; thêm vai trò kỹ thuật viên và quản lý.
  - Mẫu danh sách (MH-08) với Khách hàng (MH-32, 130 và 60 khách có sáu tháng lịch sử sinh bằng seed) và Nhân sự (MH-47); mẫu form (MH-09) với Hồ sơ nhân viên (MH-48).
  - `IndustryTemplate`: từ ngữ và schema đối tượng được phục vụ của ngành nằm trong dữ liệu; luật chọn biến thể theo khoảng số (10 kg) nằm trong dịch vụ (BR-13, BR-71).
  - `/mock` liệt kê đủ 60 màn theo khu A–H, lọc theo đợt và trạng thái; màn chưa làm mở trang "Chưa làm" thay vì 404.
- **Kiểm:** Playwright trên các route mới ở 390, 1024 và 1440px (không cuộn ngang, bàn phím, lưu trong URL, rời trang khi còn thay đổi); axe-core với luật mặc định: 86 lượt (trang, menu mở, bảng trượt lên) ở 390 và 1440px, hai theme, 0 lỗi serious hoặc critical; `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- **Vướng:**
  - Luật `label-content-name-mismatch` của axe bắt khối lịch hẹn, ô chọn ngày và ô đổi cơ sở: chữ nhìn thấy phải nằm trong tên truy cập, kể cả đoạn chờ và khoảng trắng giữa các dòng. Đã sửa `AppointmentBlock`, `DateStrip` và `AppShell`.
  - Trên Windows, `git mv` thư mục `[tenant]` báo `Permission denied` khi dev server đang chạy; chép rồi xóa thay cho đổi tên.
  - `next.config.mjs` (chuyển hướng) chỉ có hiệu lực sau khi khởi động lại dev server.
  - Sapio cần bổ sung: `.sp-shell__side` không dính trên trang dài (mock thêm `sticky top-0 h-screen`); `.sp-shell__content--fill` giữ chiều cao 100vh cả trên điện thoại (mock chỉ dùng từ 768px); thanh bên không nói tên cơ sở và chi nhánh nằm ở đâu khi dưới 768px (mock đặt ô đổi cơ sở ở đầu trang như `QuanTriDienThoai`).
- **Tiếp theo:** review PR; chốt hai màn MH-07, MH-08, MH-09 với cô; phiên claude.ai vẽ MH-02 Đăng ký cơ sở có chọn ngành.

### 08/11/2026 (tối): mock Bước 9, đăng ký cơ sở, dùng thử và gói Sapio
- **Đã làm:** Bước 9 (9a–9f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-9-đăng-ký-cơ-sở-dùng-thử-và-gói-sapio) trên nhánh `feat/mock-signup-plan`.
  - Component mới: `SignupLayout`, `ChoiceCards`, `QuantityInput`, `OtpField` (`InputOTP` của shadcn/ui, thư viện `input-otp@1.5.0`), `Banner`, `Checklist`, `PlanCards`, `LockIcon`; ô mã ở trang đặt lịch dùng `OtpField`.
  - MH-02 `/mock/signup?step=…`: 5 bước, mật khẩu theo BR-73 (331 mật khẩu phổ biến), mã `000000` cho trạng thái lỗi, địa chỉ `*.sapio.vn` theo BR-72, bảng xem trước đọc từ `IndustryTemplate`.
  - `mock/subscription.ts`: `plans`, `entitlements`, `can`, `canBook`, `periodPrice`, `upgradeCharge` (hàm thuần, để chép sang `datn-saas`). `?plan=trial|basic|pro|expired` giữ khi chuyển trang; dải báo, ổ khóa, màn dùng thử, màn hết hạn, trang tính năng bị khóa.
  - MH-61 `settings/plan`: chọn kỳ, hộp thanh toán QR giả lập, nâng và hạ gói (BR-85). Thêm MH-61, MH-62 vào danh sách màn.
- **Kiểm:** Playwright qua 5 bước ở 1280 và 390px (không cuộn ngang) và các kịch bản gói; axe-core 56 lượt (14 trang, hai theme, hai bề rộng), 0 lỗi serious hoặc critical.
- **Vướng:**
  - Phần gói dùng chung đồng hồ `MOCK_NOW` (07/11). Mốc mẫu: `?plan=trial` là cơ sở tạo ngày 07/11, dùng thử hết 23:59 ngày 13/11 (còn 7 ngày); `DEFAULT_PERIOD_END` là 28/11 (còn 22 ngày, nâng gói trả 147.000 ₫); `?plan=expired` hết hạn ngày 06/11.
  - Dữ liệu lịch hẹn chỉ tới 22/11, nên mốc hết hạn 30/11 sẽ làm bảng "lịch đã đặt sau hạn" trống; hết hạn ngày 06/11 thì bảng có dòng.
  - Sapio không có kiểu cho `role="radio"` trong `.sp-segmented` (chỉ `aria-pressed`, `aria-selected`, `aria-current`); chọn kỳ dùng nhóm nút bấm.
- **Tiếp theo:** review PR; báo cô phần dùng thử và gói Sapio (D-15); phiên claude.ai vẽ MH-45 và MH-59.

### 08/11/2026: chốt đăng ký cơ sở, tên miền con, dùng thử và gói Sapio
- **Đã làm:**
  - Review PR #3 (Bước 8). Người dùng đã merge sau khi Claude Code sửa 3 điểm: chữ cái của cơ sở, tìm theo đầu từ, bỏ `?tenant=` khi chuyển hướng.
  - Tiêu đề cột bảng viết hoa theo ý người dùng, đã đưa vào Sapio.
  - Vẽ và chốt MH-02 Đăng ký cơ sở (6 màn) và phần dùng thử, gói Sapio (4 màn) trên canvas.
- **Chốt:**
  - Trang khách trên tên miền con `toc-may.sapio.vn` ([T-16](../ky-thuat/quyet-dinh-ky-thuat.md#t-16-trang-khách-của-mỗi-cơ-sở-trên-tên-miền-con)). Mock giữ đường dẫn; tên miền riêng của tiệm để làm sau. BR-72 thêm luật DNS.
  - Mật khẩu theo NIST SP 800-63B-4 (BR-73).
  - Bỏ duyệt tay. Thay bằng **dùng thử 7 ngày** (chỉ cấu hình, không nhận lịch), rồi kích hoạt **gói Cơ bản 199.000 ₫ hoặc Chuyên nghiệp 399.000 ₫ mỗi tháng**: 3 tháng giảm 10%, 12 tháng giảm 20%. Nâng gói trả phần chênh theo ngày; hết hạn chỉ còn trang gói ([D-15](./quyet-dinh.md#d-15-dùng-thử-7-ngày-và-hai-gói-sapio-thay-cho-duyệt-tay), [T-17](../ky-thuat/quyet-dinh-ky-thuat.md#t-17-gói-sapio-gói-và-tính-năng-là-dữ-liệu-kiểm-qua-một-hàm), BR-74, BR-75, BR-80 đến BR-88).
  - Ô mã xác nhận 6 ô vuông (`OtpField`, dùng `InputOTP` của shadcn/ui với thư viện `input-otp`, đã báo người dùng).
  - Thêm MH-61 Gói Sapio, MH-62 Gói và giá: tổng cộng 62 màn.
  - Sapio thêm Banner, Checklist, OtpField, ChoiceCard, Plan, SignupFlow.
- **Cần báo cô:** phần dùng thử và gói Sapio giả lập là thêm so với đề cương (D-15).
- **Tiếp theo:**
  - Claude Code làm [Bước 9](../ky-thuat/ke-hoach-ui-mock.md#bước-9-đăng-ký-cơ-sở-dùng-thử-và-gói-sapio).
  - Phiên claude.ai vẽ MH-45 Chi tiết dịch vụ (các đoạn chiếm dụng) và MH-59 Gói cấu hình ngành.

### 07/11/2026 (đêm): chốt khung ứng dụng, mẫu danh sách và mẫu form
- **Đã làm:**
  - Review lại PR #2 (Bước 7): đạt. Người dùng đã merge.
  - Sửa hover của nút chính trong Sapio: đậm hơn thay vì mờ đi, tương phản từ 6,3:1 trở lên.
  - Viết [Danh sách màn hình](../thiet-ke/man-hinh.md): 60 màn, chia 3 đợt. Chốt route [T-15](../ky-thuat/quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url) và quy tắc slug BR-72.
  - Thiết kế và chốt khung ứng dụng (MH-07), mẫu danh sách (MH-08), mẫu form (MH-09) trên canvas, 5 màn `QuanTri*`.
- **Theo góp ý của người dùng:**
  - Thanh bên thu gọn được. Ô đổi cơ sở trông như ô chọn.
  - Phân trang có số trang. Chân bảng kiểu Ant Design: "Hiển thị 1–20 trong 1.284 khách" bên trái; số trang rồi ô "20 / trang" bên phải.
  - Bảng cuộn trong khung, dòng tiêu đề cột và chân bảng đứng yên.
  - Trên điện thoại không cuộn ngang: bộ lọc nằm trong bảng trượt lên.
  - Thêm vào Sapio: AppShell, DataTable, FormSection, menu, tooltip, bảng trượt lên, ô chọn nhỏ.
- **Cách làm từ nay:** phiên claude.ai chỉ sửa trên canvas cho đến khi người dùng nói chốt, rồi mới cập nhật hệ thống thiết kế, chép vào repo, commit và push.
- **Tiếp theo:**
  - Claude Code làm [Bước 8](../ky-thuat/ke-hoach-ui-mock.md#bước-8-route-tiếng-anh-khung-ứng-dụng-mẫu-danh-sách-và-form).
  - Phiên claude.ai vẽ MH-02 Đăng ký cơ sở có chọn ngành.

### 07/11/2026 (khuya): sửa mock theo review PR #2
- **Đã làm:** Bước 7 (7a–7f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-7-sửa-theo-review-pr-2), mỗi mục một commit trên PR #2. ConfirmDialog, Toast (có Hoàn tác), Segmented; giờ trống theo buổi; cột trái sticky có danh sách thợ ở máy tính; OTP qua email (BR-16); "Thêm bé" và `?khach=moi` (BR-17); thu tiền, không đến, hủy lịch qua hộp hỏi, check-in có Hoàn tác (D-14); dữ liệu 02/11–08/11 cho hai cơ sở sinh bằng seed (`mock/fixtures/generate.ts`); nút sáng/tối, vai trò theo route, thanh chọn gọn trên điện thoại. Kiểm bằng Playwright và axe-core: 28 trang và bước, hai theme, 0 lỗi serious/critical; `pnpm build` xanh.
- **Vướng:** `.sp-btn--accent:hover { opacity: 0.9 }` trong Sapio hạ tương phản nút cam của Pawpaw xuống 3,94:1 khi rê chuột; cần sửa trong Design System (bản chép `app/sapio/` không sửa tại chỗ).
- **Tiếp theo:** review lại PR #2; sửa hover của nút nhấn trong Sapio; chốt hai màn hình với cô.

### 07/11/2026 (tối, sau đó): review PR #2 của mock
- **Đã làm:** review [PR #2 của datn-docs](https://github.com/ngchinhdev/datn-docs/pull/2): đọc code và xem bản deploy trên trình duyệt ở 390px, 1024px, 1280px, 1440px, hai theme, đi hết luồng của cả hai cơ sở. Bản này sát canvas, code sạch (không màu viết cứng, không `Date.now()`). Cần sửa: OTP ghi "tin nhắn" trái với roadmap; Pawpaw thiếu "Thêm bé" nên khách mới bị kẹt; trang khách trên máy tính không có danh sách thợ ở cột trái và nút Tiếp tục bị đẩy khỏi màn hình; thu tiền chạy ngay không hỏi; bộ chọn vai trò không theo trang; `<div>` trong `<button>`, lưới ARIA thiếu dòng. Người dùng góp thêm: hộp xác nhận cho thao tác quan trọng, dữ liệu đa dạng hơn một ngày, nút sáng/tối.
- **Chốt:** OTP gửi qua email, khách vẫn nhập số điện thoại ([D-13](./quyet-dinh.md#d-13-otp-của-khách-gửi-qua-email-không-qua-sms), BR-16, BR-17); ba mức xác nhận và giờ trống hiện theo buổi ([D-14](./quyet-dinh.md#d-14-mẫu-xác-nhận-thao-tác-và-cách-hiện-giờ-trống)). Sapio Design System thêm ConfirmDialog, Toast, Segmented và token `fill-selected`; bản sao trong `design/sapio/` và `app/sapio/` đã cập nhật.
- **Ghi chú cho ERD:** ghép đối tượng được phục vụ của khách mới với hồ sơ cũ sau khi xác thực OTP (trùng email, trùng tên bé) chưa có quy tắc; quyết định khi thiết kế bảng `served_subjects`.
- **Tiếp theo:** Claude Code làm [Bước 7 của kế hoạch](../ky-thuat/ke-hoach-ui-mock.md#bước-7-sửa-theo-review-pr-2) trên cùng nhánh; review lại rồi mới merge.

### 07/11/2026 (tối): code giao diện mock
- **Đã làm:** 6 bước của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md) trên nhánh `feat/ui-mock`. Token Sapio và font Be Vietnam Pro cho cả `/docs` lẫn `/mock`; fixtures ngày 07/11 có đoạn chiếm dụng, `StaffProfile` hai lớp, `ServedSubject.kind` là `'self' | 'other'`; 11 component trong `components/sapio/` (ví dụ ở `/mock/components`); `/mock/dat-lich` cho hai cơ sở; `/mock/le-tan`, `/mock/le-tan/tai-nguyen`, `/mock/hom-nay`. Kiểm bằng Playwright headless: đi hết luồng khách chỉ bằng bàn phím ở 390px và 1280px; lịch lễ tân ở 1440px, 1024px, 390px không lỗi, không cuộn ngang.
- **Vướng:** `pnpm dev` (Turbopack) giữ bản cũ của module phía server khi file đổi export, gây lỗi `is not a function` và lỗi hydration; khởi động lại dev server là hết. Class trong `components.css` không nằm trong `@layer`, nên muốn utility Tailwind đè lên `.sp-btn` phải thêm `!`.
- **Tiếp theo:** review pull request; chốt hai màn hình với cô; ERD giai đoạn 1.

### 07/11/2026 (chiều): bàn giao giao diện cho Claude Code
- **Đã làm:** chốt UI hai màn hình đầu (D-12; BR-14, BR-15). Chép Design System và các màn hình đã vẽ vào `design/` để Claude Code đọc offline. Viết [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md) 6 bước.
- **Cách làm từ đây:** phiên claude.ai lo phân tích, thiết kế, review; Claude Code trên máy code theo kế hoạch trên nhánh `feat/ui-mock`, mở pull request để review.
- **Tiếp theo:** Claude Code làm kế hoạch UI mock; giai đoạn 0 còn: dùng thử SimplyBook.me và một phần mềm Việt Nam, sửa đề cương nếu cô góp ý.

### 07/11/2026 (trưa): tên sản phẩm và hệ thống thiết kế
- **Đã làm:** chốt tên **Sapio** và hướng thiết kế "ấm và chính xác" ([D-11](./quyet-dinh.md#d-11-tên-sản-phẩm-sapio-và-hệ-thống-thiết-kế)). Dựng "Sapio Design System" trên Claude Design: tokens sáng/tối (đã kiểm tương phản), font Be Vietnam Pro, màu trạng thái, màu hai cơ sở, 8 component có preview. Docs chạy cổng 3100 để không trùng web 3000. Phiên claude.ai đã liên kết với máy (thư mục `D:\UITProgress\DoAn\source`).
- **Sau đó:** làm mềm Design System (bỏ viền đậm, nền `fill-tonal`, bóng mềm, góc tròn hơn), đổi màu Pawpaw sang cam quýt. Vẽ canvas "Sapio · Màn hình đầu tiên": 3 hướng trang khách, 2 hướng lịch lễ tân, cùng bản máy tính, iPad, điện thoại; chốt hướng ([D-12](./quyet-dinh.md#d-12-hướng-giao-diện-hai-màn-hình-đầu)).
- **Tiếp theo:** đưa token Sapio vào `datn-docs` và `apps/web` (thay theme shadcn mặc định); code luồng đặt lịch của khách (A) và lịch lễ tân (A) vào `/mock` theo canvas; tách màn "Trang đặt lịch của khách" thành "Trang cơ sở" và "Luồng đặt lịch".

### 07/11/2026: review Phần B
- **Đã làm:** review app docs + mock. CI (thêm qua [PR #1 của datn-docs](https://github.com/ngchinhdev/datn-docs/pull/1)) xanh: Prettier, typecheck, build 16 trang (`/docs` tĩnh, `/mock` động, `/api/search`), lockfile 584 gói qua kiểm tra chuỗi cung ứng của pnpm. Không gói nào nằm trong danh sách bị chiếm quyền (Shai-Hulud, `keyv`/`cacheable`, `chalk`/`debug`, các gói độc tháng 10–11/2026). `pnpm audit`: 0 high/critical; 1 moderate (`minimatch`) + 1 low (`deepmerge`), cùng hai lỗ hổng đã biết từ `datn-saas`, đến từ CLI `shadcn`, không chạy khi xem trang.
- **Ghi chú cho ERD (giai đoạn 1):** `ServedSubject.kind` trong fixtures là `'self' | 'pet'`, tức là từ khóa ngành nằm trong kiểu dữ liệu. Khi thiết kế bảng thật, loại đối tượng được phục vụ nên do `industryTemplate` khai báo (dữ liệu), lõi chỉ phân biệt "chính khách hàng" hay "đối tượng khác" (quy tắc 5).
- **B3 xong:** deploy lên Vercel tại https://datn-docs.vercel.app (Hobby, biến môi trường `ENABLE_EXPERIMENTAL_COREPACK=1` để Vercel dùng pnpm 11 theo `packageManager`, Node 24). `/`, `/docs` (đủ 11 trang) và `/mock` mở được. PR #1 (CI) đã merge. Phần B của kế hoạch dựng base hoàn tất.
- **Tiếp theo:** giai đoạn 0 còn lại: dùng thử SimplyBook.me và một phần mềm Việt Nam, sửa đề cương nếu cô góp ý. Sau đó giai đoạn 1: ERD và hai màn hình mock đầu tiên (trang đặt lịch của khách, lịch lễ tân).

### 05/11/2026 (tối): app docs + mock `datn-docs`
- **Đã làm:** Phần B, bước B1 và B2 của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md). B1: Next.js 16.4.5 + Fumadocs 16.17 (cài thủ công, API `fumadocs-mdx/macro`), tài liệu ở `/docs`, tìm kiếm tiếng Việt chạy được, đọc thẳng file `.md`; pnpm 11.28.11 với `minimumReleaseAge` và `allowBuilds` giống `datn-saas` (`esbuild: false`). Link tải đề cương `.docx` ở trang Đề cương. B2: shadcn `base-nova` cùng `components.json` với `apps/web`, Fumadocs dùng preset `shadcn.css` nên tài liệu và mock chung một theme; `/mock` có bộ chọn tenant và vai trò trên query string (`/mock?tenant=pawpaw&role=receptionist`), danh sách 4 màn hình của roadmap, fixtures cho Salon Tóc Mây và Spa thú cưng Pawpaw.
- **Phát hiện:** Fumadocs chỉ đổi link sang URL khi link trỏ tới file có đuôi `.md`; link không đuôi làm gãy các link ở trang `/docs`. Đã đổi mọi link tương đối sang dạng `./trang.md` và ghi quy ước vào `CLAUDE.md`. Mục lục roadmap có một anchor sai (`#7-quy-tắc-nghiệp-vụ-ban-đầu`), đã sửa. `minimumReleaseAge` chặn bản Fumadocs vừa ra trong ngày, pnpm tự chọn bản trước đó.
- **Ghi chú cho sau:** fixtures dùng ID dễ đọc (`may-mai`) thay cho UUIDv7 để dễ đối chiếu. Trạng thái lịch hẹn trong fixtures (`confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`) là giả định, cần chốt khi thiết kế ERD. `assets/de-cuong-chi-tiet.docx` và `public/files/` là hai bản, sửa đề cương thì cập nhật cả hai.
- **Tiếp theo:** B3 (kết nối Vercel, kiểm `/docs` và `/mock` trên link deploy); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 05/11/2026: review base `datn-saas`
- **Đã làm:** review toàn bộ base. CI trên GitHub của `main` xanh (03/11), nên A7 xong. Mở [PR #1](https://github.com/ngchinhdev/datn-saas/pull/1), CI xanh đủ các bước: bật `erasableSyntaxOnly` cho `shared` và `scheduling-core`; thêm `createPool()` có `pool.on('error')` để API không chết khi Postgres khởi động lại (có unit test); `CLAUDE.md` nhắc đọc `apps/web/AGENTS.md` và commit nhỏ.
- **Ghi chú cho sau:** (1) khi thiết kế thuật toán giờ trống (BT1), chốt lõi tính trên mốc thời gian tuyệt đối, chỉ đổi sang giờ địa phương ở rìa (hiện `Interval` là phút từ đầu ngày địa phương); (2) khi làm xác thực, kiểm tra chống CSRF của Nest với request POST từ server Next (không có header `Origin`); (3) oxlint còn nhiều cảnh báo nhiễu `react-in-jsx-scope`, có thể tắt rule này.
- **Bổ sung:** PR #1 gộp còn một commit, thêm sửa lint (tắt `react-in-jsx-scope`, cho phép import CSS). CI xanh, 0 cảnh báo.
- **Kiểm tra bảo mật dependency (828 gói trong lockfile):** không gói nào nằm trong danh sách bị chiếm quyền của các đợt Shai-Hulud (gồm đợt `keyv`/`cacheable` tháng 8/2026, 446 gói) hay đợt `chalk`/`debug` 9/2025. `pnpm audit`: 0 high/critical; 3 moderate + 1 low (`glob`, `minimatch`, `deepmerge`), đều nằm trong công cụ dev (Testcontainers, Nest CLI, shadcn CLI), không chạy ở production, chờ bản vá upstream. Gói có script cài đặt: `@scarf/scarf` (thống kê lượt cài của swagger-ui), `ssh2`, `cpu-features`, `protobufjs` (đều qua Testcontainers); đều là gói thật.
- **pnpm 11:** [PR #2](https://github.com/ngchinhdev/datn-saas/pull/2) nâng pnpm 9.15 lên 11.28.11, đặt `minimumReleaseAge` và `allowBuilds` ([T-02](../ky-thuat/quyet-dinh-ky-thuat.md#t-02-monorepo-pnpm-workspaces--catalog-turborepo)). CI xanh, lockfile cũ dùng được nguyên, qua kiểm tra chuỗi cung ứng của pnpm.
- **Tiếp theo:** merge PR #1 và PR #2; trên máy chạy `pnpm install` (Corepack tự tải pnpm 11); xóa nhánh `claude/audit-tmp` trên GitHub; Phần B (app docs + mock); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 03/11/2026 (tối): dựng base `datn-saas`
- **Đã làm:** Phần A của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md), bước A1 đến A6 và A8: monorepo pnpm + Turborepo; Docker Compose (Postgres 18, Redis 8, Mailpit); `shared` (BR-61 `normalizePhone`); `scheduling-core` (phép toán khoảng, property test, coverage 100%); API NestJS 12 (config Zod, Drizzle 1.0.0-rc.5, `withTenant`, migration `btree_gist` và grant, Problem Details, Swagger, `/v1/health`); web Next.js 16.4 (shadcn, TanStack Query, trang `/` hiển thị health); script chặn từ khóa ngành; workflow CI. Mọi bước CI chạy xanh trên máy.
- **Phát hiện:** spike RLS cho thấy policy phải dùng `nullif(current_setting(...), '')` ([T-07](../ky-thuat/quyet-dinh-ky-thuat.md#t-07-cô-lập-dữ-liệu-rls-hai-lớp)); 20 transaction đồng thời chỉ 1 giữ được chỗ (bằng chứng sớm cho BT2). Chốt Node 24 thay cho 26 ([T-01](../ky-thuat/quyet-dinh-ky-thuat.md#t-01-runtime-nodejs-24-lts)), TypeScript 6.0, pnpm 9.15.
- **Vướng:** máy dev có sẵn PostgreSQL Windows chiếm cổng 5432; compose cho đổi cổng bằng `POSTGRES_PORT`.
- **Tiếp theo:** đẩy `datn-saas` lên GitHub và kiểm tra CI xanh (A7); Phần B (app docs + mock).

### 03/11/2026
- **Đã làm:** gửi đề cương cho cô Thùy Trâm. Tạo 2 repo `ngchinhdev/datn-docs` và `ngchinhdev/datn-saas`. Đưa đề cương, roadmap, nhật ký quyết định, quy tắc nghiệp vụ, thuật ngữ vào `datn-docs`. Nghiên cứu phiên bản và pattern hiện hành của Next.js, NestJS, Drizzle, Node.js; viết [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md), [Chiến lược kiểm thử](../ky-thuat/chien-luoc-kiem-thu.md), [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md).
- **Phát hiện:** payOS không có môi trường test → đổi sang provider giả lập ([D-09](./quyet-dinh.md#d-09-thanh-toán-payos-không-có-môi-trường-test)).
- **Tiếp theo:** dựng base source trên máy bằng Claude Code theo kế hoạch; song song dùng thử SimplyBook.me và một phần mềm Việt Nam (giai đoạn 0).

## Trước khi bắt đầu (26/10 – 02/11/2026)

- Khảo sát nhiều hướng đề tài (giáo dục, thuế, nhà trọ, HSK, hệ thống thi...), chốt đề tài đặt lịch đa tài nguyên ([D-01](./quyet-dinh.md#d-01-đề-tài-nền-tảng-đặt-lịch-đa-tài-nguyên-cho-cơ-sở-dịch-vụ-theo-lịch-hẹn)).
- Cắt phạm vi, viết roadmap 34 tuần, đề cương theo mẫu UIT.
