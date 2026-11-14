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
| BR-02 | Giờ trống chỉ nằm trong giờ mở cửa của chi nhánh; ngày đặc biệt ưu tiên hơn giờ thường lệ. Một ngày có nhiều khung, không chồng nhau. Đổi giờ mở cửa hay thêm ngày đóng cửa mà có lịch nằm ngoài giờ mới thì lưu xong các lịch đó vào "Cần xếp lại" (BR-35), giữ giá. Chi nhánh có giá riêng cho từng biến thể; để trống là giá chung, giá theo cấp (BR-56) tính trên giá của chi nhánh |
| BR-03 | Nhân viên chỉ được xếp cho dịch vụ thuộc kỹ năng của mình |
| BR-04 | Thời gian chuẩn bị và dọn dẹp chiếm dụng tài nguyên như thời gian làm |
| BR-05 | Đoạn "chờ" giải phóng nhân viên nhưng vẫn chiếm phòng/ghế/lồng sấy theo cấu hình dịch vụ |
| BR-06 | Không cho đặt sớm hơn X giờ và xa hơn Y ngày so với hiện tại (cấu hình) |
| BR-07 | Giữ chỗ tồn tại tối đa 10 phút; hết hạn thì tự trả lại |
| BR-08 | Khách tự đổi/hủy phải trước tối thiểu X giờ; tự đổi tối đa N lần mỗi lịch. Khách chỉ đổi giờ hoặc hủy **cả lịch**; bỏ một dịch vụ trong chuỗi hay một người trong nhóm thì qua tiệm. Quá hạn tự đổi thì trang hiện số điện thoại cơ sở. "Chọn lại giờ" khi trả lời đề nghị đổi người (BR-32, BR-33) không tính vào N lần |
| BR-09 | Quá giờ hẹn M phút mà chưa check-in thì đánh dấu "không đến" |
| BR-10 | Không đến K lần trong 6 tháng thì lần sau bắt buộc đặt cọc |
| BR-11 | Duyệt nghỉ phép phải xử lý xong mọi lịch bị ảnh hưởng; khách chọn đích danh phải được hỏi ý trước khi đổi người. Cách xử lý từng lịch: BR-34. Đơn đang chờ duyệt đã chặn đặt lịch mới với người đó trong khoảng xin nghỉ (trang khách và lễ tân); đơn bị từ chối thì mở lại |
| BR-12 | Lịch đã đặt giữ giá tại thời điểm đặt dù sau đó giá dịch vụ thay đổi (thời lượng cũng vậy, xem BR-59) |
| BR-13 | Biến thể dịch vụ (giá, thời lượng) được chọn theo thuộc tính của đối tượng được phục vụ |
| BR-14 | Khi khách chọn nhân viên: "Bất kỳ ai" đứng đầu và được chọn sẵn (hệ thống xếp người theo BR-57); chỉ liệt kê nhân viên nhận đặt online và có kỹ năng làm dịch vụ đã chọn (BR-03); người kín lịch trong ngày đang xem vẫn hiện nhưng làm mờ, ghi "Hết giờ ngày này"; chọn một người thì giờ trống lọc theo lịch người đó |
| BR-15 | Trang khách chỉ hiện hồ sơ công khai của nhân viên: tên hiển thị, ảnh (không có thì chữ cái đầu), chức danh, thế mạnh, giờ trống sớm nhất. Họ tên đầy đủ, mã nhân viên, số điện thoại chỉ hiện trong khu quản trị |
| BR-16 | Khách xác nhận lịch bằng mã 6 số gửi qua **email**. Số điện thoại vẫn bắt buộc, làm thông tin liên hệ cho cơ sở, không dùng để xác thực. Mã hết hạn sau X phút; nhập sai N lần thì phải gửi mã mới (cấu hình). Đăng nhập trang khách cũng bằng mã email; phiên riêng cho từng cơ sở; email chưa có lịch vẫn đăng nhập được |
| BR-17 | Đối tượng được phục vụ đã lưu (ví dụ thú cưng) chỉ hiện khi khách đã có phiên, tức đã xác thực OTP tại cơ sở đó trước đây. Chưa có phiên thì khách khai đối tượng mới ngay trong luồng đặt lịch. Không xóa được đối tượng còn lịch sắp tới; sửa thuộc tính không đổi giá và thời lượng của lịch đã đặt (BR-12) |
| BR-18 | **Chuỗi dịch vụ:** một lịch online có tối đa 4 dịch vụ cho cùng một đối tượng, làm lần lượt theo thứ tự khách xếp. Dịch vụ sau bắt đầu ngay khi phần khách thấy của dịch vụ trước kết thúc (BR-51); nếu cùng một người làm và dịch vụ sau có đoạn Chuẩn bị thì khách chờ thêm đúng đoạn đó. Khách chọn một người cho cả chuỗi hoặc chọn riêng từng dịch vụ; "Bất kỳ ai" xếp từng dịch vụ theo BR-57, cùng cấp thì ưu tiên người làm dịch vụ trước. Giá, cọc là tổng của từng mục (BR-56) |
| BR-19 | **Đặt nhóm:** một lịch online cho tối đa 4 đối tượng (người đi cùng hoặc nhiều thú cưng), mỗi đối tượng một dịch vụ, cùng giờ bắt đầu; mỗi loại tài nguyên phải là tài nguyên khác nhau (khác người làm, khác ghế). Không có giờ chung thì gợi ý giờ lệch nhau, các mục bắt đầu cách nhau không quá 60 phút, xếp theo giờ xong sớm nhất. Người đi cùng chỉ cần tên; một người đặt, một mã OTP, một email xác nhận cho cả nhóm |

