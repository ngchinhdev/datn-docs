---
title: Chi nhánh và tài nguyên (MH-42, MH-43, MH-46)
description: Đặc tả ba màn Cài đặt của chủ cơ sở - danh sách chi nhánh, chi tiết chi nhánh với giờ mở cửa và ngày đặc biệt, tài nguyên với loại, thứ tự, tạm ngưng.
---

| | MH-42 Chi nhánh | MH-43 Chi tiết chi nhánh | MH-46 Tài nguyên |
|---|---|---|---|
| Route | `/app/[tenant]/settings/branches?status=` | `/app/[tenant]/settings/branches/[id]` | `/app/[tenant]/settings/resources?branch=&type=&status=` |
| Người dùng | Chủ cơ sở | Chủ cơ sở | Chủ cơ sở |
| Mock | `/mock/app/toc-may/settings/branches` | `/mock/app/toc-may/settings/branches/{id}` | `/mock/app/toc-may/settings/resources` |
| Bản vẽ | Mẫu danh sách (MH-08) | `design/screens/ChiNhanhChiTiet.dc.html` | `design/screens/TaiNguyen.dc.html` |
| Mức | DS | Vẽ | DS |

Nghiệp vụ: [Chi nhánh và tài nguyên](../features/branch-settings.md). API: [Chi nhánh và tài nguyên](../api/branch-settings.md). Khung chung (thanh bên, breadcrumb, thanh lưu) theo [Danh sách màn hình](./index.md) (MH-07 đến MH-09).

Cả ba màn nằm trong Cài đặt, chỉ chủ cơ sở mở được: vai trò khác thấy trang 403 trong khung, tài khoản không thuộc cơ sở thấy 404 (MH-10, BR-79). Gói hết hạn chuyển về Gói Sapio, cơ sở bị khóa chuyển về trang khóa (BR-93.3).

## Trạng thái chung

| Trạng thái | Hiển thị |
|---|---|
| Có dữ liệu | Bảng hoặc thẻ như mô tả dưới |
| Rỗng | Dòng chữ và nút làm tiếp, ở từng màn |
| Đang tải | Khung bảng giữ nguyên chỗ, ba dòng xám; thanh lưu và nút chính chưa bấm được |
| Lỗi tải (5xx, mất mạng) | Một dải báo ở đầu trang: "Chưa tải được dữ liệu, thử lại sau." kèm nút "Thử lại"; 5xx có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |

Mock luôn có dữ liệu nên không mô phỏng hai trạng thái cuối. Mọi nút gọi API trong lúc chờ hiện vòng xoay và không bấm được lần hai.

## Lỗi chung của các nút ghi

Áp cho mọi dòng "Xử lý" dưới đây, trừ khi dòng nói khác:

| API trả | Xử lý |
|---|---|
| 402 `SUBSCRIPTION_EXPIRED` | Chuyển tới Gói Sapio (BR-82) |
| 403 `TENANT_LOCKED` | Chuyển tới trang cơ sở bị khóa (MH-10) |
| 403 `FORBIDDEN`, 404 `NOT_FOUND` | Trang 403 hoặc 404 trong khung (MH-10) |
| 429 `RATE_LIMITED` | Hộp thông báo: "Thao tác quá nhanh. Thử lại sau {Retry-After} giây." |
| Lỗi mạng hoặc 5xx | Hộp thông báo: "Chưa lưu được, thử lại sau." kèm "Mã lỗi: {requestId}" nếu có; dữ liệu trên màn giữ nguyên để bấm lại |

