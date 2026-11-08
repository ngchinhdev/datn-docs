Sapio là nền tảng đặt lịch đa tài nguyên cho cơ sở dịch vụ theo lịch hẹn: salon tóc, nail, spa, spa thú cưng. Tên lấy từ chữ **sắp** (sắp lịch, sắp xếp) và chữ Latin *sapio* (khôn ngoan): xếp người, ghế, phòng và giờ một cách thông minh. Giao diện theo hướng **ấm và chính xác**: khung đơn sắc, chữ rõ, số thẳng cột; màu chỉ xuất hiện khi nó mang nghĩa (trạng thái lịch hẹn, màu của từng cơ sở). Chất liệu mềm: tách lớp bằng nền tông nhạt và bóng nhẹ, ít viền, góc tròn.

Sapio có hai mật độ, dùng chung một bộ token:

- **Khu quản trị** (lễ tân, chủ cơ sở): máy tính và tablet, dùng cả ngày. Dày, gọn (`radius-sm`, `radius-md`), nút chính màu `primary` (ngọc bích Sapio).
- **Trang khách** (trang cơ sở, luồng đặt lịch): điện thoại trước. Thoáng, góc tròn (`radius-lg`, `radius-pill`), màu nhấn là màu của cơ sở (`--accent`), không phải màu Sapio.

## Giọng văn

- Viết tiếng Việt có dấu, câu ngắn, chủ động. Viết hoa chữ đầu câu, không VIẾT HOA TOÀN BỘ nhãn.
- Với khách: xưng "bạn", nói điều sắp xảy ra. Ví dụ: "Đặt lịch", "Giữ chỗ cho bạn trong 10 phút", "Hết giờ trống ngày này. Xem ngày khác?".
- Trong quản trị: bỏ chủ ngữ, động từ đứng đầu. Ví dụ: "Check-in", "Đổi giờ", "Thu tiền", "Đánh dấu không đến".
- Lỗi nói rõ sai gì và sửa thế nào, không xin lỗi chung chung: "Số điện thoại chưa đúng. Ví dụ: 0912 345 678."
- Không emoji, không dấu chấm than, không từ cường điệu ("tuyệt vời", "cách mạng").
- Tên trạng thái cố định: **Đã xác nhận**, **Đã check-in**, **Hoàn thành**, **Không đến**, **Đã hủy**, **Đang giữ chỗ**.
- Tiền: số nguyên VND, định dạng `vi-VN`: "500.000 ₫". Giờ 24 giờ: "09:30". Ngày: "Thứ Bảy, 07/11". Thời lượng: "105 phút".

## Màu

- Nền trang `surface`; thẻ, bảng, cột lịch `surface-raised`; vùng ngoài giờ mở cửa và ô bị khóa `surface-sunken`.
- Nút phụ, ô giờ, lựa chọn biến thể, hộp thông báo trống: nền `fill-tonal`, không viền; rê chuột `surface-hover`. Mục đang chọn trong `Segmented`: `fill-selected`. `fill-tonal` sáng hơn nền trang trong theme tối, nên không dùng `surface-sunken` thay cho nó.
- Chữ chính `ink`, chữ phụ `ink-muted`. Cả hai đọc được trên ba nền trên và trên mọi nền `*-soft`.
- Đường kẻ mảnh và viền thẻ `line`. Chỉ ô nhập và checkbox có viền `line-strong` (đạt 3:1, để người nhìn kém vẫn thấy ô).
- Nút chính trong quản trị: nền `primary` (ngọc bích, cùng màu `brand`), chữ `on-primary`. Mỗi màn hình tối đa một nút chính. Màu mực `ink` chỉ dành cho chữ: không component nào có nền đen hay nền `ink` (nút, ô giờ đang chọn, chip, khối trang trí).
- `brand` (ngọc bích) là màu của Sapio: link, mục đang chọn (nền `brand-soft`), vạch giờ hiện tại, viền giữ chỗ. Không dùng `brand` làm nền nút trên trang khách.
- Trạng thái lịch hẹn: `status-confirmed`, `status-checked-in`, `status-completed`, `status-no-show`, mỗi màu có bản `*-soft` làm nền khối. Đã hủy dùng `ink-muted` trên `surface-sunken` và gạch ngang. Giữ chỗ dùng viền đứt `brand`, không nền.
- Màu trạng thái gần nhau về độ sáng, nên **luôn kèm chữ** (badge, dòng meta) hoặc kiểu viền; không để màu một mình mang nghĩa.
- Lỗi và thao tác hủy: `danger`, nền thông báo `danger-soft`.