## Vận hành lịch: lễ tân, ca, nghỉ phép

| Mã | Quy tắc |
|---|---|
| BR-30 | Lễ tân tạo lịch tại quầy hoặc qua điện thoại: không giữ chỗ, lịch xác nhận ngay. Không áp BR-06 (đặt trước X giờ, xa nhất Y ngày), vẫn áp mọi ràng buộc tài nguyên (BR-01 đến BR-05, BR-50 đến BR-54). Được đặt giờ lệch lưới (BR-58). Khách vãng lai không cần số điện thoại, ghi tên "Khách lẻ" |
| BR-31 | Mỗi mục lịch hẹn ghi khách **chọn đích danh** hay **"Bất kỳ ai"**. Trên trang khách, chọn một người ở bước chọn thợ là đích danh. Lễ tân tạo lịch thì mặc định "Bất kỳ ai", kể cả khi bấm từ cột của một người; tick "Khách yêu cầu đích danh" mới tính là đích danh |
| BR-32 | Đổi giờ, đổi người bằng kéo thả: lịch "Bất kỳ ai" đổi ngay, có Hoàn tác 5 giây. Lịch đích danh mà đổi sang người khác thì hỏi lại; mặc định gửi email báo khách kèm nút "Đồng ý" và "Chọn lại giờ". Khách chưa trả lời thì lịch vẫn đổi và mang dấu "Chưa xác nhận đổi người". Giá giữ nguyên (BR-12). Tài nguyên cũ bận ở giờ mới thì hệ thống chọn tài nguyên khác cùng loại |
| BR-33 | Khi phải hỏi ý khách (đổi người, nghỉ phép), hạn trả lời là 24 giờ sau khi gửi nhưng không muộn hơn 2 giờ trước giờ hẹn. Quá hạn thì lễ tân gọi điện; hệ thống không tự hủy lịch |
| BR-34 | Lịch bị ảnh hưởng (nghỉ phép, bớt ca) xử lý theo cách khách đã chọn: "Bất kỳ ai" thì đổi sang người khác cùng giờ; đích danh thì hỏi ý (BR-33); không ai trống thì dời giờ hoặc hủy và báo khách, cơ sở hủy thì hoàn cọc 100% (BR-24). Đơn nghỉ chỉ duyệt được khi mọi lịch đã có cách xử lý; lúc duyệt, hệ thống kiểm lại từng cách, cách nào không còn hợp lệ thì lịch đó trở về "chưa xử lý". Bớt ca thì ca mới lưu ngay, các lịch vướng vào "Cần xếp lại" (BR-35) |
| BR-35 | Ca làm có thể có nhiều khung trong một ngày và được bắt đầu trước giờ mở cửa (để chuẩn bị, BR-54). Bớt ca mà còn lịch thì các lịch đó vào danh sách "Cần xếp lại" và xử lý theo BR-34. Khoảng giờ mở cửa không có ai trực thì màn Xếp ca cảnh báo |
| BR-37 | Tạm ngưng tài nguyên (bảo trì) theo khoảng giờ, có lý do. Lịch dùng tài nguyên đó trong khoảng ngưng: còn tài nguyên cùng loại trống thì tự chuyển, không báo khách; không còn thì vào "Cần xếp lại" (BR-35) |
| BR-38 | Sửa cấu hình chỉ áp từ lúc lưu: chính sách áp cho lịch đặt sau đó; giá, số buổi của gói áp cho gói bán sau đó; ngừng bán gói không ảnh hưởng gói khách đã mua |
| BR-36 | Kỹ thuật viên chỉ thấy lịch của mình, kể cả đoạn chuẩn bị, và tự cập nhật Bắt đầu, Xong. Số điện thoại khách ẩn với kỹ thuật viên, trừ khi cơ sở bật "Kỹ thuật viên thấy số điện thoại khách" ở Chính sách (mặc định tắt) |

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
| BR-21 | Mỗi khoản thanh toán chỉ được ghi nhận một lần theo `idempotency_key`. Thu tiền nhiều phương thức: tổng các khoản phải đúng bằng số còn phải thu mới ghi được. Tiền mặt nhập tiền khách đưa, tự tính tiền thối. Chuyển khoản hiện QR, tự ghi khi cổng báo; đóng hộp QR không hủy mã. Thu xong hóa đơn khóa, sửa bằng hoàn tiền |
| BR-22 | Thứ tự tính hóa đơn: giá theo lịch (BR-12) → dùng buổi gói (dòng thành 0) → giảm giá → trừ cọc → còn phải thu. Giảm giá chỉ là giảm tay (phần trăm hoặc số tiền), cần quyền quản lý và lý do, ghi nhật ký (BR-63). Không có khuyến mãi tự động và voucher trong phạm vi đồ án. Bán lẻ là dòng nhập tay (tên, số lượng, đơn giá), không quản lý kho. Cọc lớn hơn số phải trả thì phần thừa vào ví thành tiền thật, ghi một bút toán |
| BR-23 | Hoàn cọc mặc định: hủy trước 24h hoàn 100%, 4–24h hoàn 50%, dưới 4h hoặc không đến hoàn 0% (cấu hình được) |
| BR-24 | Cơ sở chủ động hủy thì luôn hoàn cọc 100% |
| BR-25 | Rút tiền ví chỉ hoàn phần tiền thật còn lại, không hoàn tiền tặng. Trả bằng ví thì trừ tiền thật trước, tiền tặng sau. Tiền tặng khi nạp theo mức cấu hình (mặc định nạp từ 1.000.000 ₫ tặng 10%). Rút tiền thật chỉ quản lý hoặc chủ cơ sở làm được |
| BR-26 | Doanh thu gói ghi nhận theo từng buổi sử dụng: giá gói chia số buổi, buổi cuối nhận phần lẻ. Người làm buổi đó có hoa hồng trên doanh thu này (BR-40); hoàn buổi thì thu hồi đúng phần đó |
| BR-27 | Hoàn gói = giá gói − (số buổi đã dùng × giá lẻ tại thời điểm mua) − phí hủy; âm thì bằng 0 |
| BR-28 | Hoàn tiền bắt buộc ghi lý do và cần quyền quản lý; kéo theo thu hồi hoa hồng (vào kỳ của ngày duyệt hoàn, BR-42) và hoàn buổi gói. Yêu cầu tạo từ hóa đơn, chọn khoản đã trả; tiền hoàn về đúng phương thức của khoản đó (ví về ví, giữ tỉ lệ tiền thật, tiền tặng), không vượt số đã thu trừ số đã hoàn. Cọc đã trừ vào dịch vụ đã làm thì hoàn qua khoản khác |
| BR-29 | Giữ chỗ khi trả cọc vẫn là 10 phút tính từ lúc chọn giờ (BR-07); sang trang trả cọc không cộng thêm. Tiền cọc về sau khi hết giữ chỗ: giờ còn trống thì vẫn xác nhận; đã có người đặt thì hệ thống tự hoàn đủ, không cần quản lý duyệt (khác BR-28), và gợi ý giờ gần nhất |