## MH-42 Chi nhánh

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Đường dẫn | Breadcrumb | Cài đặt › Chi nhánh |
| 2 | Tiêu đề | `h1` | "Chi nhánh" |
| 3 | Dòng dưới tiêu đề | Chữ | Có giới hạn: "{n} chi nhánh đang dùng, gói {tên gói} cho tối đa {max}". Không giới hạn: "{n} chi nhánh đang dùng". `n` và `max` lấy từ `plan` của API #1 |
| 4 | Thêm chi nhánh | Nút chính | Luôn bấm được; vượt giới hạn do API báo (BR-93.2). Mở hộp "Thêm chi nhánh" |
| 5 | Dải giới hạn | `Notice` loại info | Chỉ khi `activeBranches` đã bằng `maxBranches`: "Đã dùng đủ {max} chi nhánh của gói {tên gói}. Muốn thêm chi nhánh, nâng gói." kèm link "Xem gói Sapio" tới `/settings/plan` |
| 6 | Trạng thái | Bộ lọc | "Đang dùng" (mặc định), "Đã ngừng dùng", "Tất cả"; lưu ở `?status=` |
| 7 | Bảng | `DataTable` | Cột Chi nhánh (tên là link tới MH-43; chi nhánh đầu tiên có dòng phụ "Chi nhánh đầu tiên"), Địa chỉ, Nhân viên, Tài nguyên, Trạng thái, nút mở. Chi nhánh đã ngừng dùng có nhãn "Đã ngừng dùng" |
| 8 | Chân bảng | Chữ | "{n} chi nhánh" |

Rỗng: lọc "Đã ngừng dùng" mà không có chi nhánh nào thì bảng thay bằng "Chưa có chi nhánh nào ngừng dùng." Lọc "Đang dùng" không bao giờ rỗng vì cơ sở luôn còn một chi nhánh đang dùng (BR-93.10).

### Hộp "Thêm chi nhánh"

| # | Mục | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| 1 | Tên chi nhánh | Ô nhập | Có | Gợi ý trong ô "Ví dụ: Quận 7" |
| 2 | Số điện thoại | Ô nhập `type="tel"` | Có | Gợi ý trong ô "Ví dụ: 028 3930 1234" (BR-61, BR-93.5) |
| 3 | Địa chỉ | Ô nhập | Có | Gợi ý trong ô "Số nhà, đường, phường, thành phố" |
| 4 | Gợi ý của hộp | Chữ | | "Giờ mở cửa mặc định 08:00 đến 20:00, nghỉ Chủ Nhật. Chỉnh sau khi tạo." |
| 5 | Lỗi chung | `Notice` loại danger, `role="alert"` | | Ẩn |
| 6 | Hủy, Thêm chi nhánh | Hai nút | | Thêm chi nhánh là nút chính |

| Khi | Xử lý |
|---|---|
| Bấm "Thêm chi nhánh" ở mục 6 | Kiểm trên máy trước, đặt con trỏ vào mục lỗi đầu tiên và không gọi API: mục 1 trống "Nhập tên chi nhánh."; mục 2 sai "Số điện thoại chưa đúng. Ví dụ: 028 3930 1234."; mục 3 trống "Nhập địa chỉ chi nhánh." Hết lỗi thì gọi API #2 |
| API trả 201 | Đóng hộp, hộp thông báo "Đã thêm {tên}.", chuyển tới MH-43 của chi nhánh mới |
| API trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo bằng `message` dưới mục có `field`: `name` là mục 1, `phone` là mục 2, `address` là mục 3 |
| API trả 409 `NAME_TAKEN` | Mục 1: "Đã có chi nhánh tên này." |
| API trả 403 `PLAN_LIMIT_REACHED` | Mục 5: "Gói {tên gói} chỉ cho {max} chi nhánh. Nâng gói để thêm chi nhánh." kèm link "Xem gói Sapio". Hộp giữ nguyên nội dung |

### Điện thoại

Bảng thành danh sách thẻ (mục 7): mỗi thẻ có tên, "{địa chỉ} · {n} nhân viên, {m} tài nguyên", nhãn "Đã ngừng dùng" nếu có, và mũi tên mở MH-43. Bộ lọc mục 6 nằm trên danh sách; nút mục 4 nằm ở đầu trang; hộp "Thêm chi nhánh" vẫn là hộp giữa màn.

## MH-43 Chi tiết chi nhánh

