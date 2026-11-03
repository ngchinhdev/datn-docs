---
title: Đề cương chi tiết
description: Bản đề cương đã gửi giảng viên hướng dẫn ngày 03/11/2026. Đây là cam kết phạm vi chính thức.
---

> **Trạng thái:** đã gửi ThS. Nguyễn Thị Thùy Trâm ngày 03/11/2026, đang chờ phản hồi.
> Bản Word gốc: `assets/de-cuong-chi-tiet.docx`. Khi đề cương thay đổi theo góp ý của cô, cập nhật **cả hai** bản và ghi vào [Nhật ký quyết định](./quyet-dinh).

| Mục | Nội dung |
|---|---|
| Tên đề tài | Xây dựng nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn |
| Tên tiếng Anh | Building a multi-resource booking and operations management SaaS platform for appointment-based service businesses |
| Cán bộ hướng dẫn | ThS. Nguyễn Thị Thùy Trâm |
| Sinh viên | Nguyễn Ngọc Chính - 26410176 |
| Thời gian | Để trống trong bản gửi cô (theo lịch của khoa) |

## Mô tả chi tiết mục tiêu

Đề tài hướng đến việc nghiên cứu và xây dựng một nền tảng web hoạt động theo mô hình SaaS (Software as a Service), cho phép các cơ sở dịch vụ theo lịch hẹn như salon tóc, tiệm nail, spa tự đăng ký và sử dụng để nhận lịch hẹn trực tuyến, xếp lịch nhân viên và tài nguyên, thu tiền, bán gói liệu trình và tính hoa hồng cho nhân viên. Trọng tâm của đề tài là bộ máy đặt lịch đa tài nguyên: một dịch vụ chỉ được đặt khi mọi tài nguyên cần thiết (nhân viên đủ kỹ năng, phòng, ghế, máy) cùng rảnh, hệ thống hiểu được các khoảng chờ giữa chừng của dịch vụ và đảm bảo không xảy ra trùng lịch kể cả khi nhiều khách đặt cùng lúc. Nền tảng được thiết kế tổng quát theo ngành bằng cấu hình: đề tài lấy salon, spa làm ngành chính và dùng spa thú cưng để kiểm chứng khả năng mở rộng sang ngành khác mà không cần sửa mã nguồn.

Hệ thống có khả năng:

- Cho phép mỗi cơ sở tự đăng ký, chọn ngành và có trang đặt lịch riêng; dữ liệu giữa các cơ sở được cô lập tuyệt đối.
- Tính giờ trống theo nhiều tài nguyên ràng buộc cùng lúc, hỗ trợ dịch vụ có thời gian chuẩn bị, dọn dẹp và thời gian chờ giữa chừng, chuỗi dịch vụ nối tiếp và đặt lịch theo nhóm.
- Chống trùng lịch khi nhiều người đặt đồng thời; giữ chỗ tạm thời trong 10 phút khi khách đang hoàn tất đặt lịch.
- Quản lý thanh toán, đặt cọc qua mã QR, ví khách hàng và gói liệu trình theo nguyên tắc sổ cái chỉ ghi thêm; tách bạch tiền đã thu và doanh thu thực hiện.
- Tính hoa hồng nhân viên theo quy tắc có ngày hiệu lực, chốt kỳ và tự động thu hồi khi hoàn tiền.
- Mở rộng sang ngành mới chỉ bằng gói cấu hình (loại tài nguyên, dịch vụ mẫu, đối tượng được phục vụ, từ ngữ hiển thị).
- Ứng dụng AI xây dựng chatbot hỗ trợ khách tra cứu dịch vụ, giá, giờ trống và đặt lịch qua hội thoại, trong đó AI chỉ được gọi các API của hệ thống nên không tạo ra thông tin sai lệch.

## Phạm vi đề tài

- **Đối tượng sử dụng:** Quản trị nền tảng, Chủ cơ sở, Quản lý chi nhánh, Lễ tân/Thu ngân, Kỹ thuật viên và Khách hàng; mỗi nhóm được phân quyền theo từng cơ sở và sử dụng chức năng phù hợp với vai trò.
- **Ngành áp dụng:** các dịch vụ theo lịch hẹn mà khách đến tận nơi, thời lượng biết trước và cần tài nguyên có hạn. Đề tài triển khai đầy đủ cho salon tóc, tiệm nail, spa và dùng spa thú cưng để kiểm chứng tính tổng quát; không bao gồm dịch vụ tính theo đêm, dịch vụ tại nhà khách, sửa chữa nhiều ngày và khám chữa bệnh.
- **Nội dung:** gồm 2 phân hệ lớn là Trang công khai (trang đặt lịch riêng của từng cơ sở, chatbot đặt lịch) và Trang quản lý (cấu hình cơ sở, dịch vụ, nhân sự, tài nguyên; lịch lễ tân; thu tiền; ví và gói liệu trình; hoa hồng; báo cáo).
- **Nền tảng được triển khai:** ứng dụng Web theo mô hình SaaS multi-tenant, sử dụng Next.js (front-end), NestJS (back-end), PostgreSQL (cơ sở dữ liệu), Redis và BullMQ (hàng đợi tác vụ), Socket.IO (cập nhật thời gian thực).

