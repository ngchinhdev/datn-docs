---
title: Nhật ký quyết định
description: Các quyết định đã chốt về đề tài, phạm vi, cách làm, kèm lý do. Đọc trước khi đề xuất thay đổi lớn.
---

Mỗi quyết định có mã `D-xx`. **Không đề xuất lại phương án đã bị loại** trừ khi có thông tin mới (góp ý của giảng viên, phản hồi người dùng thật, ràng buộc kỹ thuật mới). Khi một quyết định thay đổi, không xóa: thêm dòng "Thay thế bởi D-yy" và ghi quyết định mới ở cuối.

Quyết định kỹ thuật chi tiết nằm ở [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md).

---

## D-01. Đề tài: nền tảng đặt lịch đa tài nguyên cho cơ sở dịch vụ theo lịch hẹn

- **Ngày:** 28/10/2026, chốt đề cương 03/11/2026.
- **Bối cảnh:** sinh viên làm một mình, chuyên JavaScript/TypeScript (web), muốn đề tài có nghiệp vụ phức tạp thật, có người dùng thật, tự triển khai được mà không cần cơ quan nhà nước hay trường học phê duyệt.
- **Các hướng đã cân nhắc và loại:**

  | Hướng | Lý do loại |
  |---|---|
  | Website bán hàng, quản lý thư viện... | Quá phổ biến trong đồ án, nghiệp vụ mỏng |
  | Hệ thống thi trên máy tính cho THCS/THPT | Nghiệp vụ tốt (có căn cứ Thông tư 89/2026), nhưng phải qua giáo viên và nhà trường mới có người dùng thử; sinh viên thấy khó triển khai trong thực tế |
  | Quản lý trường học (sổ điểm, học bạ, cổng phụ huynh, freemium) | Đối đầu trực diện vnEdu, SMAS; trường công không mua theo kiểu freemium |
  | Luyện thi HSK 3.0 | Sinh viên không biết tiếng Trung nên không tự kiểm duyệt được nội dung |
  | Tính tiền nhà trọ đúng luật, trợ lý quyết toán thuế TNCN | Khả thi, nhưng sinh viên chọn hướng đặt lịch |
  | SaaS fitness và lịch ăn (của nhóm khác) | Nghiệp vụ mỏng; chỉ dùng làm mẫu đề cương |

- **Lý do chọn:** lõi có bài toán khó thật (xếp lịch có ràng buộc nhiều tài nguyên, chống trùng khi đồng thời, sổ cái tiền); chủ tiệm tự đăng ký dùng được; dễ quan sát nghiệp vụ (salon ở đâu cũng có).
- **Nguyên tắc rút ra:** "đã có sản phẩm tương tự" **không phải lý do để đổi đề tài**; đồ án được chấm ở độ sâu giải quyết vấn đề và bằng chứng thực nghiệm.

## D-02. Ngành chính salon, tóc, nail, spa; ngành chứng minh là spa thú cưng; bỏ nha khoa

- Nha khoa vướng hồ sơ bệnh án điện tử theo quy định của Bộ Y tế, dữ liệu sức khỏe nhạy cảm, sơ đồ răng: riêng nó đã là một đồ án khác.
- Spa thú cưng được chọn làm ngành thứ hai vì có đoạn "bận – rảnh – bận" (lồng sấy), nhiều loại tài nguyên, và buộc mô hình phải có khái niệm **đối tượng được phục vụ** (thú cưng, không phải khách).
- Ngành thứ hai **chỉ bằng gói cấu hình và dữ liệu mẫu**, không thêm tính năng riêng (sổ tiêm phòng, khách sạn thú cưng). Không thêm ngành thứ ba.

## D-03. Định vị so với đối thủ: không tuyên bố phát minh

- SimplyBook.me đã có tài nguyên gắn với dịch vụ; Mangomint có processing time ("bận – rảnh – bận"); Timely có đặt phòng, thiết bị. Thị trường Việt Nam có MySpa, NanoSpa, SalonHero, Salo, eBizSpa.
- **Đóng góp của đồ án:** (1) kết hợp đầy đủ đa tài nguyên + đoạn chờ + chuỗi dịch vụ + đặt nhóm và **chứng minh đúng đắn** bằng kiểm thử ngẫu nhiên và thử đồng thời; (2) chống trùng ở tầng cơ sở dữ liệu; (3) nghiệp vụ tiền theo thực tế Việt Nam; (4) thêm ngành chỉ bằng cấu hình; (5) chatbot an toàn chỉ gọi API.
- Phạm vi áp dụng ghi rõ cả ngành **không** phù hợp (tính theo đêm, tại nhà khách, sửa chữa nhiều ngày, khám chữa bệnh).