Một biểu mẫu, một thanh lưu cho cả ba thẻ (BR-93.8).

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Đường dẫn | Breadcrumb | | | Cài đặt › Chi nhánh › {tên} |
| 2 | Tiêu đề, dòng dưới | `h1`, chữ | | Tên chi nhánh; "Chi nhánh đầu tiên · {n} nhân viên, {m} tài nguyên" hoặc "{n} nhân viên, {m} tài nguyên" | Chi nhánh đã ngừng dùng: "Đã ngừng dùng" thay cho dòng này |
| 3 | Ngừng dùng chi nhánh | Nút phụ, góc phải đầu trang | | | Không hiện khi chi nhánh đã ngừng dùng. Mở hộp xác nhận |
| 4 | Dải chỉ đọc | `Notice` loại note | | Ẩn | Chi nhánh đã ngừng dùng: "Chi nhánh đã ngừng dùng. Bạn chỉ xem được." Mọi ô của biểu mẫu bị khóa, không có thanh lưu |
| | **Thẻ "Thông tin"** | | | | |
| 5 | Tên chi nhánh | Ô nhập | Có | Tên hiện tại | |
| 6 | Số điện thoại | Ô nhập `type="tel"` | Có | Số hiện tại, hiện dạng `028 3930 1234` | Gợi ý "Khách thấy số này khi không tự đổi, hủy được lịch (BR-08)." |
| 7 | Địa chỉ | Ô nhập | Có | Địa chỉ hiện tại | |
| 8 | Múi giờ | Ô chữ bị khóa (`disabled`, nền xám `--fill-tonal`, chữ mờ, con trỏ cấm), không có mũi tên chọn | | `Asia/Ho_Chi_Minh (GMT+7)` | Gợi ý "Mọi giờ trên trang khách và lịch theo múi giờ này." Không đổi được (BR-93.6) |
| | **Thẻ "Giờ mở cửa"** | | | | |
| 9 | Bảy dòng ngày, Thứ Hai đến Chủ Nhật | Bảng | Ít nhất một ngày mở | Giờ hiện tại | Mỗi dòng: tên ngày, các khung (hai ô giờ `HH:mm` và nút bỏ khung), ô tích "Nghỉ", nút "Thêm khung". Ngày nghỉ hiện "Nghỉ cả ngày". Tối đa 4 khung mỗi ngày: đủ 4 thì nút "Thêm khung" ẩn |
| 10 | Ghi chú thẻ | Chữ | | | "Mỗi ngày nhiều khung được, khung không chồng nhau (BR-02). Ca nhân viên có thể bắt đầu trước giờ mở cửa (BR-35)." |
| 11 | Dải lịch ngoài giờ | `Banner` loại warning | | Ẩn | **Áp dụng khi có lịch hẹn.** "{lý do} thì {n} lịch đã đặt nằm ngoài giờ mở cửa. Lưu thì {n} lịch này vào "Cần xếp lại" (BR-35). Lịch đã đặt giữ giá cũ." |
| | **Thẻ "Ngày đặc biệt"** | | | | |
| 12 | Thêm ngày | Nút nhỏ | | | Mở hộp "Thêm ngày đặc biệt" |
| 13 | Bảng ngày đặc biệt | Bảng | | Các ngày từ hôm nay | Cột Ngày (`dd/mm/yyyy`), Giờ (khung sửa được, hoặc "Đóng cửa" kèm "Thêm khung"; nút "Đóng cửa cả ngày"), Ghi chú, nút bỏ. Sắp theo ngày. Ngày đã qua không hiện (BR-93.14) |
| 14 | Rỗng | Chữ | | | "Chưa có ngày đặc biệt nào." |
| 15 | Ghi chú thẻ | Chữ | | | "Ngày đặc biệt thay giờ của ngày trong tuần đó. Đóng cửa ngày đã có lịch thì các lịch vào "Cần xếp lại". (Áp dụng khi có lịch hẹn.)" |
| 16 | Thanh lưu | `SaveBar` | | Ẩn khi chưa đổi | "Chưa lưu: {danh sách thay đổi}" với "Bỏ thay đổi" và "Lưu". Có lịch ngoài giờ thì nút thành "Lưu và xếp lại {n} lịch" |