## Chức năng hệ thống

- **Quản lý khách thuê và phân quyền:** đăng ký cơ sở, chọn ngành và nạp gói cấu hình mẫu; cấu hình thương hiệu và trang đặt lịch riêng; quản lý tài khoản, phân quyền theo vai trò; ghi nhật ký các thao tác nhạy cảm.
- **Cấu hình vận hành:** chi nhánh, giờ mở cửa nhiều khung trong ngày, ngày nghỉ đặc biệt; dịch vụ với các đoạn chiếm dụng (chuẩn bị, thực hiện, chờ, dọn dẹp), biến thể, tài nguyên yêu cầu, giá theo chi nhánh và cấp nhân viên; nhân viên, kỹ năng, ca làm, nghỉ phép; tài nguyên như phòng, ghế, máy.
- **Đặt lịch:** tính và hiển thị giờ trống; khách chọn nhân viên đích danh hoặc "bất kỳ ai"; giữ chỗ 10 phút; xác thực khách bằng mã OTP; đặt chuỗi dịch vụ và đặt theo nhóm; đổi, hủy lịch theo chính sách; xử lý khách không đến; xử lý các lịch bị ảnh hưởng khi duyệt nghỉ phép.
- **Lịch lễ tân:** xem lịch theo nhân viên hoặc theo tài nguyên, cập nhật tức thời giữa nhiều máy; kéo thả đổi giờ có kiểm tra ràng buộc; tạo lịch cho khách vãng lai và check-in.
- **Khách hàng:** nhận diện khách theo số điện thoại chuẩn hóa; quản lý đối tượng được phục vụ (chính khách hàng hoặc thú cưng của khách); lịch sử sử dụng dịch vụ; ghi chú nội bộ.
- **Bán hàng và thanh toán:** hóa đơn tự tạo khi lịch hẹn hoàn thành; đặt cọc và hoàn cọc theo chính sách; thanh toán qua mã QR có xác nhận tự động; thanh toán kết hợp nhiều phương thức; hoàn tiền có phê duyệt.
- **Ví và gói liệu trình:** nạp ví, tách tiền thật và tiền tặng; bán gói, trừ buổi và ghi nhận doanh thu theo từng buổi sử dụng; hoàn gói theo công thức cấu hình được.
- **Hoa hồng:** quy tắc hoa hồng theo phần trăm, cố định, bán gói, khách chỉ định; ngày hiệu lực của quy tắc; chia hoa hồng khi nhiều nhân viên cùng làm; chốt kỳ và thu hồi vào kỳ kế tiếp; nhân viên xem hoa hồng tạm tính.
- **Thông báo và báo cáo:** email xác nhận, nhắc lịch trước 24 giờ và 2 giờ; báo cáo doanh thu, tiền trả trước so với doanh thu thực hiện, tỉ lệ lấp đầy, tỉ lệ khách không đến.
- **Chatbot đặt lịch:** trả lời câu hỏi về dịch vụ, giá, giờ trống bằng dữ liệu thật của hệ thống; giữ chỗ và chuyển sang bước xác thực OTP; chuyển cho lễ tân khi không xử lý được.

## Đối tượng nghiên cứu

- Mô hình hoạt động của các nền tảng đặt lịch dạng SaaS trong nước và quốc tế (SimplyBook.me, Mangomint, Timely,...) và quy trình nghiệp vụ của salon, spa.
- Bài toán xếp lịch có ràng buộc nhiều tài nguyên và thuật toán tính giờ trống.
- Các kỹ thuật đảm bảo toàn vẹn dữ liệu khi truy cập đồng thời: ràng buộc loại trừ trên khoảng thời gian của PostgreSQL, xử lý idempotent, outbox pattern.
- Mô hình sổ cái kế toán chỉ ghi thêm áp dụng cho ví, gói liệu trình và hoa hồng.
- Kiến trúc SaaS multi-tenant và cơ chế cô lập dữ liệu bằng Row Level Security.
- Phương pháp thiết kế hệ thống tổng quát theo ngành bằng cấu hình dữ liệu.
- Ứng dụng mô hình ngôn ngữ lớn với cơ chế gọi công cụ để xây dựng chatbot đặt lịch an toàn.

## Phương pháp thực hiện