## Hoa hồng

| Mã | Quy tắc |
|---|---|
| BR-40 | Hoa hồng tính trên số thực thu của từng dòng hóa đơn sau giảm giá (giảm tay chia cho các dòng theo tỉ lệ giá trị). Dòng dùng buổi gói tính trên doanh thu của buổi đó (BR-26). Dòng bán lẻ tính cho người ghi ở dòng đó lúc thu tiền, mặc định là người làm dịch vụ đầu tiên của hóa đơn, để trống thì không ai có. Bán gói, nạp ví là tiền trả trước, không có hoa hồng |
| BR-41 | Quy tắc hoa hồng gồm phạm vi (mọi dịch vụ, một dịch vụ, hoặc bán lẻ), cấp nhân viên (một cấp hoặc mọi cấp), tỉ lệ % và ngày hiệu lực (không trước hôm nay). Mỗi dòng dùng quy tắc cụ thể nhất đang hiệu lực vào ngày thu tiền hóa đơn: dịch vụ và cấp > dịch vụ > mọi dịch vụ và cấp > mọi dịch vụ. Quy tắc mới chỉ áp cho hóa đơn thu từ ngày hiệu lực, không tính lại dòng cũ. Thêm, sửa quy tắc ghi nhật ký (BR-63) |
| BR-42 | Kỳ hoa hồng theo tháng dương lịch, giờ của chi nhánh. Khoản hoa hồng ghi vào kỳ của ngày thu tiền; khoản thu hồi do hoàn tiền ghi vào kỳ của ngày duyệt hoàn, theo đúng tỉ lệ đã tính cho dòng gốc. Chủ cơ sở chốt kỳ bằng tay sau khi tháng kết thúc; hết tháng 7 ngày chưa chốt thì Tổng quan nhắc. Kỳ đã chốt không thay đổi, chốt kỳ ghi nhật ký |
| BR-43 | (đã bỏ 14/11/2026: mỗi mục lịch chỉ có một người làm, như BT1; dịch vụ cần hai nhân viên nằm trong câu hỏi còn mở của ERD) |
| BR-44 | Nhân viên chỉ xem được hoa hồng của chính mình: tạm tính của kỳ đang mở, từng dòng và khoản thu hồi. Tên khách không kèm số điện thoại (BR-36). Quy tắc, các kỳ và hoa hồng của người khác chỉ chủ cơ sở xem (cột hoa hồng tạm tính của báo cáo cho cả quản lý) |

## Báo cáo

