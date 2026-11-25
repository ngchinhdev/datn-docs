---
title: Quên và đặt lại mật khẩu (MH-04)
description: Đặc tả màn xin link đặt lại mật khẩu, màn đặt mật khẩu mới và trang báo link không còn dùng được.
---

| | |
|---|---|
| Mã | MH-04 |
| Route | `sapio.vn/forgot-password`, `sapio.vn/reset-password?token=` |
| Người dùng | Chủ cơ sở, quản lý, lễ tân, kỹ thuật viên |
| Mock | `/mock/forgot-password`, `/mock/reset-password` |
| Bản vẽ | `design/screens/` (bộ màn tài khoản, `QuenMatKhau`, `DatLaiMatKhau`) |
| Nghiệp vụ | [Quên và đặt lại mật khẩu](../features/auth.md#br-77-quên-và-đặt-lại-mật-khẩu), [Mật khẩu](../features/auth.md#br-73-mật-khẩu) |
| API | [#6 Quên mật khẩu](../api/auth.md#6-quên-mật-khẩu), [#7 Kiểm link đặt lại](../api/auth.md#7-kiểm-link-đặt-lại), [#8 Đặt lại mật khẩu](../api/auth.md#8-đặt-lại-mật-khẩu) |

Ba trang: xin link (`/forgot-password`), đặt mật khẩu mới (`/reset-password`) và trang "Link không còn dùng được", hiện ở chính route `/reset-password` khi link không dùng được. Tài khoản quản trị nền tảng không có trang nào trong ba trang này (T-18).

## Xin link: `/forgot-password`

Bố cục `AuthPage` như [Đăng nhập](./login.md): khối giới thiệu bên trái, form bên phải, rộng tối đa 400px.

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Khối giới thiệu | Khối `AuthAside`, kiểu `forgot` | | | Chỉ để trang trí |
| 2 | Đăng nhập | Link, góc trên phải | | | Tới `/login` |
| 3 | Tiêu đề | Chữ | | "Quên mật khẩu" | `h1` |
| 4 | Dòng dẫn | Chữ | | "Nhập email đăng nhập. Sapio gửi một link để đặt mật khẩu mới." | |
| 5 | Email | Ô nhập `type="email"` | Có | Lấy từ `?email=`, nếu có | `autocomplete="email"` |
| 6 | Lỗi | Chữ báo lỗi dưới mục 5 | | Ẩn | Nối với mục 5 bằng `aria-describedby` |
| 7 | Báo đã gửi | `Notice` loại info, `role="status"` | | Ẩn | "Nếu {email} có tài khoản Sapio, link đặt lại vừa được gửi tới đó. Link dùng được 30 phút và chỉ một lần. Không thấy thì xem thư mục Spam." `{email}` là mục 5 sau khi chuẩn hóa, in đậm cùng "30 phút" |
| 8 | Gửi link đặt lại | Nút chính, cao 48 | | "Gửi link đặt lại" | Mục 9 thay nó sau khi đã gửi |
| 9 | Gửi lại link | Nút phụ, cao 48 | | Ẩn | "Gửi lại link". Trong 60 giây đầu chữ đổi thành "Gửi lại sau {m:ss}" và nút không bấm được |
| 10 | Quay lại đăng nhập | Link chữ, giữa, dưới form | | | Tới `/login` |
| 11 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | | | Như mục 15 và 16 của [Đăng nhập](./login.md) |

### Xử lý

| Khi | Xử lý |
|---|---|
| Mở trang | Hiện form, không gọi API. Đang có phiên vẫn ở lại trang. `?email=` điền sẵn mục 5, tối đa 254 ký tự |
| Sửa mục 5 | Ẩn mục 6. Mục 7 và mục 9 đang hiện thì ẩn, mục 8 hiện lại |
| Nhấn mục 8 hoặc Enter | Kiểm trên máy trước. Mục 5 trống hoặc sai dạng thì báo ở mục 6 "Email chưa đúng. Ví dụ: an@tiemcuaban.vn.", không gọi API. Hết lỗi thì gọi API #6 với `{ email: mục 5 }`; trong lúc chờ, nút hiện vòng xoay và không bấm được |
| API trả 202 | Hiện mục 7, thay mục 8 bằng mục 9 và đếm ngược 60 giây. Trang không cho biết email có tài khoản hay không (BR-77.1) |
| Bấm mục 9 | Gọi API #6 như trên. API trả 202 thì đếm ngược lại từ 60 giây |
| API trả 400 `VALIDATION_FAILED` | Mục 6 hiện `message` của lỗi `email` |
| API trả 429 `RATE_LIMITED` | Mục 6: "Thử quá nhiều lần. Thử lại sau {Retry-After} giây." |
| Lỗi mạng hoặc 5xx | Mục 6: "Chưa gửi được link, thử lại sau." Lỗi 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |
| Bấm mục 2 hoặc mục 10 | Chuyển tới `/login` |
| Bấm mục 11 | Như [Đăng nhập](./login.md): đổi ngôn ngữ của cả trang, kể cả câu báo lỗi đang hiện |

## Đặt mật khẩu mới: `/reset-password?token=`

Bố cục như trang xin link.

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Khối giới thiệu | Khối `AuthAside`, kiểu `forgot` | | | Chỉ để trang trí |
| 2 | Tiêu đề | Chữ | | "Đặt mật khẩu mới" | `h1` |
| 3 | Dòng dẫn | Chữ | | "Cho tài khoản {email}." | `{email}` lấy từ API #7 |
| 4 | Mật khẩu mới | `PasswordField` | Có | Trống | Nhãn "Mật khẩu mới", `autocomplete="new-password"`, gợi ý "Ít nhất 15 ký tự. Một câu dễ nhớ là đủ." Có nút hiện hoặc ẩn, có báo khi Caps Lock bật. Cho dán (BR-73.4) |
| 5 | Lỗi | Chữ báo lỗi dưới mục 4 | | Ẩn | Nối với mục 4 bằng `aria-describedby` |
| 6 | Điều kiện | `ul` dưới mục 4 | | Ẩn, hiện khi mục 4 có chữ | Ba dòng, xem dưới bảng |
| 7 | Ghi chú | `Notice` loại note, `role="note"` | | | "Đặt xong, các máy khác đang đăng nhập bằng tài khoản này sẽ bị đăng xuất. Bạn vào thẳng cơ sở dùng gần nhất." |
| 8 | Lưu mật khẩu và đăng nhập | Nút chính, cao 48 | | "Lưu mật khẩu và đăng nhập" | |
| 9 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | | | Như mục 15 và 16 của [Đăng nhập](./login.md) |

Ba dòng của mục 6:

| Dòng | Chữ | Màu |
|---|---|---|
| Độ dài | "{n} ký tự", thêm ", cần ít nhất 15" khi chưa đủ. `n` đếm ký tự Unicode sau khi chuẩn hóa NFC (BR-73.1) | Xanh khi từ 15 ký tự trở lên, đỏ khi chưa đủ |
| Phổ biến | "Không nằm trong danh sách mật khẩu phổ biến". Chỉ hiện khi đủ độ dài | Không màu. Chuyển đỏ khi API trả `TOO_COMMON`, về không màu khi mục 4 đổi, vì danh sách nằm ở máy chủ |
| Gợi ý | "Có thể dùng một câu, dấu cách và tiếng Việt có dấu đều được." | Không màu |

### Xử lý

| Khi | Xử lý |
|---|---|
| Mở trang | Trình duyệt gọi API #7 qua `/api` với `token` trong địa chỉ; trong lúc chờ hiện khung trống. 200 thì hiện form, mục 3 lấy `email` của phản hồi. 410, 400, hoặc địa chỉ không có `token`, thì hiện trang "Link không còn dùng được". 429, lỗi mạng hoặc 5xx thì hiện "Chưa kiểm được link". Tiêu đề tab luôn là "Đặt mật khẩu mới". Trang đặt `referrer` là `no-referrer` để token không lọt ra ngoài qua header `Referer`. Đang có phiên vẫn vào được trang |
| Gõ vào mục 4 | Hiện mục 6, ẩn mục 5 |
| Nhấn mục 8 hoặc Enter | Kiểm trên máy theo BR-73.1 trước. Mục 4 ngắn hơn 15 ký tự, kể cả trống, thì báo ở mục 5 "Mật khẩu cần ít nhất 15 ký tự."; dài hơn 128 thì "Mật khẩu quá dài."; không gọi API. Hết lỗi thì gọi API #8 với `{ token, password: mục 4 }`; trong lúc chờ, nút hiện vòng xoay và không bấm được |
| API trả 200 | Chuyển tới `redirectTo`. Phiên mới (không giữ đăng nhập) thay phiên cũ của trình duyệt này, mọi phiên khác của tài khoản bị thu hồi (BR-77.5) |
| API trả 400 `VALIDATION_FAILED` | Mục 5 hiện `message` của lỗi `password`: `TOO_SHORT` "Mật khẩu cần ít nhất 15 ký tự.", `TOO_LONG` "Mật khẩu quá dài.", `TOO_COMMON` "Mật khẩu quá phổ biến, dễ bị đoán. Chọn mật khẩu khác." Link vẫn dùng được |
| API trả 410 `RESET_LINK_INVALID` | Thay trang bằng "Link không còn dùng được" |
| API trả 429 `RATE_LIMITED` | Mục 5: "Thử quá nhiều lần. Thử lại sau {Retry-After} giây." |
| Lỗi mạng hoặc 5xx | Mục 5: "Chưa đặt được mật khẩu, thử lại sau." Lỗi 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |
| Bấm mục 9 | Như [Đăng nhập](./login.md) |

### Chưa kiểm được link

Hiện thay form khi API #7 trả 429, lỗi mạng hoặc 5xx. Không có khối giới thiệu, cột rộng tối đa 480px.

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Tiêu đề | Chữ | "Đặt mật khẩu mới", `h1` |
| 2 | Lỗi | `Notice` loại danger, `role="alert"` | 429: "Thử quá nhiều lần. Thử lại sau {Retry-After} giây." Lỗi mạng hoặc 5xx: "Chưa kiểm tra được link, thử lại sau." Lỗi 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |
| 3 | Thử lại | Nút phụ | Gọi lại API #7. Trong lúc chờ hiện vòng xoay và không bấm được |
| 4 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | Như mục 15 và 16 của [Đăng nhập](./login.md) |

## Link không còn dùng được

Một trang chung cho link đã dùng, hết hạn, đã bị thay bằng link mới hơn và link không có (BR-77.6): trang không cho biết là lý do nào. Không có khối giới thiệu, cột rộng tối đa 480px.

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Tiêu đề | Chữ | "Link không còn dùng được", `h1` |
| 2 | Dòng dẫn | Chữ | "Link có thể đã hết hạn (chỉ dùng được 30 phút), đã được dùng, đã có link mới hơn hoặc bị gõ sai. Gửi link mới để tiếp tục." |
| 3 | Gửi link mới | Link kiểu nút chính | Tới `/forgot-password` |
| 4 | Về đăng nhập | Link kiểu nút ghost | Tới `/login` |
| 5 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | Như mục 15 và 16 của [Đăng nhập](./login.md) |