Giá riêng của chi nhánh không có ở màn này; làm cùng Dịch vụ (MH-45).

### Hộp "Thêm ngày đặc biệt"

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Ngày | `type="date"` | Từ hôm nay trở đi |
| 2 | Giờ của ngày | Hai nút chọn "Đóng cửa" (mặc định), "Giờ khác" | "Giờ khác" hiện các khung như thẻ Giờ mở cửa, mặc định một khung 09:00–12:00 |
| 3 | Ghi chú | Ô nhập, không bắt buộc | |
| 4 | Hủy, Thêm ngày | Hai nút | "Thêm ngày" không bấm được khi còn lỗi |

Lỗi của mục 1 hiện ngay dưới ô: "Chọn ngày." / "Chọn ngày từ hôm nay trở đi." / "Ngày này đã có trong danh sách." Lỗi khung: "Nhập giờ dạng 09:00." / "Giờ đóng phải sau giờ mở." / "Các khung giờ không được chồng nhau (BR-02)." / "Thêm ít nhất một khung giờ."

### Xử lý

| Khi | Xử lý |
|---|---|
| Sửa mục 5 đến 7, 9, 12, 13 | Chưa gọi API; thanh lưu hiện và đếm thay đổi. Rời trang khi còn thay đổi hỏi "Rời trang này?" |
| Rời mục 5, 6, 7 | Hiện lỗi của mục: mục 5 trống "Nhập tên chi nhánh."; mục 6 sai "Số điện thoại chưa đúng. Ví dụ: 028 3930 1234."; mục 7 trống "Nhập địa chỉ." |
| Mục 9 | Lỗi dòng hiện dưới dòng đó khi có hơn một khung hoặc khi đã bấm Lưu: "Nhập giờ dạng 09:00." / "Giờ đóng phải sau giờ mở." / "Các khung giờ không được chồng nhau (BR-02)." Không ngày nào mở: dưới bảng "Chọn ít nhất một ngày mở cửa." Khung nối liền (đóng 12:00, mở 12:00) hợp lệ |
| Bấm "Lưu" (mục 16) | Còn lỗi thì không gọi API, con trỏ tới mục lỗi đầu tiên. Hết lỗi thì gọi API #4 với cả thông tin, giờ mở cửa và ngày đặc biệt |
| API trả 200 | Thanh lưu ẩn, hộp thông báo "Đã lưu chi nhánh. Thay đổi áp từ lúc này." (có `requeued` thì thêm "{n} lịch vào "Cần xếp lại"."). Hiện lại dữ liệu từ phản hồi |
| API trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo dưới mục có `field`: `name` là mục 5, `phone` là mục 6, `address` là mục 7, `openingHours` là dưới bảng mục 9, `openingHours.{i}.*` là dưới dòng ngày của khung `i`, `specialDays.{i}.*` là dưới dòng ngày đặc biệt thứ `i` |
| API trả 409 `NAME_TAKEN` | Mục 5: "Đã có chi nhánh tên này." Con trỏ vào mục 5 |
| API trả 409 `BRANCH_ARCHIVED` | Tải lại: hiện mục 4, khóa biểu mẫu |
| Bấm mục 3 | Hộp "Ngừng dùng {tên}?" với nội dung "Chi nhánh không nhận lịch mới và không dùng lại được. Tài nguyên và giờ mở cửa giữ nguyên." Nút "Ngừng dùng" (loại nguy hiểm) và "Quay lại"; còn thay đổi chưa lưu thì thêm "Thay đổi chưa lưu sẽ mất." Gọi API #5 |
| API #5 trả 200 | Đóng hộp, về MH-42 với hộp thông báo "Đã ngừng dùng {tên}." |
| API #5 trả 409 `LAST_BRANCH` | Trong hộp, `Notice` danger: "Đây là chi nhánh đang dùng cuối cùng. Cơ sở cần ít nhất một chi nhánh." Nút "Ngừng dùng" khóa |
| API #5 trả 409 `BRANCH_HAS_UPCOMING_APPOINTMENTS` | Trong hộp, `Notice` danger: "Còn {count} lịch sắp tới ở chi nhánh này. Đổi hoặc hủy các lịch đó trước." (**áp dụng khi có lịch hẹn**) |
| API #5 trả 409 `BRANCH_ARCHIVED` | Đóng hộp, tải lại như dòng `BRANCH_ARCHIVED` ở trên |