Số liệu tính theo ngày giờ của chi nhánh, lọc theo chi nhánh và khoảng ngày; ô số so với khoảng liền trước cùng độ dài.

| Mã | Quy tắc |
|---|---|
| BR-45 | **Doanh thu thực hiện** = dòng dịch vụ và bán lẻ của hóa đơn đã thu (sau giảm giá, theo ngày thu) + doanh thu buổi gói đã dùng (BR-26), trừ hoàn tiền của các dòng đó vào ngày duyệt hoàn. Cọc bị giữ khi khách không đến hay hủy muộn không tính vào đây, hiện riêng ở ô Không đến |
| BR-46 | **Tiền thu vào** = mọi khoản tiền về qua tiền mặt, chuyển khoản, thẻ, cổng (gồm cọc, bán gói, nạp ví), trừ tiền đã hoàn ra. Trả bằng ví hay buổi gói không phải tiền vào. **Tiền trả trước còn giữ** (cuối khoảng) = doanh thu các buổi gói chưa dùng + tiền thật trong ví; tiền tặng không tính |
| BR-47 | **Lấp đầy** = phút nhân viên bận cho khách (đoạn Chuẩn bị và Làm của lịch không bị hủy, BR-05) ÷ phút trong ca sau nghỉ phép đã duyệt; đoạn Chờ không tính. **Không đến** = số lịch "không đến" ÷ số lịch đã tới giờ, không tính lịch đã hủy; kèm giá trị lịch mất và tiền cọc giữ lại |

## Dữ liệu, bảo mật, cấu hình ngành