### Màu của từng cơ sở

Trang khách đặt một lớp phạm vi lên phần tử gốc: `.sp-tenant-may` hoặc `.sp-tenant-pawpaw`. Lớp này gán `--accent`, `--accent-soft`, `--on-accent` từ `tenant-may*` hoặc `tenant-pawpaw*`. Component trang khách chỉ đọc `--accent*`, không đọc thẳng màu của một cơ sở. Cơ sở mới thêm ba token cùng dạng (`tenant-<slug>`, `tenant-<slug>-soft`, `on-tenant-<slug>`), mỗi cặp chữ trên nền đạt 4.5:1 ở cả hai theme.

## Chữ

- Một họ chữ: **Be Vietnam Pro** (Google Fonts, 400/500/600/700), dự phòng Segoe UI, system-ui. Dấu tiếng Việt đều và rõ ở mọi cỡ.
- Thang chữ: `display` (tên cơ sở, một lần mỗi trang), `title`, `heading`, `body`, `body-sm`, `label`; riêng lịch: `time`, `appt-title`, `appt-meta`.
- Mọi con số đứng thành cột (giờ, giá, thời lượng, đồng hồ giữ chỗ) bật `font-variant-numeric: tabular-nums` (lớp `.sp-num`).
- Ô nhập trên điện thoại dùng cỡ 16px để trình duyệt không tự phóng to.

## Khoảng cách, góc, viền, bóng

- Bước khoảng cách 4px: `space-1` … `space-12`. Lề hai bên tối thiểu `space-4` trên điện thoại.
- Góc: `radius-xs` khối lịch hẹn, `radius-sm` nút quản trị, `radius-md` thẻ, popover, khung lịch, ô nhập, lựa chọn biến thể, `radius-lg` thẻ và khung trang khách, `radius-pill` nút chính, ô giờ trang khách và badge.
- Tách lớp bằng nền và bóng mềm, không bằng viền đậm: thẻ và khung lịch dùng viền `line` 1px cộng `shadow-card`; nút chính và ô nhập `shadow-xs`; popover, menu, hộp thoại, toast `shadow-popover`; khối đang kéo `shadow-drag`. Không đổ bóng cho mọi phần tử.
- Chuyển động: 120ms `ease` cho rê chuột và nhấn (nút lún 1px khi nhấn); tắt hết khi `prefers-reduced-motion`.
- Focus: vòng liền 2px `focus-ring`, cách phần tử 2px (`outline-offset: 2px`). Không bỏ focus.

## Lịch tài nguyên

Lịch là màn hình đặc trưng của Sapio; giữ đúng các quy tắc sau.

- Hai kiểu xem, không trộn: **Nhân viên** (mặc định, mỗi cột một người; tài nguyên khác ghi trong dòng meta của khối, ví dụ "Ghế 1") và **Tài nguyên** (mỗi cột một ghế, phòng, bồn tắm, lồng sấy; khối ghi tên nhân viên). Một lịch hẹn chỉ hiện một lần trên màn hình đang xem.
- Mỗi cột là một nhân viên hoặc một tài nguyên, tùy kiểu xem. Một ô 15 phút cao `slot-height` (16px, một giờ 64px). Thước giờ rộng `ruler-width`. Cột không hẹp hơn `column-min-width`; thiếu chỗ thì lịch cuộn ngang bên trong, trang không cuộn ngang.
- Khối lịch hẹn không viền: nền `*-soft`, một chấm màu trạng thái trước tên khách, giữa các khối có khe 1.5px màu `surface-raised`; rê chuột hiện `shadow-card`. Khối chia theo **đoạn chiếm dụng**. **Đoạn chờ** (thợ rảnh, tài nguyên khác vẫn bận) vẽ vạch chéo mảnh `*-soft` trên nền `surface-raised`, bước `hatch-step`. Đây là chi tiết nhận diện của Sapio, đừng thay bằng màu nhạt hơn.
- Trên cột của **nhân viên**, đoạn chờ là khe trống: lịch hẹn khác được đặt vào khe đó, vẽ thụt vào (`.sp-appt--inset`). Trên cột của **ghế/phòng/lồng sấy**, cùng lịch hẹn hiện liền một khối vì tài nguyên bận suốt.
- Khối giữ chỗ (khách đang đặt, chưa xác nhận) viền đứt `brand`, không nền, kèm đồng hồ đếm ngược.
- Vạch giờ hiện tại 1.5px `brand`. Ngoài giờ mở cửa phủ `surface-sunken`.