Mock: chi nhánh đầu tiên là chi nhánh mọi màn khác của mock đọc, nên khi cơ sở có chi nhánh khác thì hộp xác nhận của chi nhánh đầu tiên báo điều đó và nút "Ngừng dùng" không bấm được. Chi nhánh thêm ở MH-42 ngừng dùng được. Lịch, ca và dịch vụ của mock chỉ có chi nhánh đầu tiên; chi nhánh thêm hiện ở MH-42, MH-43 và MH-46.

### Điện thoại

Các thẻ xếp dọc. Bảng ở mục 9 và mục 13 cuộn ngang trong thẻ của nó. Thanh lưu nằm trên thanh điều hướng dưới. Hộp "Thêm ngày đặc biệt" và hộp xác nhận ngừng dùng là hộp giữa màn.

## MH-46 Tài nguyên

Màn chỉ liệt kê tài nguyên không phải nhân viên (BR-93.20). Mỗi loại một bảng, sắp theo thứ tự của loại; trong bảng sắp theo chi nhánh rồi thứ tự (BR-93.23).

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Đường dẫn | Breadcrumb | Cài đặt › Tài nguyên |
| 2 | Tiêu đề, dòng dưới | `h1`, chữ | "Tài nguyên"; "{tên các loại không phải nhân viên, nối bằng dấu phẩy} mà dịch vụ cần" |
| 3 | Loại tài nguyên | Nút phụ | Mở bảng bên "Loại tài nguyên" |
| 4 | Thêm tài nguyên | Nút chính | Mở hộp "Thêm tài nguyên" |
| 5 | Chi nhánh | Bộ lọc | Chỉ hiện khi cơ sở có từ hai chi nhánh đang dùng; lưu ở `?branch=` |
| 6 | Loại | Bộ lọc | Mọi loại không phải nhân viên; lưu ở `?type=` |
| 7 | Trạng thái | Bộ lọc | Nhãn khi bỏ lọc là "Đang dùng" và hiện hoạt động cùng đang bảo trì; các lựa chọn "Hoạt động", "Đang bảo trì", "Đã ngừng dùng". Tài nguyên của chi nhánh đã ngừng dùng thuộc "Đã ngừng dùng" (BR-93.9); lưu ở `?status=` |
| 8 | Bảng của một loại | `DataTable` | Tiêu đề "{tên loại} · {n}". Cột: Thứ tự (hai nút "Lên", "Xuống"), Tài nguyên (tên là nút mở hộp đổi tên), Chi nhánh, Trạng thái, Lịch 7 ngày tới, Thao tác |
| 9 | Trạng thái | Nhãn | "Hoạt động"; "Bảo trì đến {dd/mm}"; "Đã ngừng dùng". Khoảng tạm ngưng chưa bắt đầu hiện thêm một dòng "Ngưng {dd/mm hh:mm}–{hh:mm}" kèm nút "Bỏ" |
| 10 | Lịch 7 ngày tới | Số | "{n} lịch". **Áp dụng khi có lịch hẹn**; cột này ẩn cho tới khi có lịch hẹn |
| 11 | Thao tác | Nút | Hoạt động: "Tạm ngưng" và "Ngừng dùng". Đang bảo trì: "Mở lại" và "Ngừng dùng". Đã ngừng dùng: không có nút, hai nút thứ tự cũng ẩn |
| 12 | Chân bảng | Chữ | "{n} tài nguyên" |

