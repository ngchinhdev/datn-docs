---
title: Dịch vụ (MH-44, MH-45)
description: Đặc tả hai màn Cài đặt của chủ cơ sở - danh sách dịch vụ với nhóm, thứ tự, bật tắt đặt online, ngừng dùng; chi tiết dịch vụ với biến thể, đoạn chiếm dụng, dọn dẹp, giá và giá riêng chi nhánh.
---

| | MH-44 Dịch vụ | MH-45 Chi tiết dịch vụ |
|---|---|---|
| Route | `/app/[tenant]/settings/services?group=&status=&q=` | `/app/[tenant]/settings/services/[id]?variant=` |
| Người dùng | Chủ cơ sở | Chủ cơ sở |
| Mock | `/mock/app/toc-may/settings/services` | `/mock/app/toc-may/settings/services/may-dye` |
| Bản vẽ | Mẫu danh sách (MH-08) | `design/screens/DichVuChiTiet.dc.html`, `design/screens/DichVuDienThoai.dc.html` |
| Mức | DS | Vẽ |

Nghiệp vụ: [Dịch vụ](../features/services.md). API: [Dịch vụ](../api/services.md). Khung chung (thanh bên, breadcrumb, thanh lưu) theo [Danh sách màn hình](./index.md) (MH-07 đến MH-09). Trạng thái rỗng, đang tải, lỗi tải và lỗi chung của các nút ghi (402, 403, 404, 429, mạng, 5xx) theo [Chi nhánh và tài nguyên](./branch-settings.md#trạng-thái-chung).

Cả hai màn nằm trong Cài đặt, chỉ chủ cơ sở mở được: vai trò khác thấy trang 403 trong khung, tài khoản không thuộc cơ sở thấy 404 (MH-10, BR-79). Gói hết hạn chuyển về Gói Sapio, cơ sở bị khóa chuyển về trang khóa (BR-94.2).

## Mock và web

Mock có thêm phần chưa thuộc bước này, giữ để duyệt luồng; web chưa làm các phần đó:

| Phần | Ở mock | Ở web |
|---|---|---|
| Giá theo cấp nhân viên (BR-56) | Có, ở thẻ Giá | Cùng Nhân sự (MH-47, MH-48) |
| "Ai làm được" (BR-03), cột "Người làm" ở danh sách, số người ở dòng dưới tiêu đề | Có | Cùng Nhân sự |
| "Đặt cọc khi đặt online" (BR-29) | Có | Giai đoạn 4; API chưa trả trường này |
| "Xem như khách" | Có | Khi có trang khách, giai đoạn 3 |
| "{n} lịch đã đặt giữ thời gian và giá cũ", ô "Lịch sắp tới dùng biến thể" | Có, đếm từ dữ liệu mẫu | **Áp dụng khi có lịch hẹn** |

## MH-44 Dịch vụ

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Đường dẫn | Breadcrumb | Cài đặt › Dịch vụ |
| 2 | Tiêu đề, dòng dưới | `h1`, chữ | "Dịch vụ"; "{n} dịch vụ đang dùng · {m} nhóm" |
| 3 | Nhóm dịch vụ | Nút phụ | Mở bảng bên "Nhóm dịch vụ" |
| 4 | Thêm dịch vụ | Nút chính | Mở hộp "Thêm dịch vụ" |
| 5 | Tìm dịch vụ | Ô tìm | Gợi ý "Tên dịch vụ"; lọc theo tên không phân biệt hoa thường và dấu (BR-94.15); lưu ở `?q=` |
| 6 | Nhóm | Bộ lọc | "Tất cả" (mặc định), từng nhóm, "Khác"; lưu ở `?group=` (`none` là "Khác") |
| 7 | Trạng thái | Bộ lọc | Nhãn khi bỏ lọc là "Đang dùng"; các lựa chọn "Đã ngừng dùng", "Tất cả"; lưu ở `?status=` |
| 8 | Bảng của một nhóm | `DataTable` | Tiêu đề "{tên nhóm} · {n}", nhóm theo thứ tự nhóm, "Khác" cuối. Cột: Thứ tự (hai nút "Lên", "Xuống"), Dịch vụ (tên là link tới MH-45; dịch vụ đã ngừng dùng có nhãn "Đã ngừng dùng"), Biến thể (số), Khách thấy (độ dài ngắn nhất đến dài nhất), Giá từ, Người làm (chỉ ở mock), Nhận đặt online (công tắc), Thao tác |
| 9 | Thao tác | Nút | Dịch vụ đang dùng: "Ngừng dùng". Đã ngừng dùng: "Dùng lại" |
| 10 | Chân bảng | Chữ | "{n} dịch vụ" |

Bảng của một nhóm không có dịch vụ nào khớp bộ lọc thì không hiện. Trong một nhóm, dịch vụ đang dùng đứng theo thứ tự, dịch vụ đã ngừng dùng (khi lọc "Tất cả") đứng sau chúng.

Nút "Lên", "Xuống" chỉ hiện ở dịch vụ đang dùng khi ô tìm trống, vì thứ tự tính trên cả nhóm. Dòng đầu của nhóm khóa "Lên", dòng cuối khóa "Xuống". Công tắc của dịch vụ đã ngừng dùng bị khóa.

Rỗng:

| Khi | Hiển thị |
|---|---|
| Cơ sở chưa có dịch vụ nào | "Chưa có dịch vụ nào. Thêm dịch vụ đầu tiên để khách đặt lịch." kèm nút "Thêm dịch vụ" |
| Bộ lọc không khớp | "Không có dịch vụ nào khớp." kèm nút "Bỏ lọc" |
| Lọc "Đã ngừng dùng" mà không có | "Chưa có dịch vụ nào ngừng dùng." |

### Xử lý

| Khi | Xử lý |
|---|---|
| Bật hoặc tắt công tắc "Nhận đặt online" | API #10 ngay. 200: hộp thông báo "{tên} nhận đặt online." hoặc "{tên} không còn hiện ở trang đặt lịch." Lỗi: công tắc về giá trị cũ, hộp thông báo theo bảng lỗi chung; 409 `SERVICE_ARCHIVED` thì tải lại danh sách |
| Bấm "Lên" hoặc "Xuống" | Đổi chỗ với dịch vụ đang dùng liền trên hoặc dưới trong nhóm. Gọi API #13 với cả nhóm theo thứ tự mới; trong lúc chờ nút của nhóm khóa. 200: danh sách hiện thứ tự mới, không hộp thông báo, tiêu điểm ở nút vừa bấm theo dòng đã đổi chỗ. 409 `ORDER_MISMATCH`: tải lại; hộp thông báo "Danh sách vừa đổi, hãy thử lại." |
| Bấm "Ngừng dùng" | Hộp "Ngừng dùng {tên}?" với nội dung "Dịch vụ không hiện ở trang khách và lễ tân không chọn được nữa. Biến thể, đoạn và giá giữ nguyên, dùng lại được." Nút "Ngừng dùng" và "Quay lại". Gọi API #11. 200: hộp thông báo "Đã ngừng dùng {tên}."; dòng biến khỏi danh sách mặc định, còn ở "Đã ngừng dùng". 409 `SERVICE_ARCHIVED`: đóng hộp, tải lại |
| Bấm "Dùng lại" | API #12, không hỏi lại. 200: hộp thông báo "Đã dùng lại {tên}." 409 `NAME_TAKEN`: hộp thông báo "Đã có dịch vụ đang dùng tên này. Đổi tên một trong hai dịch vụ rồi dùng lại." 409 `SERVICE_NOT_ARCHIVED`: tải lại |

### Hộp "Thêm dịch vụ"

| # | Mục | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| 1 | Tên dịch vụ | Ô nhập | Có | Tối đa 80 ký tự; gợi ý trong ô "Ví dụ: Cắt tóc" |
| 2 | Nhóm | Ô chọn | | "Không nhóm" và các nhóm; mặc định nhóm đang lọc, không lọc thì "Không nhóm" |
| 3 | Biến thể đầu tiên (tên) | Ô nhập | Có | Tối đa 40 ký tự; mặc định "Tiêu chuẩn". Gợi ý dưới ô "Thêm biến thể và chỉnh các đoạn ở trang chi tiết." |
| 4 | Giá | Ô nhập số, hậu tố ₫ | Có | Hiện `150.000`; 0 đến 100.000.000, bội của 1.000 |
| 5 | Thời lượng | Ô nhập số, hậu tố "phút" | Có | Mặc định 60; 5 đến 480, bội của 5. Gợi ý "Một đoạn Làm do nhân viên thực hiện." |
| 6 | Gợi ý của hộp | Chữ | | "Dịch vụ mới chưa nhận đặt online. Bật ở danh sách khi sẵn sàng." |
| 7 | Lỗi chung | `Notice` loại danger, `role="alert"` | | Ẩn |
| 8 | Hủy, Thêm dịch vụ | Hai nút | | Thêm dịch vụ là nút chính |

| Khi | Xử lý |
|---|---|
| Bấm "Thêm dịch vụ" | Kiểm trên máy trước, đặt con trỏ vào mục lỗi đầu tiên và không gọi API: mục 1 trống "Nhập tên dịch vụ."; mục 3 trống "Nhập tên biến thể."; mục 4 sai "Nhập giá từ 0 đến 100.000.000 ₫, bội của 1.000."; mục 5 sai "Nhập số phút từ 5 đến 480, bước 5." Hết lỗi thì gọi API #7 |
| API trả 201 | Đóng hộp, hộp thông báo "Đã thêm {tên}.", chuyển tới MH-45 của dịch vụ mới |
| API trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo dưới mục có `field`: `name` là mục 1, `groupId` là mục 2, `variant.name` là mục 3, `variant.priceVnd` là mục 4, `variant.minutes` là mục 5 |
| API trả 409 `NAME_TAKEN` | Mục 1: "Đã có dịch vụ tên này." |
| API trả 404 `NOT_FOUND` | Mục 7: "Nhóm này không còn. Chọn nhóm khác." và tải lại danh sách nhóm |

### Bảng bên "Nhóm dịch vụ"

| # | Mục | Loại | Ghi chú |
|---|---|---|---|
| 1 | Danh sách nhóm | Danh sách | Mỗi dòng: tên, "{n} dịch vụ" (đang dùng; thêm ", {m} đã ngừng dùng" khi có), hai nút "Lên", "Xuống", nút "Đổi tên", nút "Xóa". Dòng "Khác" ở cuối, dòng phụ "Dịch vụ không thuộc nhóm nào", không có nút nào |
| 2 | Thêm nhóm | Ô nhập và nút "Thêm nhóm" | Tối đa 60 ký tự; gợi ý trong ô "Ví dụ: Phục hồi" |
| 3 | Đóng | Nút | |

| Khi | Xử lý |
|---|---|
| Bấm "Thêm nhóm" | Trống: "Nhập tên nhóm." Trùng một nhóm hoặc là "Khác": "Đã có nhóm tên này." Hết lỗi thì API #2; 201 thì nhóm mới hiện cuối danh sách và ở bộ lọc Nhóm |
| Bấm "Đổi tên" | Tên thành ô nhập với "Lưu" và "Hủy"; lỗi như dòng trên. API #3 |
| Bấm "Lên" hoặc "Xuống" | API #5 với cả danh sách nhóm. Dòng đầu khóa "Lên", dòng cuối khóa "Xuống" |
| Bấm "Xóa" | Nhóm còn dịch vụ đang dùng thì nút khóa, dòng phụ "Còn dịch vụ đang dùng, không xóa được". Nhóm không còn: hộp "Xóa nhóm {tên}?" với nội dung "Dịch vụ đã ngừng dùng của nhóm này chuyển sang "Khác"." khi nhóm có dịch vụ đã ngừng dùng, nút "Xóa" (loại nguy hiểm) và "Quay lại". API #4 |
| API #4 trả 409 `SERVICE_GROUP_IN_USE` | Hộp thông báo "Còn {count} dịch vụ đang dùng trong nhóm này nên không xóa được." |
| API trả 409 `NAME_TAKEN` | Dưới ô nhập: "Đã có nhóm tên này." |

### Điện thoại

Bảng thành danh sách thẻ: tên, "{n} biến thể · {khách thấy} · từ {giá}", nhãn "Đã ngừng dùng" nếu có, công tắc "Nhận đặt online", hai nút thứ tự và nút "Ngừng dùng" hoặc "Dùng lại". Thẻ mở MH-45 khi bấm vào tên. Bộ lọc nằm trên danh sách; nút mục 4 nằm ở đầu trang; bảng bên "Nhóm dịch vụ" là bảng trượt từ dưới lên; hộp "Thêm dịch vụ" và hộp xác nhận là hộp giữa màn.

## MH-45 Chi tiết dịch vụ

Một biểu mẫu, một thanh lưu cho cả dịch vụ (BR-94.16). Máy tính chia hai cột: biểu mẫu bên trái, xem trước bên phải.

| # | Mục | Loại | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|---|
| 1 | Đường dẫn | Breadcrumb | | | Cài đặt › Dịch vụ › {tên} |
| 2 | Tiêu đề, dòng dưới | `h1`, chữ | | Tên dịch vụ; "{n} biến thể" | Dịch vụ đã ngừng dùng: "Đã ngừng dùng" thêm vào dòng dưới |
| 3 | Nhận đặt online | Công tắc | | Giá trị hiện tại | Lưu cùng cả biểu mẫu, không gọi API riêng |
| 4 | Ngừng dùng | Nút phụ, góc phải đầu trang | | | Không hiện khi dịch vụ đã ngừng dùng. Mở hộp xác nhận |
| 5 | Dải chỉ đọc | `Notice` loại note | | Ẩn | Dịch vụ đã ngừng dùng: "Dịch vụ đã ngừng dùng. Bạn chỉ xem được. Dùng lại để sửa." kèm nút "Dùng lại". Mọi ô bị khóa, không có thanh lưu |
| | **Thẻ "Thông tin chung"** | | | | |
| 6 | Tên dịch vụ | Ô nhập | Có | Tên hiện tại | Tối đa 80 ký tự |
| 7 | Nhóm | Ô chọn | | Nhóm hiện tại | "Không nhóm" và các nhóm. Gợi ý "Đổi nhóm thì dịch vụ đứng cuối nhóm mới." |
| 8 | Mô tả cho khách | Vùng nhập | Không | Mô tả hiện tại | Tối đa 500 ký tự; từ 450 ký tự hiện bộ đếm "{n}/500" |
| 9 | Đặt cọc khi đặt online | Ô nhập số, hậu tố ₫ | Không | | Chỉ ở mock |
| | **Thẻ "Biến thể"** | | | | |
| 10 | Thêm biến thể | Nút nhỏ | | | Khóa khi đã có 10 biến thể, kèm gợi ý "Tối đa 10 biến thể." |
| 11 | Cảnh báo thiếu tài nguyên | `Banner` loại warning | | Ẩn | Hiện khi có chi nhánh thiếu loại tài nguyên mà một biến thể cần (BR-94.30), mỗi dòng "Chi nhánh {X} không có {Y}, biến thể {Z} không đặt được ở đó." ({Y} nối nhiều loại bằng dấu phẩy) và link "Mở Tài nguyên" tới MH-46. Vẫn lưu được |
| 12 | Bảng biến thể | Bảng | Ít nhất một | | Cột: Biến thể (tên là link chọn biến thể đang sửa, dòng phụ "Đang sửa bên dưới"), Tên trên lịch, Khách thấy, Giá. Giá hiện giá gốc; khi có giá riêng chi nhánh hoặc theo cấp thì hiện khoảng thấp đến cao |
| 13 | Tên biến thể, Tên trên lịch | Hai ô nhập, trong khung "Tên của {biến thể}" dưới bảng | Có | Giá trị hiện tại | Tối đa 40 và 20 ký tự. Tên trùng biến thể khác: "Tên này đã có ở biến thể khác." Đầu khung có bốn nút cho biến thể đang sửa: "Lên", "Xuống", "Nhân bản", "Xóa biến thể" |
| | **Thẻ "Thời gian và tài nguyên · {biến thể}"** | | | | |
| 14 | Thêm đoạn | Nút nhỏ | | | Khóa khi đã có 8 đoạn, kèm gợi ý "Tối đa 8 đoạn." |
| 15 | Trục thời gian | `SegmentTimeline` | | Ví dụ hẹn 09:00 | Mỗi loại tài nguyên một hàng, thêm hàng "Khách thấy". Bấm một thanh thì chọn đúng dòng ở mục 16 và ngược lại |
| 16 | Bảng đoạn | `SegmentTable` | Ít nhất một đoạn Làm | | Cột: hai nút "Lên", "Xuống" (đoạn đầu khóa "Lên", đoạn cuối khóa "Xuống"), tên đoạn trên lịch, loại (Chuẩn bị, Làm, Chờ), phút, loại tài nguyên chiếm (nút bật tắt), nút xóa. Đoạn Chờ khóa các loại nhân viên. Xóa khóa khi chỉ còn một đoạn. Không kéo thả |
| 17 | Dọn dẹp sau khi dùng | Ô số theo từng loại | Không | 0 | Mỗi loại không phải nhân viên mà ít nhất một đoạn chiếm một ô, hậu tố "phút"; 0 đến 120, bước 5. 0 là không dọn: không gửi dòng dọn dẹp cho loại đó; 5 đến 120 bước 5 thì gửi. Gợi ý "bắt đầu ngay khi đoạn cuối dùng tài nguyên đó kết thúc" |
| | **Thẻ "Giá · {biến thể}"** | | | | |
| 18 | Giá gốc | Ô nhập số, hậu tố ₫ | Có | Giá hiện tại | 0 đến 100.000.000, bội của 1.000. Hiện `500.000` |
| 19 | Giá riêng chi nhánh | Bảng | Không | Trống | Hiện khi cơ sở có từ hai chi nhánh đang dùng, hoặc khi biến thể đang sửa đã có giá riêng ở một chi nhánh đang dùng (để còn thấy và bấm "Dùng giá gốc"). Mỗi chi nhánh đang dùng một dòng: tên, ô giá (trống là dùng giá gốc, gợi ý trong ô "Giá gốc {giá}"), nút "Dùng giá gốc" khi ô có giá (BR-94.29) |
| 20 | Giá theo cấp | Công tắc và bảng | | Tắt | Chỉ ở mock |
| | **Thẻ "Ai làm được"** | | | | Chỉ ở mock |
| 21 | Thanh lưu | `SaveBar` | | Ẩn khi chưa đổi | "{n} thay đổi chưa lưu" kèm, khi có lịch hẹn, " · {m} lịch đã đặt giữ thời gian và giá cũ (BR-12)"; hai nút "Bỏ thay đổi", "Lưu". Còn lỗi thì "Còn lỗi cần sửa trước khi lưu." và nút "Lưu" khóa |

Bên phải (máy tính), mỗi khối đổi theo biến thể đang sửa và theo bản nháp:

| Khối | Nội dung |
|---|---|
| "Trên lịch lễ tân" | Lịch nhỏ dựng từ các đoạn: cột nhân viên, cột từng loại tài nguyên, ví dụ hẹn 09:00; chú thích "Trong lúc chờ, {nhân viên} nhận được lịch ngắn khác." khi có đoạn Chờ |
| "Khách thấy" | Mỗi biến thể một dòng: tên, độ dài phần khách thấy, giá. Lấy giá thấp nhất khi giá khác nhau theo cấp |
| "Tóm tắt" | Mỗi loại tài nguyên: thời gian bận (kèm thời gian rảnh giữa chừng của nhân viên, kèm phần dọn dẹp); "Lịch sắp tới dùng biến thể" (**áp dụng khi có lịch hẹn**) |

### Kiểm trên máy

Lỗi hiện dưới ô của nó khi ô đã được chạm hoặc đã bấm "Lưu":

| Ô | Lỗi |
|---|---|
| Tên dịch vụ trống | "Nhập tên dịch vụ." |
| Tên biến thể trống | "Nhập tên biến thể." |
| Tên biến thể trùng | "Tên này đã có ở biến thể khác." (không phân biệt hoa thường và khoảng trắng thừa) |
| Tên trên lịch trống | "Nhập tên trên lịch." |
| Giá gốc, giá chi nhánh | "Nhập giá từ 0 đến 100.000.000 ₫, bội của 1.000." |
| Tên đoạn trống | "Nhập tên đoạn." |
| Số phút của đoạn | "Nhập số phút từ 5 đến 480, bước 5." |
| Chuẩn bị không ở đầu | "Chuẩn bị chỉ đứng đầu. Đưa đoạn này lên đầu hoặc đổi loại." |
| Chuẩn bị không có Làm ngay sau | "Sau đoạn Chuẩn bị phải là đoạn Làm." |
| Chờ không nằm giữa hai đoạn Làm | "Đoạn Chờ phải nằm giữa hai đoạn Làm." |
| Đoạn không chiếm loại nào | "Chọn ít nhất một loại tài nguyên." |
| Đoạn Làm không chiếm loại nhân viên | "Đoạn Làm cần {tên loại nhân viên}: mỗi lịch hẹn có một người làm." |
| Không có đoạn Làm | Dưới bảng đoạn: "Cần ít nhất một đoạn Làm: đó là lúc khách có mặt." |
| Phần khách thấy quá 8 giờ | Dưới bảng đoạn: "Phần khách thấy tối đa 8 giờ, hiện {x}." |
| Dọn dẹp | "Nhập số phút từ 0 đến 120, bước 5." Ô 0 là không dọn, không gửi dòng dọn dẹp cho loại đó (BR-94.28) |

### Xử lý

| Khi | Xử lý |
|---|---|
| Sửa bất kỳ ô nào | Chưa gọi API; thanh lưu hiện và đếm thay đổi. Rời trang khi còn thay đổi hỏi "Rời trang này?" |
| Bấm "Thêm biến thể" | Thêm biến thể "Biến thể mới" ở cuối, là bản chép của biến thể đang sửa (đoạn, dọn dẹp, giá gốc), và chọn nó |
| Bấm "Nhân bản" ở khung tên biến thể | Như "Thêm biến thể", tên "{tên} (bản sao)" cắt cho vừa 40 ký tự, "Tên trên lịch" "{tên trên lịch} 2" cắt cho vừa 20 ký tự. Không chép giá riêng chi nhánh |
| Bấm "Lên", "Xuống" của một đoạn | Đổi chỗ với đoạn liền trên hoặc dưới trong bản nháp; tiêu điểm ở nút vừa bấm theo đoạn đã đổi chỗ. Kiểm dãy đoạn chạy lại ngay (BR-94.23 đến 94.25) |
| Bấm "Lên", "Xuống" ở khung tên biến thể | Đổi chỗ trong bản nháp; thứ tự này là thứ tự khách thấy (BR-94.20) |
| Bấm "Xóa biến thể" | Bỏ khỏi bản nháp, không hỏi lại; biến thể bị ẩn khi lưu (BR-94.21). Khóa khi chỉ còn một biến thể |
| Bấm "Lưu" (mục 21) | Còn lỗi thì không gọi API, con trỏ tới mục lỗi đầu tiên. Hết lỗi thì gọi API #9 với cả dịch vụ |
| API trả 200 | Thanh lưu ẩn, hộp thông báo "Đã lưu {tên}." (**khi có lịch hẹn** thêm " {m} lịch đã đặt giữ thời gian và giá cũ."). Hiện lại dữ liệu từ phản hồi, biến thể mới đã có id |
| API trả 400 `VALIDATION_FAILED` | Mỗi phần tử của `errors` báo dưới ô có `field`: `name` là mục 6, `groupId` là mục 7, `description` là mục 8, `variants.{i}.name`, `.shortName` là mục 13 của biến thể `i`, `variants.{i}.priceVnd` là mục 18, `variants.{i}.segments` là dưới bảng đoạn, `variants.{i}.segments.{j}.*` là dòng `j` của bảng đoạn, `variants.{i}.cleanups.{k}.*` là ô dọn dẹp tương ứng, `variants.{i}.branchPrices.{k}.*` là dòng giá chi nhánh `k`. Biến thể `i` khác biến thể đang sửa thì chọn biến thể đó |
| API trả 409 `NAME_TAKEN` | Mục 6: "Đã có dịch vụ tên này." Con trỏ vào mục 6 |
| API trả 409 `SERVICE_ARCHIVED` | Tải lại: hiện mục 5, khóa biểu mẫu |
| API trả 409 `BRANCH_ARCHIVED` | Dưới ô giá của chi nhánh đó: "Chi nhánh {tên} đã ngừng dùng." |
| API trả 404 `NOT_FOUND` | Của `serviceId`: trang 404 trong khung. Còn lại hộp thông báo "Dữ liệu vừa đổi ở nơi khác, tải lại trang." |
| Bấm mục 4 | Hộp "Ngừng dùng {tên}?" với nội dung "Dịch vụ không hiện ở trang khách và lễ tân không chọn được nữa. Biến thể, đoạn và giá giữ nguyên, dùng lại được." Còn thay đổi chưa lưu thì thêm "Thay đổi chưa lưu sẽ mất." Gọi API #11 |
| API #11 trả 200 | Đóng hộp, về MH-44 với hộp thông báo "Đã ngừng dùng {tên}." |
| Bấm "Dùng lại" ở mục 5 | API #12. 200: hộp thông báo "Đã dùng lại {tên}.", trang hiện ở chế độ sửa. 409 `NAME_TAKEN`: `Notice` danger ở mục 5: "Đã có dịch vụ đang dùng tên này. Đổi tên một trong hai dịch vụ rồi dùng lại." |

### Giới hạn

Hỏi trước khi rời trang chỉ bắt link trong ứng dụng và việc đóng tab; không bắt nút Back của trình duyệt.

### Điện thoại

Tiêu đề nằm trong thanh trên cùng cùng nút quay về Dịch vụ. Các khối xếp dọc theo thứ tự: thẻ chọn biến thể (các tab), trục thời gian thu nhỏ (cột nhãn 44px), danh sách thẻ đoạn kèm "Thêm đoạn" và dọn dẹp, thẻ "Giá · {biến thể}" với nút "Sửa giá", "Thông tin chung", "Biến thể", "Ai làm được" (mock). Bấm một đoạn mở bảng trượt từ dưới lên để đưa đoạn lên hoặc xuống ("Lên", "Xuống"), sửa tên, loại, phút, loại tài nguyên chiếm, hoặc xóa đoạn. "Sửa giá" mở bảng trượt có giá gốc, giá riêng chi nhánh (khi mục 19 hiện) và giá theo cấp (mock). Cảnh báo thiếu tài nguyên (mục 11) hiện trong thẻ "Biến thể" như ở máy tính. Thanh lưu nằm trên thanh điều hướng dưới. Xem trước bên phải không có; trục thu nhỏ thay cho nó.