## Trang khách

- Một cột, rộng tối đa khoảng 560px, nút chính dưới cùng rộng hết cột (`.sp-btn--lg.sp-btn--block.sp-btn--accent`).
- Mỗi bước một quyết định: dịch vụ → (đối tượng được phục vụ) → ngày giờ → thông tin liên hệ → xác nhận.
- Ô giờ (`.sp-slot`) dạng viên thuốc, giờ trống mới hiện; không có giờ trống thì hiện `.sp-empty` kèm gợi ý ngày gần nhất còn trống.
- Khi đã giữ chỗ, banner `.sp-hold` hiện thời gian còn lại ở đầu các bước sau.
- Giờ trống chia ba buổi bằng `Segmented`, mỗi lần hiện một buổi, mặc định buổi sớm nhất còn giờ (xem `SlotPicker`).
- Từ 900px: hai cột. Cột trái (tóm tắt, danh sách thợ dạng dọc, giờ đã chọn và nút chính) đứng yên khi cuộn (`position: sticky`), nút chính luôn nhìn thấy. Dưới 900px: thanh tóm tắt và nút chính cố định ở đáy.
- Bước Xác nhận là màn kiểm lại: nút cuối "Xác nhận đặt lịch", không thêm hộp hỏi. Màn "Đã đặt lịch" không còn nút quay lại hay số bước, và có việc làm tiếp: thêm vào lịch điện thoại, xem hoặc đổi lịch, về trang cơ sở.
- Chữ gợi ý trong ô nhập viết dạng "Ví dụ: …" để không trông như đã điền.

## Khu quản trị

- Mọi trang trong `/app/[tenant]` nằm trong `AppShell`: thanh bên 240px (1200px trở lên), dải icon 68px (768–1199px), thanh điều hướng dưới (dưới 768px). Mục đang mở nền `brand-soft`, chữ `brand`. Thanh bên chỉ hiện mục vai trò đó có quyền.
- Hai mẫu trang dùng cho phần lớn màn cấu hình: **danh sách** (`DataTable`: tiêu đề, tìm kiếm, bộ lọc nhanh, bảng, phân trang; điện thoại đổi thành thẻ) và **form** (`FormSection`: nhóm trường có giải thích, thanh "Còn thay đổi chưa lưu"). Màn mới dựng từ hai mẫu này trước; chỉ vẽ riêng khi có tương tác đặc thù.
- Ô nhập trong quản trị cao 40px, chữ 14px (`.sp-field--sm`); trang khách giữ 48px, 16px.
- Bộ lọc đang bật, công tắc đang bật: `brand-soft` + `brand`. Hộp kiểm đã chọn: nền `primary`. Không có nền đen cho bất kỳ trạng thái nào.
- Bảng: cột số căn phải; một nút ghost mỗi hàng; thao tác khác nằm trong trang chi tiết.
- **Không cuộn ngang trên điện thoại** (dưới 768px), trừ lưới lịch. Hàng nút, bộ lọc, menu con quá dài thì gom vào bảng trượt lên (`.sp-sheet`), xuống dòng, hoặc thành trang danh sách riêng.
- Trạng thái tài khoản (dùng thử, sắp hết hạn) hiện bằng `Banner` trên cùng vùng nội dung. Tính năng ngoài gói hiện ổ khóa `.sp-lock` và trang giải thích kèm nút nâng cấp (`Plan`), không ẩn hẳn.
- **Trang chi tiết** (dịch vụ, gói cấu hình ngành) theo `DetailPage`: form bên trái, cột xem trước dính bên phải. Các đoạn của dịch vụ vẽ bằng `SegmentTimeline`.
- **Thanh cuộn:** mảnh, bo tròn, màu `ink-muted` pha trong suốt, đậm hơn khi rê chuột vào vùng cuộn. Đặt sẵn cho mọi phần tử trong `components.css`, không dùng thanh xám dày mặc định.
- Nút chỉ có icon dùng `.sp-icon-btn` (36px, 44px trên điện thoại), luôn có `aria-label` và `.sp-tooltip`.