Rỗng: lọc không khớp thì "Không có tài nguyên nào khớp." kèm nút "Bỏ lọc". Cơ sở chưa có tài nguyên nào không phải nhân viên: "Chưa có tài nguyên nào. Thêm ghế, giường, phòng mà dịch vụ cần." kèm nút "Thêm tài nguyên".

### Hộp "Thêm tài nguyên" và "Sửa {tên}"

| # | Mục | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| 1 | Tên | Ô nhập | Có | |
| 2 | Loại | Ô chọn | Có | Chỉ ở hộp thêm; mọi loại không phải nhân viên. Hộp sửa hiện loại ở dạng chữ, kèm "Loại và chi nhánh không đổi sau khi tạo." (BR-93.22) |
| 3 | Chi nhánh | Ô chọn | Có | Chỉ ở hộp thêm; chi nhánh đang dùng, mặc định chi nhánh đầu tiên (hoặc chi nhánh đang lọc) |
| 4 | Hủy, Thêm hoặc Lưu | Hai nút | | |

| Khi | Xử lý |
|---|---|
| Nhập mục 1 | Trống: "Nhập tên." Trùng một tài nguyên đang dùng cùng chi nhánh: "Tên này đã có." (kiểm trên máy, nút chính khóa) |
| Bấm "Thêm" | API #11 |
| Bấm "Lưu" | API #12 |
| API trả 201 hoặc 200 | Đóng hộp, hộp thông báo "Đã thêm {tên}." hoặc "Đã lưu {tên}." |
| API trả 400 `VALIDATION_FAILED` | `errors` báo dưới mục tương ứng: `name`, `resourceTypeId` là mục 2, `branchId` là mục 3 |
| API trả 409 `NAME_TAKEN` | Mục 1: "Tên này đã có." |
| API trả 409 `BRANCH_ARCHIVED` | Mục 3: "Chi nhánh này đã ngừng dùng." |
| API trả 409 `RESOURCE_ARCHIVED` | Đóng hộp, tải lại danh sách |

### Đổi thứ tự

| Khi | Xử lý |
|---|---|
| Bấm "Lên" hoặc "Xuống" ở một dòng | Đổi chỗ với dòng liền trên hoặc dưới **cùng chi nhánh** trong bảng của loại; dòng đầu không có "Lên", dòng cuối không có "Xuống" (khóa nút). Gọi API #13 với cả nhóm (chi nhánh, loại) theo thứ tự mới; trong lúc chờ hai nút của nhóm khóa |
| API trả 200 | Danh sách hiện thứ tự mới; không có hộp thông báo. Giữ tiêu điểm ở nút vừa bấm theo dòng đã đổi chỗ |
| API trả 409 `ORDER_MISMATCH` | Tải lại danh sách; hộp thông báo "Danh sách vừa đổi, hãy thử lại." |

### Bảng bên "Tạm ngưng {tên}"

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Từ, Đến | Hai ô `datetime-local` | Mặc định từ bây giờ đến 4 giờ sau. "Từ" trước bây giờ thì khoảng bắt đầu từ bây giờ (BR-93.24) |
| 2 | Lý do | Ô nhập | Bắt buộc |
| 3 | Lỗi | Chữ `role="status"` | "Chọn giờ bắt đầu và kết thúc." / "Giờ kết thúc phải sau giờ bắt đầu." / "Khoảng ngưng phải còn tới sau bây giờ." / "Nhập lý do." |
| 4 | Lịch bị ảnh hưởng | Danh sách | **Áp dụng khi có lịch hẹn.** Tiêu đề "{n} lịch dùng {tên} trong khoảng này" hoặc "Không có lịch nào dùng {tên} trong khoảng này"; mỗi lịch: giờ, khách, dịch vụ, người làm, và "{tài nguyên} trống" (tự chuyển, không báo khách) hoặc lý do không còn chỗ (vào "Cần xếp lại") |
| 5 | Hủy, Tạm ngưng | Hai nút | "Tạm ngưng, xếp lại {n} lịch" khi có lịch không còn chỗ. Khóa khi mục 3 còn lỗi |