## D-04. Cắt phạm vi cho một người làm

- Tài liệu phân tích gốc ([Phân tích nghiệp vụ gốc](../nghiep-vu/phan-tich-goc.md)) có 17 phân hệ, 3 ngành: khoảng một năm của cả nhóm. Phạm vi đồ án chỉ lấy phần lõi.
- **Không làm** (đưa vào chương Hướng phát triển): nha khoa; kho và vật tư; tính năng riêng ngành thú cưng; ngành thứ ba; hạng thành viên, điểm thưởng, kịch bản chăm sóc tự động; thu phí nền tảng thật; dự đoán bỏ hẹn bằng ML; app di động native; hóa đơn điện tử; đặt vượt số lượng; bảng lương đầy đủ.

## D-05. Giữ chatbot, nhưng trên web và làm sau cùng

- Chatbot đặt trên trang đặt lịch (web), dùng tool calling; AI không tự xác nhận lịch, bước cuối luôn qua OTP.
- Tích hợp Zalo OA, Messenger: hướng phát triển (vướng xác thực, xét duyệt của nền tảng, không thêm giá trị nghiệp vụ).
- Chỉ bắt đầu sau mốc M5 (lõi chạy đầu–cuối).

## D-06. Khảo sát không cần gặp mặt

- Sinh viên không muốn phỏng vấn trực tiếp. Thay bằng: dùng thử đối thủ (SimplyBook.me và một phần mềm Việt Nam), đọc đánh giá 1–3 sao trên App Store, Google Play, Capterra, Google Form đăng nhóm Facebook chủ salon, spa, nail, pet shop; thử nghiệm độ dễ dùng (SUS) với bạn bè đóng vai.
- Nếu không có người dùng thật, thực nghiệm mô phỏng E1–E9 vẫn đủ để bảo vệ; nêu trung thực trong phần hạn chế.

## D-07. Tổ chức repo: 2 repo

- `datn-saas`: monorepo code (apps/web Next.js, apps/api NestJS, packages dùng chung).
- `datn-docs`: repo riêng chứa tài liệu và mock, chạy độc lập (`pnpm dev`), deploy để gửi link cho giảng viên.
- Không tách FE, BE thành 2 repo: một người làm, dùng chung schema và kiểu dữ liệu; một tính năng là một commit; vẫn deploy FE, BE độc lập được.

## D-08. Làm việc với Claude Code trên máy, trí nhớ nằm trong file

- Phiên chat ban đầu (claude.ai) không giữ được trí nhớ lâu dài. Trí nhớ dự án = `CLAUDE.md` + thư mục `content/docs` của repo này.
- Trên máy: thư mục cha `datn/` chứa `CLAUDE.md` import `datn-docs/CLAUDE.md`, hai repo nằm cạnh nhau, mở VS Code và Claude Code tại `datn/`.
- Cuối mỗi phiên làm việc: cập nhật [Tiến độ](./tien-do.md); quyết định mới ghi vào trang này.

## D-09. Thanh toán: payOS không có môi trường test

- **Ngày:** 03/11/2026. Thay đổi so với roadmap ban đầu ("PayOS chế độ thử").
- payOS ghi rõ không cung cấp môi trường sandbox/staging riêng; muốn thử phải thanh toán thật số tiền nhỏ, đăng ký tài khoản cá nhân có xác minh CCCD.
- **Quyết định:** thiết kế cổng thanh toán qua một interface `PaymentProvider`. Bản chính dùng `MockPaymentProvider`: sinh mã QR VietQR tĩnh để hiển thị, webhook giả lập **có chữ ký HMAC** và nút "giả lập chuyển khoản" trong môi trường dev và demo. Tích hợp provider thật (payOS bằng giao dịch nhỏ, hoặc API test callback của VietQR) là tùy chọn khi còn thời gian.
- Tính idempotent và đối soát vẫn chứng minh được đầy đủ bằng provider giả lập (E3).

## D-10. Lịch thời gian

- Bắt đầu 02/11/2026; đóng băng tính năng 16/05/2027; bảo vệ dự kiến cuối tháng 6/2027 (giả định, chỉnh theo lịch của khoa).
- Mốc nào trễ quá 1 tuần: cắt mục "Nâng cao" trước, rồi đơn giản hóa chatbot. **Không cắt kiểm thử E1–E5 và E9.**

## D-11. Tên sản phẩm Sapio và hệ thống thiết kế

