---
title: Đăng nhập (MH-03, MH-63)
description: Đặc tả màn đăng nhập nhân sự và màn đăng nhập quản trị nền tảng.
---

| | |
|---|---|
| Mã | MH-03 (nhân sự), MH-63 (quản trị nền tảng, phần khác nhau ở cuối trang) |
| Route | `sapio.vn/login`, `admin.sapio.vn/login` |
| Người dùng | Chủ cơ sở, quản lý, lễ tân, kỹ thuật viên; quản trị nền tảng |
| Mock | `/mock/login`, `/mock/admin/login` |
| Bản vẽ | `design/screens/` (bộ màn tài khoản) |
| Nghiệp vụ | [Xác thực nhân sự](../features/auth.md) |
| API | [#1 Đăng nhập](../api/auth.md#1-đăng-nhập), [#3 Phiên hiện tại](../api/auth.md#3-phiên-hiện-tại) |

## Danh sách mục

Bố cục `AuthPage`: khối giới thiệu bên trái, form bên phải. Màn rộng dưới 900px thì ẩn khối bên trái.

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Khối giới thiệu | Khối `AuthAside`, kiểu `login` | | | Chỉ để trang trí, không có thao tác |
| 2 | Đăng ký cơ sở | Link, góc trên phải | | | Tới `/signup`. Ẩn khi màn dưới 900px (mục 13 thay thế) |
| 3 | Tiêu đề | Chữ | | "Đăng nhập" | `h1` |
| 4 | Dòng dẫn | Chữ | | "Dành cho chủ cơ sở và nhân viên." | |
| 5 | Báo khóa | `Notice` loại danger, có icon khóa | | Ẩn | Chỉ hiện khi đang khóa. Có `role="alert"` |
| 6 | Email | Ô nhập `type="email"` | Có | Lấy từ `?email=`, nếu có | `autocomplete="email"`, gợi ý "Ví dụ: an@tiemcuaban.vn" |
| 7 | Mật khẩu | `PasswordField` | Có | Trống | `autocomplete="current-password"`. Có nút hiện hoặc ẩn, có báo khi Caps Lock bật |
| 8 | Quên mật khẩu? | Link, cạnh nhãn của mục 7 | | | Tới `/forgot-password?email={mục 6}` |
| 9 | Lỗi | Chữ báo lỗi dưới mục 7 | | Ẩn | Nối với mục 7 bằng `aria-describedby` |
| 10 | Giữ đăng nhập trên máy này | Checkbox kèm dòng gợi ý | | Không chọn | Gợi ý: "Không chọn thì đăng xuất khi đóng trình duyệt hoặc sau 12 giờ." |
| 11 | Đăng nhập | Nút chính, cao 48 | | "Đăng nhập" | |
| 12 | Đặt lại mật khẩu | Nút phụ, cao 48 | | Ẩn | Chỉ hiện khi đang khóa. Tới như mục 8 |
| 13 | Ghi chú cho khách | Chữ nhỏ, có viền trên | | | "Bạn là khách đặt lịch? Đăng nhập trên trang của tiệm bằng mã gửi qua email." |
| 14 | Chưa có cơ sở | Chữ kèm link | | | "Chưa có cơ sở trên Sapio? Đăng ký, dùng thử 7 ngày", link tới `/signup` |
| 15 | Ngôn ngữ | Nút `VI` hoặc `EN`, thanh trên | Tiếng Việt | Hiện ngôn ngữ đang dùng. Cách làm ở [T-21](../decisions/t21-i18n-next-intl.md) |
| 16 | Giao diện | Nút trăng hoặc mặt trời, thanh trên | Theo hệ thống | Chuyển sáng và tối |

## Xử lý

| Khi | Xử lý |
|---|---|
| Mở trang | Gọi API #3. Đang có phiên thì chuyển tới `?next=` nếu hợp lệ, nếu không thì tới `/select-workspace`. Chưa có phiên thì hiện form, đặt con trỏ vào mục 6, hoặc vào mục 7 khi mục 6 đã có sẵn email |
| `?next=` | Chỉ nhận đường dẫn tương đối bắt đầu bằng `/app/`. Giá trị khác thì bỏ qua, để không bị lợi dụng chuyển hướng sang trang lạ |
| Sửa mục 6 | Ẩn mục 9 |
| Nhấn mục 11 hoặc Enter | Kiểm trên máy trước. Mục 6 trống hoặc sai dạng thì báo dưới mục 6 "Email chưa đúng. Ví dụ: an@tiemcuaban.vn." Mục 7 trống thì báo ở mục 9 "Nhập mật khẩu." Có lỗi thì không gọi API. Hết lỗi thì gọi API #1 với `{ email: mục 6, password: mục 7, remember: mục 10 }`; trong lúc chờ, mục 11 hiện vòng xoay và không bấm được |
| API trả 200 | Chuyển tới `?next=` nếu hợp lệ. Nếu không: tới `redirectTo` |
| API trả 401 `INVALID_CREDENTIALS` | Xóa mục 7 rồi đặt con trỏ vào đó. Mục 9: "Email hoặc mật khẩu chưa đúng.", có `remainingAttempts` thì thêm "Còn {n} lần thử, sau đó tạm khóa 15 phút." |
| API trả 423 `LOGIN_LOCKED` | Xóa mục 7, ẩn mục 9. Mục 5: "Tạm khóa đăng nhập tới {HH:mm}." và "Mật khẩu sai 5 lần liên tiếp. Đã gửi email báo cho {mục 6}. Muốn vào ngay thì đặt lại mật khẩu." Mục 11 không bấm được, chữ đổi thành "Đăng nhập lại sau {m:ss}" và đếm ngược tới `lockedUntil`. Hiện mục 12. Giờ hiển thị theo `Asia/Ho_Chi_Minh` |
| Hết giờ đếm ngược | Ẩn mục 5 và mục 12, mục 11 bấm lại được |
| Sửa mục 6 trong lúc khóa | Ẩn mục 5 và mục 12, mục 11 bấm lại được. Khóa gắn với email, nên email khác vẫn thử được |
| API trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo bằng `message` dưới ô có tên `field` (`email` là mục 6, `password` là mục 9) |
| API trả 429 `RATE_LIMITED` | Mục 9: "Thử quá nhiều lần. Thử lại sau {Retry-After} giây." |
| Bấm mục 15 | Đổi ngôn ngữ của cả trang, kể cả câu báo lỗi đang hiện. Địa chỉ và nội dung đã nhập giữ nguyên. Lựa chọn nhớ cho lần mở sau |
| Lỗi mạng hoặc 5xx | Mục 9: "Chưa đăng nhập được, thử lại sau." Lỗi 5xx có `requestId`, thêm "Mã lỗi: {requestId}" (BR-79) |

## MH-63: đăng nhập quản trị nền tảng

Giống MH-03, chỉ khác:

| Mục | Khác |
|---|---|
| 1 | Khối giới thiệu kiểu `admin` |
| 2, 8, 10, 12, 13, 14 | Không có |
| 3, 4 | "Đăng nhập quản trị", "Dành cho tài khoản quản trị nền tảng." |
| 5 | Câu thứ hai: "Mật khẩu sai 5 lần liên tiếp. Đã gửi email báo cho {email}. Thử lại khi hết thời gian khóa, hoặc nhờ quản trị viên khác đặt lại mật khẩu." |
| Mới | Ghi chú cuối form: "Quên mật khẩu thì nhờ quản trị viên khác đặt lại." |
| API | #9 và #11 thay cho #1 và #3. Đăng nhập xong luôn tới `/` của `admin.sapio.vn` |