| Khi | Xử lý |
|---|---|
| Bấm "Tạm ngưng" ở mục 11 | Mở bảng bên |
| Bấm nút chính | API #14 |
| API trả 201 | Đóng bảng, hộp thông báo "Đã tạm ngưng {tên}." (có lịch hẹn thì thêm "{moved} lịch tự chuyển, {requeued} lịch vào "Cần xếp lại"."). Trạng thái mục 9 đổi |
| API trả 400 `VALIDATION_FAILED` | `endsAt` hoặc `reason` báo ở mục 3 |
| API trả 409 `PAUSE_OVERLAP` | Mục 3: "Khoảng này chồng với một khoảng đã tạm ngưng." |
| API trả 409 `RESOURCE_ARCHIVED` | Đóng bảng, tải lại danh sách |
| Bấm "Mở lại" hoặc "Bỏ" ở mục 9 | API #15; 204 thì hộp thông báo "Đã mở lại {tên}." hoặc "Đã bỏ khoảng ngưng." |
| API #15 trả 409 `PAUSE_ENDED` | Tải lại danh sách |

### Hộp "Ngừng dùng {tên}?"

Nội dung: "Tài nguyên không nhận lịch mới và không dùng lại được. Lịch đã đặt xử lý như tạm ngưng (BR-93.27)." Dưới có danh sách lịch bị ảnh hưởng như mục 4 của bảng bên (**áp dụng khi có lịch hẹn**). Nút "Ngừng dùng" (loại nguy hiểm), "Quay lại". Gọi API #16.

| Khi | Xử lý |
|---|---|
| API trả 200 | Đóng hộp, hộp thông báo "Đã ngừng dùng {tên}." (có lịch hẹn thì thêm số lịch tự chuyển, số lịch vào "Cần xếp lại"). Dòng biến khỏi danh sách mặc định, còn ở bộ lọc "Đã ngừng dùng" |
| API trả 409 `RESOURCE_ARCHIVED` | Đóng hộp, tải lại danh sách |

### Bảng bên "Loại tài nguyên"

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Danh sách loại | Danh sách | Mỗi dòng: tên, "{n} tài nguyên" (đang dùng; thêm ", {m} đã ngừng dùng" khi có), nút "Đổi tên", nút "Xóa". Loại nhân viên có dấu khóa, dòng phụ "Loại có sẵn, không sửa, không xóa" và không có hai nút |
| 2 | Thêm loại | Ô nhập và nút "Thêm loại" | Gợi ý trong ô "Ví dụ: Bồn ngâm" |
| 3 | Đóng | Nút | |

| Khi | Xử lý |
|---|---|
| Bấm "Thêm loại" | Trống: "Nhập tên loại." Trùng một loại: "Đã có loại tên này." Hết lỗi thì API #7; 201 thì loại mới hiện cuối danh sách và ở bộ lọc Loại |
| Bấm "Đổi tên" | Tên thành ô nhập với "Lưu" và "Hủy"; lỗi như dòng trên. API #8 |
| Bấm "Xóa" | Loại còn tài nguyên, kể cả đã ngừng dùng, thì nút khóa, dòng phụ "Còn tài nguyên, không xóa được". Loại trống: hộp "Xóa loại {tên}?" với nút "Xóa" nguy hiểm. API #9 |
| API trả 409 `RESOURCE_TYPE_IN_USE` | Hộp thông báo "Còn {n} tài nguyên thuộc loại này, kể cả đã ngừng dùng, nên không xóa được." (có dịch vụ thì thêm "Dịch vụ {tên} đang dùng loại này.") |
| API trả 409 `NAME_TAKEN` | Dưới ô nhập: "Đã có loại tên này." |

### Điện thoại

Mỗi bảng thành danh sách thẻ: tên, "{chi nhánh} · {trạng thái} · {n} lịch", hai nút thứ tự và nút "Tạm ngưng" hoặc "Mở lại", "Ngừng dùng". Bảng bên Tạm ngưng và bảng bên Loại tài nguyên là bảng trượt từ dưới lên; các hộp là hộp giữa màn.