1. Khảo sát hiện trạng: dùng thử và phân tích các nền tảng đặt lịch trong nước, quốc tế; tổng hợp đánh giá của người dùng; khảo sát trực tuyến chủ cơ sở.
2. Phân tích nghiệp vụ, xây dựng bộ quy tắc nghiệp vụ và xác định chức năng cho từng nhóm người dùng.
3. Thiết kế kiến trúc hệ thống, cơ sở dữ liệu, gói cấu hình theo ngành và giao diện người dùng.
4. Thiết kế và hiện thực thuật toán tính giờ trống, cơ chế giữ chỗ và chống trùng lịch.
5. Lập trình các phân hệ: quản lý khách thuê, cấu hình vận hành, đặt lịch, thanh toán, ví và gói liệu trình, hoa hồng, thông báo, báo cáo.
6. Nghiên cứu và tích hợp chatbot AI hỗ trợ đặt lịch.
7. Kiểm thử và thực nghiệm: kiểm thử ngẫu nhiên cho thuật toán tính giờ trống, kiểm thử truy cập đồng thời, kiểm thử cô lập dữ liệu, kiểm thử tải, đánh giá chatbot và đánh giá độ dễ sử dụng.
8. Đánh giá, hoàn thiện hệ thống và viết báo cáo.

## Kết quả mong đợi

- Xây dựng thành công nền tảng SaaS đặt lịch đa tài nguyên trên nền tảng web, nhiều cơ sở dùng chung một hệ thống với dữ liệu tách biệt.
- Bộ máy đặt lịch tính đúng giờ trống với nhiều tài nguyên ràng buộc và không xảy ra trùng lịch khi đặt đồng thời, được chứng minh bằng số liệu thực nghiệm.
- Phân hệ thanh toán, ví, gói liệu trình và hoa hồng hoạt động chính xác, truy vết được mọi giao dịch.
- Cùng một mã nguồn phục vụ được salon, spa và spa thú cưng chỉ bằng cấu hình.
- Chatbot hỗ trợ khách tra cứu và đặt lịch, không đưa ra thông tin sai lệch về giá và giờ trống.
- Bộ tài liệu phân tích thiết kế, kết quả thực nghiệm và hướng phát triển.

## Tài liệu tham khảo

- [SimplyBook.me – Related Resources](https://help.simplybook.me/index.php/Related_Resources_custom_feature) – cơ chế gắn tài nguyên (phòng, thiết bị) với dịch vụ trong nền tảng đặt lịch đa ngành
- [Mangomint – Processing, Finishing, and Buffer Times](https://mangomint.com/learn/processing-finishing-and-buffer-times) – mô hình thời gian chờ giữa chừng trong đặt lịch salon
- [MySpa Manager](https://apps.apple.com/app/id1458962203) – phần mềm quản lý spa, salon, thẩm mỹ viện trong nước
- [PostgreSQL – Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) – cơ chế cô lập dữ liệu theo dòng cho hệ thống multi-tenant
- [Claude API Documentation](https://docs.claude.com) – cơ chế gọi công cụ của mô hình ngôn ngữ lớn

## Kế hoạch thực hiện (bản gửi cô, không ghi ngày)

| # | Nội dung | Mốc dự kiến (theo [Roadmap](./roadmap)) |
|---|---|---|
| 1 | Khảo sát hiện trạng, dùng thử các nền tảng đặt lịch trong nước và quốc tế, tổng hợp đánh giá người dùng; hoàn thiện đề cương | 02/11 – 15/11/2026 |
| 2 | Phân tích nghiệp vụ, xây dựng bộ quy tắc nghiệp vụ; thiết kế kiến trúc, cơ sở dữ liệu, gói cấu hình theo ngành; thiết kế giao diện và prototype | 16/11 – 06/12/2026 |
| 3 | Xây dựng nền tảng: đăng ký khách thuê, xác thực, phân quyền, cô lập dữ liệu; cấu hình chi nhánh, dịch vụ, nhân sự, tài nguyên | 07/12 – 27/12/2026 |
| 4 | Xây dựng bộ máy đặt lịch: thuật toán tính giờ trống, giữ chỗ, chống trùng lịch, trang đặt lịch công khai, lịch lễ tân thời gian thực | 28/12/2026 – 07/02/2027 |
| 5 | Xây dựng phân hệ thanh toán, đặt cọc qua mã QR, ví khách hàng và gói liệu trình | 22/02 – 21/03/2027 |
| 6 | Xây dựng phân hệ hoa hồng, thông báo nhắc lịch và báo cáo | 22/03 – 11/04/2027 |
| 7 | Nghiên cứu và tích hợp chatbot AI đặt lịch; hoàn thiện gói cấu hình spa thú cưng để kiểm chứng tính tổng quát | 12/04 – 02/05/2027 |
| 8 | Kiểm thử, thực nghiệm và đánh giá hệ thống; triển khai bản demo | 03/05 – 16/05/2027 |
| 9 | Hoàn thiện báo cáo và chuẩn bị bảo vệ | 17/05 – 27/06/2027 |