| Mã | Quy tắc |
|---|---|
| BR-60 | Cùng số điện thoại ở hai khách thuê là hai hồ sơ độc lập |
| BR-61 | Số điện thoại được chuẩn hóa (`0912...` và `+84912...` là một) |
| BR-62 | Ghi chú nội bộ không bao giờ hiển thị cho khách |
| BR-63 | Thao tác nhạy cảm (thu tiền, giảm giá, hoàn tiền, rút ví, xuất danh sách khách, đổi giá, chính sách, quyền, duyệt nghỉ, việc hệ thống tự làm như bật bắt buộc cọc) được ghi nhật ký: giờ, người, thao tác, đối tượng, chi tiết. Nhật ký chỉ thêm, giữ 12 tháng |
| BR-64 | Khách đồng ý xử lý dữ liệu cá nhân khi đặt lịch lần đầu; đồng ý nhận quảng cáo là lựa chọn riêng, mặc định tắt. Đổi email đăng nhập phải nhập mã gửi tới email mới |
| BR-65 | Màu nhấn của cơ sở phải đạt tương phản 4,5 : 1 với chữ trắng, không đạt thì không lưu được. Đổi đường dẫn trang đặt lịch thì đường dẫn cũ chuyển hướng 90 ngày |
| BR-66 | Email mã xác nhận, đã đặt lịch, đổi giờ, hủy, hoàn cọc, hỏi ý đổi người là bắt buộc; cơ sở chỉ tắt được email nhắc trước 24 giờ và 2 giờ. Email gửi qua outbox, lỗi thì thử lại 3 lần |
| BR-67 | Chatbot có giới hạn lượt theo khách mỗi ngày và cả cơ sở mỗi tháng; hết lượt thì mời khách gọi tiệm hoặc đặt trên trang. Chatbot chỉ nói giá, giờ lấy từ hệ thống |
| BR-70 | Gói cấu hình ngành chỉ được nạp khi tạo tenant; sau đó mọi chỉnh sửa thuộc về tenant, không ảnh hưởng gói gốc. Gói có bản nháp và các bản đã xuất bản; cơ sở mới nhận bản đang xuất bản lúc tạo, sửa hay xuất bản bản mới không đổi cơ sở đã tạo |
| BR-71 | Thuộc tính của đối tượng được phục vụ phải hợp lệ theo schema của ngành trước khi lưu |
| BR-72 | Slug của cơ sở (cũng là tên miền con, T-16): chữ thường không dấu, số, gạch ngang, 3–40 ký tự, không bắt đầu hoặc kết thúc bằng gạch ngang, duy nhất trên nền tảng, không trùng từ dành riêng (`www`, `app`, `admin`, `api`, `mail`, `status`, `blog`, `cdn`, `signup`, `login`, `logout`, `invite`, `verify-email`, `forgot-password`, `reset-password`, `select-workspace`, `docs`, `mock`, `help`, `about`, `terms`, `privacy`, `static`, `assets`). Đổi slug thì link cũ tự chuyển sang slug mới |
| BR-73 | Mật khẩu nhân sự theo NIST SP 800-63B-4: tối thiểu 15 ký tự, tối đa ít nhất 64; không ép trộn loại ký tự; nhận mọi ký tự (kể cả dấu cách, tiếng Việt có dấu); so với danh sách mật khẩu phổ biến hoặc đã lộ, trùng thì phải chọn mật khẩu khác; không bắt đổi định kỳ; cho dán, có nút hiện/ẩn |
| BR-74 | Mỗi email đã xác thực chỉ tạo được một cơ sở dùng thử. Đăng ký và gửi mã xác thực bị giới hạn số lần theo email và theo IP |
| BR-75 | Quản trị nền tảng khóa hoặc mở khóa cơ sở vi phạm bất kỳ lúc nào, kèm lý do; bị khóa thì khu quản trị và trang đặt lịch đều dừng, không phụ thuộc gói. Mọi lần khóa, mở khóa, gia hạn thủ công ghi vào nhật ký |
| BR-76 | Đăng nhập nhân sự: sai email hoặc mật khẩu thì báo một câu chung, không cho biết email có tài khoản hay không. Sai **5 lần liên tiếp** với một email thì tạm khóa đăng nhập email đó **15 phút** và gửi email báo chủ tài khoản; từ lần sai thứ 3 báo số lần còn lại. Email không có tài khoản cũng đếm và báo y hệt (không gửi email). Đặt lại mật khẩu (BR-77) mở khóa ngay. Không chọn "Giữ đăng nhập" thì phiên hết khi đóng trình duyệt hoặc sau 12 giờ; chọn thì phiên giữ 30 ngày tính từ lần dùng gần nhất |
| BR-77 | Quên mật khẩu: luôn báo cùng một câu dù email có tài khoản hay không. Link đặt lại dùng **một lần**, hết hạn sau **30 phút**; gửi lại được sau 60 giây, link mới làm link cũ hết hiệu lực. Mật khẩu mới theo BR-73. Đặt xong thì thu hồi mọi phiên khác của tài khoản, mở tạm khóa (BR-76) và đăng nhập vào cơ sở dùng gần nhất |
| BR-78 | Lời mời nhân sự: chủ cơ sở mời được Quản lý, Lễ tân, Kỹ thuật viên; quản lý chỉ mời Lễ tân và Kỹ thuật viên. Lời mời gắn một email, một vai trò, một chi nhánh hoặc tất cả; link dùng một lần, hết hạn sau **7 ngày** tính từ lúc gửi. Gửi lại tạo link mới, link cũ hết hiệu lực; thu hồi thì link báo đã thu hồi. Không mời email đã là thành viên của cơ sở. Email đang có lời mời chờ nhận ở cơ sở đó thì không tạo lời mời thứ hai, dùng Gửi lại; lời mời đã hết hạn hoặc đã thu hồi thì mời mới được. Quản lý chỉ gửi lại, thu hồi lời mời của vai mình mời được. Nhận lời mời: email chưa có tài khoản thì tạo tài khoản (mật khẩu BR-73, email coi như đã xác thực); đã có tài khoản thì đăng nhập đúng email đó, đang đăng nhập email khác phải đăng xuất trước. Mỗi tài khoản có **một vai trò** ở mỗi cơ sở. Kỹ thuật viên luôn nhận khách trên lịch; quản lý, lễ tân chọn được. Người mới nhận khách có cột lịch với hồ sơ trống, chưa có kỹ năng nên chưa nhận khách được (BR-03). Gửi, gửi lại, thu hồi, nhận lời mời ghi nhật ký (BR-63) |
| BR-79 | Vào cơ sở và trang lỗi: tài khoản thuộc một cơ sở thì vào thẳng; thuộc nhiều cơ sở thì qua trang Chọn cơ sở, cơ sở dùng gần nhất có nhãn; mỗi tab mở một cơ sở (đường dẫn có slug). Cơ sở hết hạn gói (BR-82): chủ cơ sở chỉ vào trang Gói Sapio, nhân viên thấy cơ sở ở trạng thái "Tạm dừng", không vào được. Cơ sở bị khóa (BR-75): chủ cơ sở thấy lý do và thời điểm khóa, nhân viên thấy cùng trang nhưng không kèm lý do và thời điểm khóa. Trang khách của cơ sở bị khóa hoặc hết hạn chỉ báo tạm dừng, không nói lý do; khách vẫn xem và hủy được lịch đã đặt. Mở trang ngoài quyền thì báo "Không có quyền" ngay trong khung, API trả 403 Problem Details. Lỗi máy chủ hiện mã lỗi lấy từ `instance` của Problem Details. Mất kết nối realtime thì hiện dải báo trên lịch; vẫn tạo, sửa được, hệ thống kiểm trùng khi lưu; nối lại thì tải lịch mới |

---

## Gói Sapio và dùng thử

