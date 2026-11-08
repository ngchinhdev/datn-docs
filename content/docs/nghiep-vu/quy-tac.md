---
title: Quy tắc nghiệp vụ
description: Bảng quy tắc nghiệp vụ BR-xx của phạm vi đồ án. Tài liệu sống; mỗi BR có test tương ứng.
---

**Cách dùng bảng này**

- Mỗi quy tắc có mã cố định. Không đánh lại mã khi xóa; quy tắc bỏ đi ghi "(đã bỏ, lý do...)".
- Test của một quy tắc đặt tên bắt đầu bằng mã, ví dụ `it('BR-05: đoạn chờ giải phóng nhân viên nhưng vẫn giữ ghế', ...)`.
- Các chữ cái X, Y, N, M, K trong quy tắc là tham số **cấu hình theo cơ sở**, có giá trị mặc định trong gói cấu hình ngành.
- Quy tắc lấy từ [Phân tích nghiệp vụ gốc](./phan-tich-goc.md), đã lọc theo phạm vi đồ án ([D-04](../du-an/quyet-dinh.md#d-04-cắt-phạm-vi-cho-một-người-làm)).

## Đặt lịch

| Mã | Quy tắc |
|---|---|
| BR-01 | Không có hai đoạn trạng thái `hold`/`active` chồng nhau trên cùng một tài nguyên |
| BR-02 | Giờ trống chỉ nằm trong giờ mở cửa của chi nhánh; ngày đặc biệt ưu tiên hơn giờ thường lệ |
| BR-03 | Nhân viên chỉ được xếp cho dịch vụ thuộc kỹ năng của mình |
| BR-04 | Thời gian chuẩn bị và dọn dẹp chiếm dụng tài nguyên như thời gian làm |
| BR-05 | Đoạn "chờ" giải phóng nhân viên nhưng vẫn chiếm phòng/ghế/lồng sấy theo cấu hình dịch vụ |
| BR-06 | Không cho đặt sớm hơn X giờ và xa hơn Y ngày so với hiện tại (cấu hình) |
| BR-07 | Giữ chỗ tồn tại tối đa 10 phút; hết hạn thì tự trả lại |
| BR-08 | Khách tự đổi/hủy phải trước tối thiểu X giờ; tự đổi tối đa N lần mỗi lịch |
| BR-09 | Quá giờ hẹn M phút mà chưa check-in thì đánh dấu "không đến" |
| BR-10 | Không đến K lần trong 6 tháng thì lần sau bắt buộc đặt cọc |
| BR-11 | Duyệt nghỉ phép phải xử lý xong mọi lịch bị ảnh hưởng; khách chọn đích danh phải được hỏi ý trước khi đổi người |
| BR-12 | Lịch đã đặt giữ giá tại thời điểm đặt dù sau đó giá dịch vụ thay đổi (thời lượng cũng vậy, xem BR-59) |
| BR-13 | Biến thể dịch vụ (giá, thời lượng) được chọn theo thuộc tính của đối tượng được phục vụ |
| BR-14 | Khi khách chọn nhân viên: "Bất kỳ ai" đứng đầu và được chọn sẵn (hệ thống xếp người theo BR-57); chỉ liệt kê nhân viên nhận đặt online và có kỹ năng làm dịch vụ đã chọn (BR-03); người kín lịch trong ngày đang xem vẫn hiện nhưng làm mờ, ghi "Hết giờ ngày này"; chọn một người thì giờ trống lọc theo lịch người đó |
| BR-15 | Trang khách chỉ hiện hồ sơ công khai của nhân viên: tên hiển thị, ảnh (không có thì chữ cái đầu), chức danh, thế mạnh, giờ trống sớm nhất. Họ tên đầy đủ, mã nhân viên, số điện thoại chỉ hiện trong khu quản trị |
| BR-16 | Khách xác nhận lịch bằng mã 6 số gửi qua **email**. Số điện thoại vẫn bắt buộc, làm thông tin liên hệ cho cơ sở, không dùng để xác thực. Mã hết hạn sau X phút; nhập sai N lần thì phải gửi mã mới (cấu hình) |
| BR-17 | Đối tượng được phục vụ đã lưu (ví dụ thú cưng) chỉ hiện khi khách đã có phiên, tức đã xác thực OTP tại cơ sở đó trước đây. Chưa có phiên thì khách khai đối tượng mới ngay trong luồng đặt lịch |

## Cấu hình dịch vụ và giờ trống

Chi tiết và ví dụ tính tay ở [Thuật toán tính giờ trống](../ky-thuat/thuat-toan-gio-trong.md).

| Mã | Quy tắc |
|---|---|
| BR-50 | Một biến thể dịch vụ là dãy đoạn liên tiếp; mỗi đoạn có loại **Chuẩn bị**, **Làm** hoặc **Chờ**, thời lượng và các loại tài nguyên bị chiếm. Đoạn Chuẩn bị chỉ đứng đầu. Đoạn Chờ không chiếm nhân viên (BR-05) |
| BR-51 | Khách thấy giờ hẹn là đầu đoạn Làm đầu tiên, giờ xong là cuối đoạn Làm cuối cùng; đoạn Chờ ở giữa tính vào. Chuẩn bị nằm trước giờ hẹn, dọn dẹp sau giờ xong, khách không thấy hai phần này nhưng chúng vẫn chiếm tài nguyên (BR-04) |
| BR-52 | Dọn dẹp khai theo **từng loại tài nguyên** của biến thể ("dọn ghế 10 phút sau khi dùng"); bắt đầu ngay khi đoạn cuối dùng loại đó kết thúc, không chờ cả dịch vụ xong |
| BR-53 | Một mục lịch hẹn dùng **cùng một tài nguyên** cho mỗi loại từ đầu đến cuối (cùng thợ, cùng ghế) |
| BR-54 | Phần khách thấy nằm trong giờ mở cửa (BR-02). Tài nguyên không phải nhân viên chỉ dùng trong giờ mở cửa, nên dọn dẹp cũng phải xong trước giờ đóng. Nhân viên dùng được trong ca, nên chuẩn bị được phép trước giờ mở cửa |
| BR-55 | Mỗi dịch vụ chọn biến thể theo một trong hai cách: **khách tự chọn**, hoặc **tự động theo thuộc tính** của đối tượng được phục vụ (BR-13). Với cách thứ hai, mọi đối tượng hợp lệ theo schema của ngành khớp đúng một biến thể; thiếu hoặc trùng điều kiện thì không lưu được |
| BR-56 | Biến thể có thể đặt **giá theo cấp nhân viên**. Khách chọn đích danh trả giá cấp của người đó; "Bất kỳ ai" trả giá cấp thấp nhất trong số người làm được dịch vụ, hệ thống xếp ai cũng giữ giá đó |
| BR-57 | Phân công "Bất kỳ ai": nhân viên cấp thấp nhất trước, hòa thì người ít phút bận nhất trong ngày, hòa nữa theo thứ tự danh sách. Tài nguyên khác chọn theo thứ tự (Ghế 1 trước Ghế 2) |
| BR-58 | Trang khách chỉ hiện giờ trên lưới g phút theo đồng hồ địa phương (mặc định 15, cấu hình theo chi nhánh). Lễ tân xếp được giờ lệch lưới nếu mọi ràng buộc vẫn đúng |
| BR-59 | Sửa đoạn, thời lượng, giá hay dọn dẹp chỉ áp cho lịch đặt sau khi lưu; lịch đã đặt giữ thời gian và giá cũ |

## Thanh toán, ví, gói

| Mã | Quy tắc |
|---|---|
| BR-20 | Mọi thay đổi số dư phải qua bút toán; không có thao tác sửa số dư |
| BR-21 | Mỗi khoản thanh toán chỉ được ghi nhận một lần theo `idempotency_key` |
| BR-22 | Thứ tự giảm giá: giá gốc → khuyến mãi tự động → voucher (tối đa 1) |
| BR-23 | Hoàn cọc mặc định: hủy trước 24h hoàn 100%, 4–24h hoàn 50%, dưới 4h hoặc không đến hoàn 0% (cấu hình được) |
| BR-24 | Cơ sở chủ động hủy thì luôn hoàn cọc 100% |
| BR-25 | Rút tiền ví chỉ hoàn phần tiền thật còn lại, không hoàn tiền tặng |
| BR-26 | Doanh thu gói ghi nhận theo từng buổi sử dụng |
| BR-27 | Hoàn gói = giá gói − (số buổi đã dùng × giá lẻ tại thời điểm mua) − phí hủy; âm thì bằng 0 |
| BR-28 | Hoàn tiền bắt buộc ghi lý do và cần quyền quản lý; kéo theo thu hồi hoa hồng và hoàn buổi gói |

## Hoa hồng

| Mã | Quy tắc |
|---|---|
| BR-40 | Hoa hồng tính trên giá trị thực thu sau giảm giá (mặc định) |
| BR-41 | Quy tắc mới chỉ áp cho dịch vụ hoàn thành từ ngày hiệu lực |
| BR-42 | Kỳ đã chốt không thay đổi; điều chỉnh phát sinh ghi vào kỳ mở kế tiếp |
| BR-43 | Nhiều nhân viên cùng làm thì chia theo tỉ lệ cấu hình của dịch vụ |

## Dữ liệu, bảo mật, cấu hình ngành

| Mã | Quy tắc |
|---|---|
| BR-60 | Cùng số điện thoại ở hai khách thuê là hai hồ sơ độc lập |
| BR-61 | Số điện thoại được chuẩn hóa (`0912...` và `+84912...` là một) |
| BR-62 | Ghi chú nội bộ không bao giờ hiển thị cho khách |
| BR-63 | Thao tác nhạy cảm (hoàn tiền, xuất danh sách khách, đổi giá) được ghi nhật ký |
| BR-64 | Khách đồng ý xử lý dữ liệu cá nhân khi đặt lịch lần đầu; đồng ý nhận quảng cáo là lựa chọn riêng |
| BR-70 | Gói cấu hình ngành chỉ được nạp khi tạo tenant; sau đó mọi chỉnh sửa thuộc về tenant, không ảnh hưởng gói gốc. Gói có bản nháp và các bản đã xuất bản; cơ sở mới nhận bản đang xuất bản lúc tạo, sửa hay xuất bản bản mới không đổi cơ sở đã tạo |
| BR-71 | Thuộc tính của đối tượng được phục vụ phải hợp lệ theo schema của ngành trước khi lưu |
| BR-72 | Slug của cơ sở (cũng là tên miền con, T-16): chữ thường không dấu, số, gạch ngang, 3–40 ký tự, không bắt đầu hoặc kết thúc bằng gạch ngang, duy nhất trên nền tảng, không trùng từ dành riêng (`www`, `app`, `admin`, `api`, `mail`, `status`, `blog`, `cdn`, `signup`, `login`, `logout`, `invite`, `verify-email`, `forgot-password`, `reset-password`, `select-workspace`, `docs`, `mock`, `help`, `about`, `terms`, `privacy`, `static`, `assets`). Đổi slug thì link cũ tự chuyển sang slug mới |
| BR-73 | Mật khẩu nhân sự theo NIST SP 800-63B-4: tối thiểu 15 ký tự, tối đa ít nhất 64; không ép trộn loại ký tự; nhận mọi ký tự (kể cả dấu cách, tiếng Việt có dấu); so với danh sách mật khẩu phổ biến hoặc đã lộ, trùng thì phải chọn mật khẩu khác; không bắt đổi định kỳ; cho dán, có nút hiện/ẩn |
| BR-74 | Mỗi email đã xác thực chỉ tạo được một cơ sở dùng thử. Đăng ký và gửi mã xác thực bị giới hạn số lần theo email và theo IP |
| BR-75 | Quản trị nền tảng khóa hoặc mở khóa cơ sở vi phạm bất kỳ lúc nào, kèm lý do; bị khóa thì khu quản trị và trang đặt lịch đều dừng, không phụ thuộc gói. Mọi lần khóa, mở khóa, gia hạn thủ công ghi vào nhật ký |

---

## Gói Sapio và dùng thử

Quyết định ở [D-15](../du-an/quyet-dinh.md#d-15-dùng-thử-7-ngày-và-hai-gói-sapio-thay-cho-duyệt-tay). Thanh toán qua cổng giả lập (D-09).

| Mã | Quy tắc |
|---|---|
| BR-80 | Cơ sở mới dùng thử **7 ngày**, tính cả ngày tạo, hết lúc 23:59 ngày thứ 7 theo giờ của chi nhánh đầu tiên |
| BR-81 | Trong dùng thử: dùng được mọi tính năng của gói Chuyên nghiệp để **cấu hình** (dịch vụ, tài nguyên, nhân sự, ca, chính sách, thương hiệu) và xem thử trang đặt lịch (chỉ người đã đăng nhập của cơ sở, gắn `noindex`). **Không** nhận đặt lịch online và **không** tạo được lịch hẹn |
| BR-82 | Hết dùng thử mà chưa kích hoạt, hoặc hết kỳ đã trả mà chưa gia hạn: tài khoản **chỉ còn trang Gói Sapio** (và đăng xuất); trang đặt lịch ngừng nhận khách. Trang Gói Sapio hiện chỉ để đọc các lịch hẹn đã đặt sau thời điểm hết hạn (giờ, khách, số điện thoại, dịch vụ, nhân viên) để cơ sở báo khách. Khách vẫn xem và hủy được lịch của mình. Không xóa dữ liệu |
| BR-83 | Có hai gói, giá và tính năng là **dữ liệu** do quản trị nền tảng cấu hình. Mặc định: **Cơ bản** 199.000 ₫/tháng (1 chi nhánh; không có gói liệu trình và ví, hoa hồng, báo cáo đầy đủ, chatbot) và **Chuyên nghiệp** 399.000 ₫/tháng (không giới hạn chi nhánh, đủ tính năng). Không giới hạn nhân viên và lịch hẹn ở cả hai gói |
| BR-84 | Mua theo kỳ 1, 3 hoặc 12 tháng; 3 tháng giảm 10%, 12 tháng giảm 20%, làm tròn tới nghìn đồng. Gói tính từ lúc thanh toán thành công; ngày dùng thử còn lại không cộng thêm |
| BR-85 | **Nâng gói** có hiệu lực ngay, trả phần chênh = (giá tháng gói mới − giá tháng gói cũ) × số ngày còn lại của kỳ / 30, làm tròn lên tới nghìn đồng; ngày hết kỳ giữ nguyên. **Hạ gói** có hiệu lực từ kỳ sau, và chỉ chọn được khi cơ sở đang nằm trong giới hạn của gói thấp (ví dụ còn 1 chi nhánh hoạt động) |
| BR-86 | Nhắc hết hạn qua email cho chủ cơ sở trước 3 ngày, trước 1 ngày và lúc hết hạn; dải báo trong khu quản trị từ khi còn 3 ngày (cả khi đang dùng thử) |
| BR-87 | Tính năng không có trong gói: API từ chối bằng Problem Details mã `plan-feature-required`; giao diện hiện ổ khóa và trang giải thích kèm nút nâng cấp, không ẩn hẳn. Dữ liệu cũ của tính năng đó (khi hạ gói) giữ nguyên ở chế độ chỉ đọc |
| BR-88 | Kích hoạt hoặc gia hạn chỉ được ghi nhận một lần cho mỗi giao dịch, dù webhook gửi lặp; khoản thu ghi vào sổ của nền tảng, chỉ thêm không sửa (quy tắc 6) |

## Tình huống đặc biệt phải có test

| Tình huống | Xử lý | BR liên quan |
|---|---|---|
| Hai khách cùng bấm đặt giờ cuối cùng trong một giây | Đúng 1 người thành công, người kia nhận lỗi kèm gợi ý giờ gần nhất | BR-01, BR-07 |
| Khách thanh toán xong nhưng giữ chỗ đã hết hạn | Giờ còn trống thì xác nhận; đã có người đặt thì tự tạo yêu cầu hoàn tiền | BR-07, BR-21 |
| Đồng hồ chạy qua 23:59:59 ngày thứ 7 của dùng thử | Từ 00:00:00 mọi trang trừ Gói Sapio bị chuyển hướng, API nghiệp vụ trả 402/403; kiểm bằng `Clock` giả, không chờ job | BR-80, BR-82 |
| Webhook kích hoạt gói gửi 3 lần | Một kỳ gói, một bút toán | BR-88 |
| Nâng gói khi còn 22 ngày | Trả thêm 147.000 ₫ (200.000 × 22/30 làm tròn lên), ngày hết kỳ không đổi | BR-85 |
| Hạ gói khi đang có 3 chi nhánh | Không cho chọn, báo phải tạm dừng bớt chi nhánh | BR-85 |
| Cổng thanh toán báo kết quả hai lần | Chỉ ghi nhận một lần | BR-21 |
| Dịch vụ kéo dài quá giờ, lấn sang lịch sau | Cảnh báo lễ tân, gợi ý chuyển lịch sau cho nhân viên khác | BR-01 |
| Đổi giá dịch vụ khi đã có lịch đặt trước | Lịch cũ giữ giá cũ | BR-12 |
| Đổi quy tắc hoa hồng giữa tháng | Quy tắc mới chỉ áp từ ngày hiệu lực | BR-41 |
| Hoàn tiền sau khi kỳ hoa hồng đã chốt | Bút toán âm vào kỳ mở kế tiếp | BR-42, BR-28 |
| Nhân viên nghỉ đột xuất, đã có lịch trong ngày | Liệt kê lịch bị ảnh hưởng; khách chọn đích danh được hỏi ý | BR-11 |
| Gói liệu trình hết hạn khi khách còn lịch đặt trước | Cảnh báo khi đặt; đến ngày, lễ tân chọn gia hạn hoặc tính giá lẻ | BR-26 |
| Cùng số điện thoại đặt ở hai cơ sở khác nhau | Hai hồ sơ độc lập, không cơ sở nào thấy của nhau | BR-60 |
| Một khách đặt cho hai thú cưng cùng lúc | Đặt nhóm, mỗi bé là một đối tượng được phục vụ | BR-13 |
| Thợ có lịch cắt nằm trọn trong đoạn chờ lên màu của khách nhuộm | Cả hai lịch hợp lệ; lịch cắt phải ở ghế khác (VD3 của BT1) | BR-05, BR-53 |
| Lịch nhuộm cuối buổi sáng mà 10 phút dọn ghế lấn qua giờ đóng cửa | Không hiện giờ đó (VD5) | BR-52, BR-54 |
| Chỉ có một bồn tắm, bé trước đang sấy | Bé sau vào bồn ngay khi rửa bồn xong, không chờ bé trước sấy xong (VD8) | BR-52 |
| Khách để "Bất kỳ ai" nhưng chỉ thợ cấp cao còn rảnh | Xếp thợ cấp cao, khách vẫn trả giá cấp thấp nhất (VD10) | BR-56, BR-57 |
| Giữ chỗ đã hết hạn nhưng job dọn chưa chạy | Giờ đó vẫn hiện là trống (VD9) | BR-07 |
| Sửa thời lượng nhuộm khi đã có 6 lịch đặt trước | 6 lịch giữ thời lượng và giá cũ | BR-59 |
| Hai biến thể Tắm sấy cùng khớp chó 10 kg | Không cho lưu, báo biến thể nào trùng | BR-55 |

## Câu hỏi nghiệp vụ còn mở

Ghi các điểm chưa rõ ở đây; chốt xong thì chuyển thành BR.

- Giữ chỗ 10 phút có áp dụng cho lễ tân đặt tại quầy không, hay chỉ cho trang công khai?
- Khi khách chọn "bất kỳ ai", có cho lễ tân đổi người sau khi đã xác nhận mà không báo khách không?
- Hoa hồng của dịch vụ trả bằng buổi trong gói tính trên giá một buổi của gói hay giá lẻ hiện hành? (Phân tích gốc: giá một buổi của gói.)
