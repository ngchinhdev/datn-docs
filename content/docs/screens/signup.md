---
title: Đăng ký cơ sở (MH-02)
description: "Đặc tả màn đăng ký cơ sở gồm bốn bước: tài khoản, mã xác thực, thông tin cơ sở, đã tạo."
---

| | |
|---|---|
| Mã | MH-02 |
| Route | `sapio.vn/signup?step=account\|verify\|business\|done` |
| Người dùng | Chủ cơ sở tương lai |
| Mock | `/mock/signup` |
| Bản vẽ | `design/screens/` (bộ màn tài khoản, `DangKyTaiKhoan`, `DangKyXacThuc`, `DangKyCoSo`, `DangKyXong`) |
| Nghiệp vụ | [Đăng ký cơ sở](../features/signup.md), [Mật khẩu](../features/auth.md#br-73-mật-khẩu) |
| API | [#1 Tạo tài khoản](../api/signup.md#1-tạo-tài-khoản), [#2 Nhập mã](../api/signup.md#2-nhập-mã-xác-thực), [#3 Gửi lại mã](../api/signup.md#3-gửi-lại-mã), [#4 Kiểm slug](../api/signup.md#4-kiểm-slug), [#5 Tạo cơ sở](../api/signup.md#5-tạo-cơ-sở), [Phiên hiện tại](../api/auth.md#3-phiên-hiện-tại) |

Bốn bước trên một route, chọn bằng `?step=`. Bố cục `AuthPage` như [Đăng nhập](./login.md), thêm hàng ba chặng "Tài khoản", "Xác minh email", "Thông tin cơ sở" ở đầu cột (`SignupSteps`): chặng hiện tại và các chặng đã qua tô màu thương hiệu; bước 4 tô cả ba. Cột rộng 420px ở bước 1 và 2, 720px ở bước 3, 640px ở bước 4. Bản nháp đã nhập giữ trong `sessionStorage` của tab, trừ mật khẩu.

## Mở trang và chọn bước

| Khi | Xử lý |
|---|---|
| Mở `/signup` | Gọi API [Phiên hiện tại](../api/auth.md#3-phiên-hiện-tại). Chưa có phiên: bước 1. Có phiên, `emailVerified = false`: bước 2. `emailVerified = true` và `canCreateTrial = true`: bước 3. `canCreateTrial = false`: chuyển tới `/select-workspace` |
| `?step=` ở xa hơn bước được phép | Chuyển tới bước xa nhất được phép. Bước `done` chỉ mở được khi tab giữ kết quả của API #5; không thì chuyển tới `/select-workspace` |
| `?step=` ở gần hơn bước xa nhất | Bước 1 mở được khi chưa có phiên hoặc phiên chưa xác thực (đường "Sửa email"); với phiên đã xác thực thì chuyển tới bước 3. Bước 2 với phiên đã xác thực chuyển tới bước 3 |
| Bấm nút ngôn ngữ hoặc giao diện | Như mục 15 và 16 của [Đăng nhập](./login.md). Áp cho cả bốn bước, kể cả câu báo lỗi đang hiện |

## Bước 1: Tài khoản

Tiêu đề trang: "Đăng ký cơ sở · Sapio".

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Các chặng | `SignupSteps` | | Chặng 1 | |
| 2 | Đăng nhập | Link, góc trên phải | | | Tới `/login` |
| 3 | Tiêu đề | Chữ | | "Tạo tài khoản chủ cơ sở" | `h1` |
| 4 | Dòng dẫn | Chữ | | "Dùng tài khoản này để quản lý lịch, nhân viên và thu tiền." | |
| 5 | Họ và tên | Ô nhập | Có | Trống; có phiên chưa xác thực thì lấy `user.name` | `autocomplete="name"`, gợi ý trong ô "Ví dụ: Nguyễn Văn An" |
| 6 | Email | Ô nhập `type="email"` | Có | Trống; có phiên chưa xác thực thì lấy `user.email` | `autocomplete="email"`. Gợi ý "Mã xác nhận sẽ gửi tới email này." |
| 7 | Mật khẩu | `PasswordField` | Có | Trống, kể cả khi đã có phiên | `autocomplete="new-password"`. Gợi ý "Ít nhất 15 ký tự. Một câu dễ nhớ là đủ, ví dụ *tiem toc may mo cua 8 gio*." Có nút hiện hoặc ẩn. Cho dán (BR-73.4) |
| 8 | Đồng ý điều khoản | Checkbox | Có | Không chọn | "Tôi đồng ý với [Điều khoản sử dụng] và [Chính sách quyền riêng tư] của Sapio." |
| 9 | Lỗi chung | Chữ báo lỗi, `role="alert"`, dưới mục 8 | | Ẩn | |
| 10 | Tạo tài khoản | Nút chính, cao 48 | | "Tạo tài khoản" | |
| 11 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | | | Như mục 15 và 16 của [Đăng nhập](./login.md) |

### Xử lý

| Khi | Xử lý |
|---|---|
| Rời mục 5, 6, 7 | Hiện lỗi của mục đó nếu có. Lỗi của mục 8 hiện khi bấm mục 10 |
| Nhấn mục 10 hoặc Enter | Kiểm trên máy trước, đặt con trỏ vào mục lỗi đầu tiên và không gọi API: mục 5 trống "Nhập họ và tên."; mục 6 sai dạng "Email chưa đúng. Ví dụ: an@tiemcuaban.vn."; mục 7 trống "Nhập mật khẩu.", ngắn hơn 15 ký tự "Mật khẩu cần ít nhất 15 ký tự.", dài hơn 128 "Mật khẩu dài tối đa 128 ký tự."; mục 8 chưa chọn "Cần đồng ý điều khoản để tiếp tục." Hết lỗi thì gọi API #1 với `{ fullName, email, password, acceptTerms }`; trong lúc chờ, mục 10 hiện vòng xoay và không bấm được |
| API trả 201 | Chuyển tới bước 2. Giữ `resendAt` và `codeExpiresAt` trong bản nháp |
| API trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo bằng `message` dưới mục có `field`: `fullName` là mục 5, `email` là mục 6, `password` là mục 7, `acceptTerms` là mục 8. Mật khẩu nằm trong danh sách phổ biến chỉ do API báo (`TOO_COMMON`, "Mật khẩu quá phổ biến, dễ bị đoán. Chọn mật khẩu khác."), vì danh sách nằm ở máy chủ |
| API trả 409 `EMAIL_TAKEN` | Mục 6: "Email này đã có tài khoản Sapio." kèm link "Đăng nhập" tới `/login?email={mục 6}`. Con trỏ vào mục 6 |
| API trả 429 `CODE_LIMIT_REACHED` | Mục 6: "Đã gửi quá nhiều mã tới email này. Thử lại sau {n} phút." với `n` là `Retry-After` đổi sang phút, làm tròn lên |
| API trả 429 `RATE_LIMITED` | Mục 9: "Thử quá nhiều lần. Thử lại sau {Retry-After} giây." |
| Lỗi mạng hoặc 5xx | Mục 9: "Chưa tạo được tài khoản, thử lại sau." Lỗi 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |
| Bấm mục 2 | Chuyển tới `/login` |

## Bước 2: Mã xác thực

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Các chặng | `SignupSteps` | | Chặng 2 | |
| 2 | Đăng xuất | Nút ghost nhỏ, góc trên phải | | | Gọi [Đăng xuất](../api/auth.md#2-đăng-xuất) rồi chuyển tới `/login` |
| 3 | Tiêu đề | Chữ | | "Nhập mã trong email" | `h1` |
| 4 | Dòng dẫn | Chữ | | "Đã gửi mã 6 số tới **{email}**. Sửa email" | `{email}` lấy từ phiên. "Sửa email" là link tới bước 1 |
| 5 | Mã xác nhận | `OtpField`, 6 ô | Có | Trống, tự lấy tiêu điểm | `autocomplete="one-time-code"`. Gợi ý "Gõ đủ 6 số là tự xác nhận. Mã dùng được 10 phút. Không thấy email? Xem trong thư rác." |
| 6 | Lỗi | Chữ báo lỗi, thay gợi ý của mục 5 | | Ẩn | |
| 7 | Xác nhận | Nút chính, cao 48 | | "Xác nhận" | Không bấm được khi mục 5 chưa đủ 6 số, hoặc mã đã bị hủy |
| 8 | Gửi lại mã | Nút ghost, cao 44 | | "Gửi lại mã" | Trước `resendAt` chữ đổi thành "Gửi lại mã sau {m:ss}" và nút không bấm được |
| 9 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | | | Như mục 15 và 16 của [Đăng nhập](./login.md) |

### Xử lý

| Khi | Xử lý |
|---|---|
| Mở trang từ bước 1 | Mục 8 đếm ngược tới `resendAt` |
| Mở trang từ đăng nhập (không có `resendAt`) | Mục 8 bấm được ngay; đăng nhập không gửi mã (BR-74.14) |
| Gõ vào mục 5 | Ẩn mục 6 (trừ khi mã đã bị hủy) |
| Gõ đủ 6 số, hoặc nhấn mục 7 | Gọi API #2 với `{ code }`; trong lúc chờ, mục 7 hiện vòng xoay |
| API trả 200 | Chuyển tới bước 3 |
| API trả 400 `CODE_INVALID` | Xóa mục 5 rồi đặt con trỏ vào đó. Mục 6: "Mã chưa đúng. Còn {attemptsLeft} lần thử." Khi `attemptsLeft = 0`: "Bạn đã nhập sai quá số lần cho phép. Gửi mã mới để thử lại."; mục 5 và mục 7 không bấm được tới khi gửi mã mới |
| API trả 410 `CODE_EXPIRED` | Mục 6: "Mã đã hết hạn hoặc đã bị hủy. Gửi mã mới." Xóa mục 5. Mục 8 theo hạn 60 giây của lần gửi trước |
| API trả 409 `ALREADY_VERIFIED` | Chuyển tới bước 3 |
| API trả 401 `UNAUTHENTICATED` | Chuyển tới bước 1 |
| API trả 400 `VALIDATION_FAILED` | Mục 6 hiện `message` của lỗi `code` |
| API trả 429 `RATE_LIMITED` | Mục 6: "Thử quá nhiều lần. Thử lại sau {Retry-After} giây." |
| Bấm mục 8 | Gọi API #3 |
| API #3 trả 202 | Xóa mục 5 và mục 6, mở khóa mục 5 và 7, đếm ngược tới `resendAt` mới. Hộp thông báo ngắn: "Đã gửi mã mới tới {email}." Con trỏ vào mục 5 |
| API #3 trả 429 `RESEND_TOO_SOON` | Mục 8 đếm ngược theo `Retry-After` |
| API #3 trả 429 `CODE_LIMIT_REACHED` | Mục 6: "Đã gửi quá nhiều mã tới email này. Thử lại sau {n} phút." |
| Bấm "Sửa email" trong mục 4 | Chuyển tới bước 1 với mục 5 và 6 đã điền, mục 7 trống |
| Lỗi mạng hoặc 5xx | Mục 6: "Chưa xác nhận được mã, thử lại sau." (nút mục 8: "Chưa gửi được mã, thử lại sau."). Lỗi 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |

## Bước 3: Thông tin cơ sở

Bốn thẻ liền nhau, nút ở cuối. Không có nút "Lưu và làm tiếp sau" và không có "Quay lại": bước 2 đã xong.

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Các chặng | `SignupSteps` | | Chặng 3 | |
| 2 | Tiêu đề, dòng dẫn | Chữ | | "Thông tin cơ sở", "Tên cơ sở, địa chỉ trang đặt lịch, chi nhánh đầu tiên và giờ mở cửa." | `h1` |
| | **Thẻ "Tên và địa chỉ trang đặt lịch"** | | | | Gợi ý của thẻ: "Khách vào địa chỉ này để đặt lịch. Đổi được sau trong Cài đặt › Thương hiệu, địa chỉ cũ tự chuyển sang địa chỉ mới." |
| 3 | Tên cơ sở | Ô nhập | Có | Trống | `autocomplete="organization"`, gợi ý trong ô "Ví dụ: Salon Tóc Mây" |
| 4 | Địa chỉ trang đặt lịch | Ô nhập, hậu tố `.sapio.vn` | Có | Gợi ý từ mục 3 | BR-72. Gợi ý "Chữ thường không dấu, số và dấu gạch ngang; 3 đến 40 ký tự." Sau khi kiểm xong: "{slug}.sapio.vn còn trống" kèm dấu tick |
| | **Thẻ "Chi nhánh đầu tiên"** | | | | Gợi ý của thẻ: "Thêm chi nhánh khác sau trong Cài đặt." |
| 5 | Tên chi nhánh | Ô nhập | Có | Trống | Gợi ý trong ô "Ví dụ: Quận 3" |
| 6 | Số điện thoại | Ô nhập `type="tel"` | Có | Trống | Gợi ý trong ô "Ví dụ: 028 3930 1234" (BR-61) |
| 7 | Địa chỉ | Ô nhập | Có | Trống | Gợi ý trong ô "Số nhà, đường, phường, thành phố" |
| | **Thẻ "Giờ mở cửa"** | | | | Gợi ý của thẻ: "Giờ Việt Nam. Nghỉ trưa, nhiều khung một ngày và ngày lễ chỉnh trong Cài đặt › Chi nhánh." |
| 8 | Bảy dòng ngày, Thứ Hai đến Chủ Nhật | Công tắc "Mở cửa {ngày}" và hai ô chọn giờ | Ít nhất một ngày mở | Mở 08:00 đến 20:00; Chủ Nhật nghỉ ("Nghỉ") | Ô chọn giờ cách nhau 30 phút, từ 06:00 đến 23:00. Mỗi ngày một khung |
| | **Thẻ "Tài nguyên ban đầu"** | | | | Gợi ý của thẻ: "Số lượng ở chi nhánh này. Tên tự đặt là Ghế 1, Ghế 2...; đổi tên trong Cài đặt › Tài nguyên." |
| 9 | Ghế | Ô số −, số, + | | 1 | Từ 0 đến 20. Gợi ý "Ghế cắt, ghế làm móng. Mỗi ghế một khách một lúc." |
| 10 | Giường | Ô số −, số, + | | 0 | Từ 0 đến 20. Gợi ý "Giường gội, massage, chăm sóc da." |
| 11 | Phòng | Ô số −, số, + | | 0 | Từ 0 đến 20. Gợi ý "Phòng xông, phòng trị liệu." |
| 12 | Lỗi chung | `Notice` loại danger, `role="alert"` | | Ẩn | Trên nút |
| 13 | Tạo cơ sở | Nút chính, thanh nút cuối | | "Tạo cơ sở" | |
| 14 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | | | Như mục 15 và 16 của [Đăng nhập](./login.md) |

Số lượng nhập bằng bàn phím tự kẹp vào khoảng 0 đến 20 khi rời ô.

### Xử lý

| Khi | Xử lý |
|---|---|
| Mở trang | Phiên chưa xác thực chuyển về bước 2; chưa có phiên chuyển về bước 1 |
| Gõ mục 3 | Mục 4 đổi theo, cho tới khi người dùng gõ vào mục 4 (ô không rỗng): bỏ dấu, chữ thường, mọi chuỗi ký tự khác chữ và số thành một dấu gạch ngang, cắt ở 40 ký tự, bỏ gạch ngang ở hai đầu. Xóa hết mục 4 thì gợi ý trở lại |
| Mục 4 đổi, ngừng gõ 500 ms | Kiểm định dạng trên máy. Đúng thì gọi API #4; trong lúc chờ gợi ý là "Đang kiểm tra địa chỉ…". Rời mục 4 khi giá trị hiện tại chưa kiểm thì gọi ngay |
| API #4 trả `available = true` | Gợi ý của mục 4 thành "{slug}.sapio.vn còn trống" |
| API #4 trả `available = false` | `TAKEN`: mục 4 "Đã có cơ sở dùng địa chỉ này". `RESERVED`: "Tên này dành riêng cho hệ thống, chọn tên khác." `INVALID_FORMAT`: câu của lỗi định dạng ở dưới |
| Rời mục 4 | Hiện lỗi định dạng nếu có: ký tự "Chỉ dùng chữ thường không dấu, số và dấu gạch ngang."; gạch ngang ở đầu hoặc cuối "Địa chỉ không bắt đầu hoặc kết thúc bằng dấu gạch ngang."; độ dài "Địa chỉ dài từ 3 đến 40 ký tự."; trống "Nhập địa chỉ trang đặt lịch." |
| Nhấn mục 13 hoặc Enter | Kiểm trên máy, đặt con trỏ vào mục lỗi đầu tiên và không gọi API: mục 3 trống "Nhập tên cơ sở."; mục 4 như trên; mục 5 trống "Nhập tên chi nhánh."; mục 6 sai "Số điện thoại chưa đúng. Ví dụ: 028 3930 1234."; mục 7 trống "Nhập địa chỉ chi nhánh."; mục 8 không có ngày mở "Chọn ít nhất một ngày mở cửa."; ngày mở có giờ đóng không sau giờ mở "Giờ đóng cửa phải sau giờ mở cửa." dưới đúng dòng đó. Hết lỗi thì gọi API #5; trong lúc chờ, mục 13 hiện vòng xoay và không bấm được |
| API #5 trả 201 | Giữ kết quả trong `sessionStorage` của tab, chuyển tới bước 4 |
| API #5 trả 409 `SLUG_TAKEN` | Mục 4: "Đã có cơ sở dùng địa chỉ này". Con trỏ vào mục 4, các mục khác giữ nguyên |
| API #5 trả 409 `TRIAL_USED` | Mục 12: "Tài khoản này đã tạo cơ sở dùng thử." kèm link "Chọn cơ sở" tới `/select-workspace` |
| API #5 trả 403 `EMAIL_NOT_VERIFIED` | Chuyển tới bước 2 |
| API #5 trả 401 `UNAUTHENTICATED` | Chuyển tới bước 1 |
| API #5 trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo bằng `message` dưới mục có `field`: `name` là mục 3, `slug` là mục 4, `branch.name` là mục 5, `branch.phone` là mục 6, `branch.address` là mục 7, `openingHours` là dưới mục 8, `openingHours.{i}.*` là dưới dòng ngày thứ `i`, `resources.*` là dưới mục 9 đến 11 |
| API #5 trả 429 hoặc lỗi mạng, 5xx | Mục 12: "Chưa tạo được cơ sở, thử lại sau." Lỗi 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79). Bấm lại mục 13 là gửi lại cùng nội dung |

## Bước 4: Đã tạo

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Các chặng | `SignupSteps` | Cả ba tô màu |
| 2 | Tiêu đề | Chữ, kèm dấu tick xanh | "{tên cơ sở} đã được tạo", `h1` |
| 3 | Dòng dẫn | Chữ | "Đã có chi nhánh {tên chi nhánh}, {n} ghế, {n} giường và {n} phòng." Loại có số 0 thì bỏ; không có tài nguyên nào thì chỉ "Đã có chi nhánh {tên chi nhánh}." |
| 4 | Trang đặt lịch | Thẻ, tiêu đề "Trang đặt lịch", nhãn "Chưa nhận lịch" | Địa chỉ `{slug}.sapio.vn`, nút "Sao chép" và "Xem thử", gợi ý "Trong thời gian dùng thử, trang đặt lịch chưa nhận khách. Chỉ bạn, khi đã đăng nhập, xem thử được." (BR-81) |
| 5 | Dùng thử | Thẻ nền thương hiệu | Tiêu đề "Dùng thử 7 ngày, đến 23:59 ngày {ngày cuối dùng thử}". Nội dung: "Trong thời gian dùng thử, bạn thêm nhân viên, dịch vụ, tài nguyên, xếp ca và xem thử trang đặt lịch. Chưa nhận đặt lịch online và chưa tạo được lịch hẹn. Hết 7 ngày mà chưa kích hoạt gói thì tài khoản chỉ còn trang mua gói; dữ liệu vẫn được giữ." |
| 6 | Vào trang quản trị | Nút chính | Tới `redirectTo` của API #5 |
| 7 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | Như mục 15 và 16 của [Đăng nhập](./login.md) |

`{ngày cuối dùng thử}` là ngày liền trước ngày (giờ chi nhánh) của `trialEndsAt`, ví dụ 16/11/2026 khi tạo ngày 10/11/2026 (BR-74.23).

| Khi | Xử lý |
|---|---|
| Bấm "Sao chép" | Chép `{slug}.sapio.vn` vào bộ nhớ tạm; hộp thông báo ngắn "Đã sao chép {địa chỉ}." |
| Bấm "Xem thử" | Mở trang đặt lịch của cơ sở ở chế độ dùng thử (`noindex`, BR-81) |
| Bấm mục 6 | Chuyển tới `redirectTo`; xóa kết quả khỏi `sessionStorage` |
| Tải lại trang | Kết quả còn trong `sessionStorage` thì hiện lại; không thì chuyển tới `/select-workspace` |