## Xác nhận và hoàn tác

Hỏi lại quá nhiều thì người dùng bấm theo phản xạ và hộp hỏi mất tác dụng. Mỗi thao tác thuộc đúng một trong ba mức:

| Mức | Khi nào | Cách làm | Ví dụ |
|---|---|---|---|
| Hỏi lại | Về tiền, không đảo lại được, hoặc ảnh hưởng người khác | `ConfirmDialog` nêu đối tượng và con số; nút xác nhận lặp lại động từ | Hoàn thành và thu tiền, Hoàn tiền, Hủy lịch, Đánh dấu không đến, Xóa, Duyệt nghỉ phép có lịch bị ảnh hưởng |
| Làm ngay, cho hoàn tác | Hay làm, đảo lại được | Chạy ngay, `Toast` có "Hoàn tác" trong 5 giây | Check-in, kéo lịch sang giờ khác, đổi thợ, thêm dịch vụ |
| Không hỏi | Không đổi dữ liệu | Không có gì thêm | Mở chi tiết, đổi ngày, đổi kiểu xem, lọc, chọn trên trang khách |

- Thu tiền ghi bút toán vào sổ cái, sửa sai chỉ bằng bút toán đảo, nên luôn hỏi lại và hiện số tiền, tiền cọc đã trừ, hình thức thanh toán.
- Xong một thao tác thì ẩn các nút không còn hợp lệ: lịch hoàn thành không còn Check-in, Đổi giờ, Thêm dịch vụ; lịch không đến không còn Thu tiền.
- Trang khách không dùng hộp hỏi: bước Xác nhận đã là màn kiểm lại.

## Icon và logo

- Icon: bộ **Lucide** (cùng bộ với shadcn/ui trong code), nét 1.5–2px, cỡ 16px trong quản trị, 20px trên trang khách, màu theo chữ xung quanh. Không dùng emoji thay icon.
- Logo: **chưa có**. Tạm viết chữ "Sapio" bằng Be Vietnam Pro 700, màu `ink`. Khi làm logo, thêm vào nhóm tài sản Logos.

## Dùng trong code (Next.js + Tailwind 4 + shadcn/ui)

`apps/web` và `datn-docs` dùng biến CSS của shadcn. Gán các biến đó từ token Sapio, không đặt màu riêng:

| Biến shadcn | Token Sapio |
|---|---|
| `--background` | `surface` |
| `--foreground` | `ink` |
| `--card`, `--popover` | `surface-raised` |
| `--muted` | `surface-sunken` |
| `--muted-foreground` | `ink-muted` |
| `--border` | `line` |
| `--input` | `line-strong` |
| `--primary` / `--primary-foreground` | `primary` / `on-primary` |
| `--accent` / `--accent-foreground` | `brand-soft` / `brand` |
| `--destructive` | `danger` |
| `--ring` | `focus-ring` |
| `--radius` | `radius-md` |

Theme tối gán vào lớp `.dark` của shadcn bằng các giá trị theme Tối. Font: `next/font/google` với `Be_Vietnam_Pro`, subsets `latin` và `vietnamese`. Màu trạng thái, màu cơ sở và token lịch thêm vào `@theme` của Tailwind với cùng tên (`--color-status-confirmed`, `--color-tenant-may`, `--spacing-slot`…).