- **Tên:** Sapio, từ **sắp** (sắp lịch, sắp xếp) và chữ Latin *sapio* (khôn ngoan): xếp người, ghế, phòng và giờ một cách thông minh. Đã loại: Khớp (nghe như quảng cáo thuốc), Henly (trùng nhiều thương hiệu), Thoi, Tiemo. Có vài công ty khác ngành dùng tên Sapio (Sapio Research, Sapio Sciences); không ảnh hưởng đồ án.
- **Hướng thiết kế "ấm và chính xác"**, ghép từ ba sản phẩm tham khảo người dùng chọn: Mangomint (lịch nhiều cột, khối lịch hẹn màu dịu), Cal.com/Calendly (khung đơn sắc, chữ sắc, chọn giờ tối giản), MoeGo (trang khách thân thiện, góc tròn).
- **Hệ thống thiết kế** làm bằng Claude Design (loại Design System) trên claude.ai, tên "Sapio Design System", là nguồn sự thật cho màu, chữ, khoảng cách, góc và component. Gồm:
  - Theme sáng và tối, đạt tương phản WCAG AA.
  - Font Be Vietnam Pro.
  - Màu thương hiệu ngọc bích (`brand`); nút chính khu quản trị cũng màu ngọc (`primary`), đổi từ màu mực ngày 07/11 vì màu đen quá lạnh cho ngành dịch vụ và làm khu quản trị mất màu riêng.
  - 4 màu trạng thái lịch hẹn kèm bản nền nhạt.
  - Màu riêng từng cơ sở (`tenant-may`, `tenant-pawpaw`), gán qua `--accent`.
  - Token lịch: 16px mỗi 15 phút.
  - 8 component: Button, StatusBadge, AppointmentBlock, ResourceCalendar, ServiceCard, SlotPicker, HoldBanner, PhoneField.
- **Chi tiết nhận diện:** đoạn chờ vẽ vạch chéo; lịch hẹn khác đặt vào khe chờ của nhân viên thì vẽ thụt vào.
- **Trong code:** gán biến CSS của shadcn (`--background`, `--primary`, `--ring`...) từ token Sapio theo bảng trong README của hệ thống thiết kế; không để theme shadcn mặc định (`neutral` + Geist).

## D-12. Hướng giao diện hai màn hình đầu

Vẽ trên canvas Claude Design "Sapio · Màn hình đầu tiên" (07/11/2026), dùng Sapio Design System.

- **Trang khách: ưu tiên điện thoại, chọn phương án A "Từng bước".**
  - Mỗi bước một quyết định: dịch vụ → (đối tượng được phục vụ) → thợ, ngày giờ → thông tin, xác nhận. Có thanh tiến độ và thanh tóm tắt cố định ở dưới.
  - Mượn từ phương án B: bước chọn đối tượng được phục vụ (thú cưng) và giá biến thể tự lọc theo thuộc tính của đối tượng (BR-13).
  - Bỏ phương án C (lịch tháng kiểu Cal.com).
  - Trên máy tính: cùng luồng, bố cục hai cột (tóm tắt bên trái, chọn ngày giờ bên phải).
- **Lịch lễ tân: ưu tiên máy tính và tablet, chọn phương án A "Lịch + chi tiết".**
  - Hai kiểu xem, không trộn: **Nhân viên** (mặc định; ghế, giường gội ghi trong khối) và **Tài nguyên** (mỗi cột một ghế, phòng, lồng sấy; khối ghi tên nhân viên). Bản đầu đặt cột thợ và cột ghế chung một lưới làm mỗi lịch hẹn hiện hai lần, nên đã bỏ (07/11). Chuyển qua lại hai tab cho thấy cùng một lịch hẹn: vạch chờ bên thợ, liền khối bên ghế. Bấm một lịch hẹn mở bảng chi tiết.
  - Không dùng nền đen hay màu mực ở bất kỳ component nào; màu mực chỉ cho chữ.
  - iPad ngang: bảng chi tiết thành ngăn trượt đè lên lịch.
  - Điện thoại: lịch từng nhân viên (đổi bằng tab) cùng thẻ "tiếp theo" và thanh điều hướng dưới.
  - Phương án B (hàng chờ "Hôm nay": đang làm, chờ thanh toán, sắp đến) làm trang riêng của khu quản trị.
- **Chọn nhân viên trên điện thoại:** một dòng hiện lựa chọn hiện tại ("Bất kỳ ai · Đổi"), bấm vào mở bảng trượt từ dưới lên với danh sách dọc (BR-14, BR-15); không dùng hàng thẻ cuộn ngang. Trên máy tính là danh sách dọc ở cột trái.
- **Lý do:** khách mở link đặt lịch chủ yếu từ Zalo, Facebook, Google Maps trên điện thoại; lễ tân làm việc ở quầy với máy tính hoặc iPad. Lịch nhiều cột là nơi thể hiện rõ nhất bài toán đa tài nguyên khi bảo vệ.