Quyết định ở [D-15](../du-an/quyet-dinh.md#d-15-dùng-thử-7-ngày-và-hai-gói-sapio-thay-cho-duyệt-tay). Thanh toán qua cổng giả lập (D-09).

| Mã | Quy tắc |
|---|---|
| BR-80 | Cơ sở mới dùng thử **7 ngày**, tính cả ngày tạo, hết lúc 23:59 ngày thứ 7 theo giờ của chi nhánh đầu tiên |
| BR-81 | Trong dùng thử: dùng được mọi tính năng của gói Chuyên nghiệp để **cấu hình** (dịch vụ, tài nguyên, nhân sự, ca, chính sách, thương hiệu) và xem thử trang đặt lịch (chỉ người đã đăng nhập của cơ sở, gắn `noindex`). **Không** nhận đặt lịch online và **không** tạo được lịch hẹn |
| BR-82 | Hết dùng thử mà chưa kích hoạt, hoặc hết kỳ đã trả mà chưa gia hạn: tài khoản **chỉ còn trang Gói Sapio** (và đăng xuất); trang đặt lịch ngừng nhận khách. Trang Gói Sapio hiện chỉ để đọc các lịch hẹn đã đặt sau thời điểm hết hạn (giờ, khách, số điện thoại, dịch vụ, nhân viên) để cơ sở báo khách. Khách vẫn xem và hủy được lịch của mình. Không xóa dữ liệu |
| BR-83 | Có hai gói, giá và tính năng là **dữ liệu** do quản trị nền tảng cấu hình. Mặc định: **Cơ bản** 199.000 ₫/tháng (1 chi nhánh; không có gói liệu trình và ví, hoa hồng, báo cáo đầy đủ, chatbot) và **Chuyên nghiệp** 399.000 ₫/tháng (không giới hạn chi nhánh, đủ tính năng). Không giới hạn nhân viên và lịch hẹn ở cả hai gói. Quản trị nền tảng sửa được tên, giá tháng, dòng mô tả, số chi nhánh tối đa và tính năng của mỗi gói, cùng % giảm theo kỳ (BR-84); không thêm, không xóa gói. Đổi giá hoặc % giảm chỉ áp cho lần thanh toán sau, kỳ đã trả giữ giá cũ. Bật thêm tính năng có hiệu lực ngay; tắt tính năng hoặc giảm số chi nhánh thì phải xác nhận, kèm số cơ sở bị ảnh hưởng, dữ liệu cũ chỉ đọc (BR-87). Mỗi lần lưu ghi nhật ký nền tảng |
| BR-84 | Mua theo kỳ 1, 3 hoặc 12 tháng; 3 tháng giảm 10%, 12 tháng giảm 20%, làm tròn tới nghìn đồng. Gói tính từ lúc thanh toán thành công; ngày dùng thử còn lại không cộng thêm |
| BR-85 | **Nâng gói** có hiệu lực ngay, trả phần chênh = (giá tháng gói mới − giá tháng gói cũ) × số ngày còn lại của kỳ / 30, làm tròn lên tới nghìn đồng; ngày hết kỳ giữ nguyên. **Hạ gói** có hiệu lực từ kỳ sau, và chỉ chọn được khi cơ sở đang nằm trong giới hạn của gói thấp (ví dụ còn 1 chi nhánh hoạt động) |
| BR-86 | Nhắc hết hạn qua email cho chủ cơ sở trước 3 ngày, trước 1 ngày và lúc hết hạn; dải báo trong khu quản trị từ khi còn 3 ngày (cả khi đang dùng thử) |
| BR-87 | Tính năng không có trong gói: API từ chối bằng Problem Details mã `plan-feature-required`; giao diện hiện ổ khóa và trang giải thích kèm nút nâng cấp, không ẩn hẳn. Dữ liệu cũ của tính năng đó (khi hạ gói) giữ nguyên ở chế độ chỉ đọc |
| BR-88 | Kích hoạt hoặc gia hạn chỉ được ghi nhận một lần cho mỗi giao dịch, dù webhook gửi lặp; khoản thu ghi vào sổ của nền tảng, chỉ thêm không sửa (quy tắc 6) |
| BR-89 | Quản trị nền tảng chỉ thấy **số tổng** của một cơ sở: số chi nhánh, thành viên, lịch hẹn, khách đã lưu, thanh toán gói, lần đăng nhập gần nhất của chủ cơ sở. Không mở được lịch, khách, hóa đơn của cơ sở và không có đường tắt qua RLS; muốn xem thì chủ cơ sở mời vào như thành viên (BR-78). Trạng thái gói chỉ có Dùng thử, Đang dùng, Hết hạn; bị khóa (BR-75) là cờ riêng, cơ sở bị khóa vẫn giữ gói và hạn |
| BR-90 | Khóa cơ sở (BR-75) phải có lý do ít nhất 20 ký tự; chủ cơ sở thấy lý do trên trang khóa (BR-79) và nhận email kèm lý do. Trong lúc khóa, gói vẫn chạy, không cộng bù ngày; khóa nhầm thì mở khóa rồi gia hạn thủ công (BR-91). Mở khóa cũng phải có lý do (chỉ quản trị thấy) và email báo chủ cơ sở |
| BR-91 | Gia hạn thủ công: thêm 7, 14, 30 ngày hoặc số ngày khác, tối đa **90 ngày** mỗi lần, giữ gói hiện tại. Gói đã hết hạn thì tính từ hôm nay (hôm nay là ngày thứ nhất); còn hạn thì nối vào ngày cuối cũ; đang dùng thử thì kéo dài dùng thử. Lý do bắt buộc, chỉ quản trị thấy. Không tạo khoản thu trong sổ của nền tảng (BR-88) |
| BR-92 | Trợ lý đặt lịch trên trang khách (BT7). **Hiện** khi cơ sở bật chatbot và gói có tính năng chatbot (dùng thử có); không hiện khi trang tạm dừng (BR-79, BR-82); ẩn ở các bước Thông tin liên hệ, Xác nhận, Trả cọc của luồng đặt lịch. **Số liệu:** giá, thời lượng, cọc, giờ trống chỉ hiện trong thẻ lấy từ hệ thống, có dòng nguồn; câu chữ của trợ lý không tự viết số; giá tùy đối tượng thì hỏi lại thuộc tính (BR-13); giờ trống theo BR-06, BR-14. **Phạm vi:** một dịch vụ cho một người hoặc một đối tượng; nhiều dịch vụ, đặt nhóm, đổi giờ, hủy lịch thì đưa link sang trang đặt lịch hoặc Lịch của tôi. **Giữ chỗ:** chọn giờ trong thẻ thì giữ chỗ 10 phút (BR-07) rồi sang bước Thông tin liên hệ của luồng đặt lịch, đã điền dịch vụ, giờ, thợ; lịch chỉ tạo khi nhập đúng mã email (BR-16), trợ lý không tự đặt lịch. Mỗi khung chat giữ tối đa một chỗ, giữ giờ khác thì trả giờ cũ; hết 10 phút thì báo và đưa giờ còn trống. **Gặp lễ tân:** câu ngoài phạm vi, khách bấm "Gặp lễ tân", hoặc không hiểu hai lần liền thì hiện số điện thoại và giờ mở cửa của chi nhánh (ngoài giờ thì nói giờ mở lại); không có chat trực tiếp với lễ tân. **Lượt (BR-67):** một lượt là một câu khách gửi, kể cả bấm gợi ý; bấm nút trong thẻ không tính. Đếm theo khách khi có phiên, chưa có thì theo trình duyệt; lượt ngày tính lại lúc 00:00 giờ chi nhánh. Hết lượt khách hoặc lượt tháng của cơ sở thì khóa ô nhập, hiện "Đặt trên trang" và "Gọi", không gọi AI. **Lưu:** cuộc trò chuyện còn khi đóng mở khung và tải lại trang trong ngày; lưu 30 ngày để đếm lượt và làm bộ đánh giá BT7; chủ cơ sở chưa có màn đọc lại |

## Tình huống đặc biệt phải có test

| Tình huống | Xử lý | BR liên quan |
|---|---|---|
| Hai khách cùng bấm đặt giờ cuối cùng trong một giây | Đúng 1 người thành công, người kia nhận lỗi kèm gợi ý giờ gần nhất | BR-01, BR-07 |
| Khách thanh toán xong nhưng giữ chỗ đã hết hạn | Giờ còn trống thì xác nhận; đã có người đặt thì tự hoàn đủ, gợi ý giờ gần nhất | BR-07, BR-21, BR-29 |
| Đồng hồ chạy qua 23:59:59 ngày thứ 7 của dùng thử | Từ 00:00:00 mọi trang trừ Gói Sapio bị chuyển hướng, API nghiệp vụ trả 402/403; kiểm bằng `Clock` giả, không chờ job | BR-80, BR-82 |
| Webhook kích hoạt gói gửi 3 lần | Một kỳ gói, một bút toán | BR-88 |
| Nâng gói khi còn 22 ngày | Trả thêm 147.000 ₫ (200.000 × 22/30 làm tròn lên), ngày hết kỳ không đổi | BR-85 |
| Hạ gói khi đang có 3 chi nhánh | Không cho chọn, báo phải tạm dừng bớt chi nhánh | BR-85 |
| Cổng thanh toán báo kết quả hai lần | Chỉ ghi nhận một lần | BR-21 |
| Dịch vụ kéo dài quá giờ, lấn sang lịch sau | Cảnh báo lễ tân, gợi ý chuyển lịch sau cho nhân viên khác | BR-01 |
| Đổi giá dịch vụ khi đã có lịch đặt trước | Lịch cũ giữ giá cũ | BR-12 |
| Đổi quy tắc hoa hồng giữa tháng | Quy tắc mới chỉ áp từ ngày hiệu lực | BR-41 |
| Hoàn tiền sau khi kỳ hoa hồng đã chốt | Bút toán âm vào kỳ của ngày duyệt hoàn, kỳ cũ giữ nguyên | BR-42, BR-28 |
| Nhuộm có quy tắc "Thợ chính 12% từ 01/12", Mai (thợ chính) nhuộm 30/11 và 01/12 | Hóa đơn 30/11 tính 10%, hóa đơn 01/12 tính 12% | BR-41 |
| Khách mua gói 5 buổi 350.000 ₫ rồi dùng 1 buổi trong tuần | Tiền thu vào 350.000 ₫; doanh thu thực hiện 70.000 ₫; trả trước còn giữ 280.000 ₫ | BR-45, BR-46 |
| Nhân viên nghỉ đột xuất, đã có lịch trong ngày | Liệt kê lịch bị ảnh hưởng; khách chọn đích danh được hỏi ý | BR-11 |
| Gói liệu trình hết hạn khi khách còn lịch đặt trước | Cảnh báo khi đặt; đến ngày, lễ tân chọn gia hạn hoặc tính giá lẻ | BR-26 |
| Cùng số điện thoại đặt ở hai cơ sở khác nhau | Hai hồ sơ độc lập, không cơ sở nào thấy của nhau | BR-60 |
| Chị Hà trả 200.000 ₫ bằng ví khi ví có 150.000 ₫ tiền thật và 100.000 ₫ tiền tặng | Trừ 150.000 ₫ tiền thật rồi 50.000 ₫ tiền tặng; còn 50.000 ₫ tiền tặng, không rút được | BR-25 |
| Hoàn khoản trả bằng ví 200.000 ₫ | Trả lại vào ví 150.000 ₫ tiền thật, 50.000 ₫ tiền tặng | BR-28 |
| Lễ tân bấm Thu hai lần liền | Chỉ một khoản được ghi | BR-21 |
| Một khách đặt cho hai thú cưng cùng lúc | Đặt nhóm, mỗi bé là một đối tượng được phục vụ | BR-13, BR-19 |
| Hai bé cùng giờ mà chỉ còn một lồng sấy rảnh | Không hiện giờ đó cho "cùng giờ"; gợi ý giờ lệch nhau không quá 60 phút | BR-19 |
| Khách chọn Lan cho cả Cắt rồi Nhuộm | Nhuộm bắt đầu sau khi cắt xong thêm 15 phút pha thuốc; khách thấy khoảng chờ này | BR-18 |
| Khách bấm "Chọn lại giờ" trong email hỏi ý, lịch đã đổi 2 lần | Vẫn chọn lại được, không tính vào số lần đổi | BR-08, BR-33 |
| Thợ có lịch cắt nằm trọn trong đoạn chờ lên màu của khách nhuộm | Cả hai lịch hợp lệ; lịch cắt phải ở ghế khác (VD3 của BT1) | BR-05, BR-53 |
| Lịch nhuộm cuối buổi sáng mà 10 phút dọn ghế lấn qua giờ đóng cửa | Không hiện giờ đó (VD5) | BR-52, BR-54 |
| Chỉ có một bồn tắm, bé trước đang sấy | Bé sau vào bồn ngay khi rửa bồn xong, không chờ bé trước sấy xong (VD8) | BR-52 |
| Khách để "Bất kỳ ai" nhưng chỉ thợ cấp cao còn rảnh | Xếp thợ cấp cao, khách vẫn trả giá cấp thấp nhất (VD10) | BR-56, BR-57 |
| Giữ chỗ đã hết hạn nhưng job dọn chưa chạy | Giờ đó vẫn hiện là trống (VD9) | BR-07 |
| Sửa thời lượng nhuộm khi đã có 6 lịch đặt trước | 6 lịch giữ thời lượng và giá cũ | BR-59 |
| Hai biến thể Tắm sấy cùng khớp chó 10 kg | Không cho lưu, báo biến thể nào trùng | BR-55 |
| Lễ tân đặt lịch cho khách đang đứng ở quầy, giờ bắt đầu là 5 phút nữa | Được, không vướng "đặt trước ít nhất 2 giờ" | BR-30 |
| Lễ tân bấm ô ở cột Lan để tạo lịch, không tick "đích danh" | Lịch là "Bất kỳ ai"; sau này Lan nghỉ thì đổi người không cần hỏi | BR-31, BR-34 |
| Kéo lịch khách chọn Mai sang cột Lan | Hỏi lại, gửi email báo khách; giá không đổi | BR-32, BR-12 |
| Khách không trả lời email hỏi ý, còn 2 giờ tới giờ hẹn | Lễ tân thấy cần gọi; lịch không tự hủy | BR-33 |
| Bớt ca Hùng thành 10:00–15:00 khi còn lịch 16:00 | Lưu thì lịch 16:00 vào "Cần xếp lại" | BR-35, BR-34 |
| Lan gửi đơn nghỉ 10/11, chưa duyệt; khách mở trang đặt lịch ngày 10/11 | Lan không có giờ trống; lịch cũ của Lan vẫn giữ tới khi duyệt | BR-11 |
| Tạm ngưng Ghế 2 khi còn Ghế 1 trống cùng giờ | Lịch tự chuyển sang Ghế 1, không báo khách | BR-37 |
| Chủ Nhật nghỉ trưa 12:00–14:00, đã có lịch 12:30 | Lưu xong lịch 12:30 vào "Cần xếp lại" | BR-02, BR-35 |
| Đã chọn đổi Chị Ngọc sang Lan, trước lúc duyệt Lan có khách mới cùng giờ | Duyệt bị chặn, lịch Chị Ngọc trở về "chưa xử lý" kèm lý do | BR-34 |

## Câu hỏi nghiệp vụ còn mở

Ghi các điểm chưa rõ ở đây; chốt xong thì chuyển thành BR.

- Gộp đối tượng trùng sau OTP; email và số điện thoại trỏ tới hai khách khác nhau; bỏ kỹ năng khi còn lịch sắp tới; dịch vụ cần hai nhân viên. Đề xuất ở [ERD](../thiet-ke/erd.md#13-câu-hỏi-còn-mở).
