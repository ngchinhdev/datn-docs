---
title: Roadmap
description: Lộ trình 34 tuần, phạm vi, tám bài toán khó, kế hoạch thực nghiệm và rủi ro.
---

> **Cập nhật 03/11/2026:** bảng quy tắc nghiệp vụ (BR) chuyển sang trang [Quy tắc nghiệp vụ](../nghiep-vu/quy-tac.md); công nghệ cụ thể và phiên bản xem [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md); thanh toán đổi theo [D-09](./quyet-dinh.md#d-09-thanh-toán-payos-không-có-môi-trường-test).

# ROADMAP ĐỒ ÁN TỐT NGHIỆP
## Nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn

> **Tên đề tài (VN):** Xây dựng nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn
> **Tên đề tài (EN):** A multi-resource booking and operations SaaS platform for appointment-based service businesses
> **Ngành chính:** Salon tóc, nail, spa · **Ngành chứng minh tính tổng quát:** Spa thú cưng (chỉ bằng cấu hình)
> **Thực hiện:** 1 sinh viên · **Stack:** Next.js + NestJS + PostgreSQL
> **Thời gian:** bắt đầu **02/11/2026**, đóng băng tính năng **16/05/2027**, bảo vệ khoảng **cuối tháng 6/2027** (34 tuần). Nếu lịch bảo vệ của trường khác, dời toàn bộ mốc theo cùng tỉ lệ.

---

## Mục lục

1. [Định vị đề tài](#1-định-vị-đề-tài)
2. [Phạm vi áp dụng của nền tảng](#2-phạm-vi-áp-dụng-của-nền-tảng)
3. [Phạm vi đồ án](#3-phạm-vi-đồ-án)
4. [Vai trò người dùng](#4-vai-trò-người-dùng)
5. [Kiến trúc: lõi dùng chung + gói cấu hình theo ngành](#5-kiến-trúc-lõi-dùng-chung--gói-cấu-hình-theo-ngành)
6. [Tám bài toán khó (xương sống của đồ án)](#6-tám-bài-toán-khó-xương-sống-của-đồ-án)
7. [Quy tắc nghiệp vụ](#7-quy-tắc-nghiệp-vụ)
8. [Mô hình dữ liệu và vòng đời trạng thái](#8-mô-hình-dữ-liệu-và-vòng-đời-trạng-thái)
9. [Tech stack](#9-tech-stack)
10. [Lộ trình 34 tuần](#10-lộ-trình-34-tuần)
11. [Kế hoạch kiểm thử và thực nghiệm](#11-kế-hoạch-kiểm-thử-và-thực-nghiệm)
12. [Khảo sát không cần gặp mặt](#12-khảo-sát-không-cần-gặp-mặt)
13. [Cấu trúc báo cáo đề xuất](#13-cấu-trúc-báo-cáo-đề-xuất)
14. [Rủi ro và cách giảm thiểu](#14-rủi-ro-và-cách-giảm-thiểu)
15. [Câu hỏi hội đồng dự kiến](#15-câu-hỏi-hội-đồng-dự-kiến)
16. [Nguyên tắc làm việc](#16-nguyên-tắc-làm-việc)

---

## 1. Định vị đề tài

### 1.1. Vấn đề

Các cơ sở dịch vụ nhỏ (salon, tiệm nail, spa, spa thú cưng...) vẫn ghi lịch bằng sổ tay, Zalo, Excel. Hậu quả:

- Trùng lịch, nhất là khi một dịch vụ cần cả người lẫn phòng hoặc máy.
- Không tận dụng được thời gian chờ (thợ ngồi không trong lúc khách ủ thuốc).
- Khách bỏ hẹn mà không có cơ chế đặt cọc.
- Tiền gói liệu trình trả trước bị lẫn với doanh thu thật; hoa hồng thợ tính tay dễ sai.

### 1.2. Thị trường đã có gì (nói thẳng)

| Nhóm | Sản phẩm | Đã có |
|---|---|---|
| Quốc tế, đa ngành | SimplyBook.me | Tài nguyên (phòng, thiết bị) gắn với dịch vụ; thời gian đệm |
| Quốc tế, salon | Mangomint | Processing time: khách bận nhưng thợ được rảnh để nhận khách khác |
| Quốc tế, salon | Timely | Đặt phòng, thiết bị kèm dịch vụ để tránh trùng |
| Quốc tế, thú cưng | MoeGo, DaySmart Pet, Savvy Pet Spa | Lịch grooming, hồ sơ thú cưng |
| Việt Nam | MySpa, NanoSpa, SalonHero, Salo, eBizSpa | Lịch hẹn, khách hàng, liệu trình, hoa hồng, đa chi nhánh |

**Kết luận:** các khái niệm "tài nguyên" và "thời gian xử lý" **không mới**. Đồ án không tuyên bố phát minh ra chúng.

### 1.3. Đóng góp của đồ án

1. **Một bộ máy đặt lịch kết hợp đầy đủ** nhiều tài nguyên + đoạn bận/rảnh + chuỗi dịch vụ + đặt nhóm, và **chứng minh tính đúng đắn** bằng kiểm thử ngẫu nhiên, thử nghiệm đồng thời.
2. **Chống trùng ở tầng cơ sở dữ liệu**, không phụ thuộc vào code ứng dụng.
3. **Nghiệp vụ tiền theo thực tế Việt Nam:** VietQR có đối soát, ví tách tiền thật và tiền tặng, gói liệu trình ghi nhận doanh thu theo buổi, hoa hồng kiểu salon Việt.
4. **Tổng quát theo ngành bằng cấu hình:** thêm một ngành mới (spa thú cưng) không cần sửa dòng code nào, chứng minh bằng bộ test.
5. **Chatbot đặt lịch an toàn:** AI chỉ gọi API của bộ máy đặt lịch, không thể tạo ra giờ trống hay giá sai.

> **Việc cần làm ở giai đoạn 0:** tự dùng thử SimplyBook.me (có gói miễn phí) và ít nhất một phần mềm Việt Nam để kiểm chứng mục 3 ở trên: họ thiếu gì, làm khác gì. Ghi lại bằng ảnh chụp màn hình cho chương 1.

**Câu chốt khi bảo vệ:** *"Đồ án giải triệt để 8 bài toán khó của một hệ thống đặt lịch thương mại, chứng minh từng bài bằng thực nghiệm có số liệu, và cho thấy cùng một mã nguồn phục vụ được nhiều ngành chỉ bằng cấu hình."*

---

## 2. Phạm vi áp dụng của nền tảng

Nền tảng dành cho **dịch vụ theo lịch hẹn** có đủ ba đặc điểm:

1. Khách đến tận nơi, vào một khung giờ xác định trong ngày.
2. Thời lượng dịch vụ biết trước (kể cả có đoạn chờ giữa chừng).
3. Cần các tài nguyên có hạn: người, phòng, ghế, máy.

| Phù hợp | Không phù hợp (và lý do) |
|---|---|
| Salon tóc, nail, spa, massage | Khách sạn thú cưng, homestay — tính theo đêm, logic khác |
| Spa, grooming thú cưng | Dịch vụ tại nhà khách — cần tính đường di chuyển |
| Rửa xe, chăm sóc xe | Gara sửa xe nhiều ngày — thời lượng không biết trước |
| Studio chụp ảnh, phòng thu | Khám chữa bệnh — vướng hồ sơ bệnh án và quy định y tế |
| Lớp tập nhóm, cho thuê sân, phòng họp theo giờ | Bán vé sự kiện số lượng lớn — bài toán khác |

Ghi rõ bảng này trong chương 1 của báo cáo. Hội đồng đánh giá cao việc tự xác định ranh giới.

---

## 3. Phạm vi đồ án

### 3.1. Làm chắc (bắt buộc)

| # | Phân hệ | Nội dung chính |
|---|---|---|
| 1 | Khách thuê | Tự đăng ký, **chọn ngành**, trang đặt lịch riêng theo slug, cấu hình thương hiệu, cô lập dữ liệu |
| 2 | Gói cấu hình theo ngành | Loại tài nguyên, dịch vụ mẫu, từ ngữ hiển thị, đối tượng được phục vụ, chính sách mặc định |
| 3 | Chi nhánh | 1–2 chi nhánh, giờ mở cửa nhiều khung/ngày, ngày đặc biệt, giá theo chi nhánh |
| 4 | Dịch vụ | Các đoạn chiếm dụng (chuẩn bị, làm, chờ, dọn), tài nguyên yêu cầu, kỹ năng, giá theo cấp nhân viên |
| 5 | Nhân sự | Hồ sơ, kỹ năng, ca làm, nghỉ phép có kiểm tra lịch bị ảnh hưởng |
| 6 | Tài nguyên | Phòng, giường, ghế, bàn tắm, lồng sấy, máy; tạm ngưng bảo trì |
| 7 | **Đặt lịch** | Tính giờ trống, giữ chỗ 10 phút, chọn nhân viên hoặc "bất kỳ ai", chuỗi dịch vụ, đặt nhóm, đổi/hủy, không đến, khách vãng lai, lịch lễ tân realtime |
| 8 | Khách hàng và đối tượng phục vụ | Khách nhận diện theo số điện thoại chuẩn hóa; đối tượng phục vụ là chính khách hoặc thú cưng của khách; lịch sử, ghi chú nội bộ |
| 9 | Bán hàng, thanh toán | Hóa đơn, đặt cọc, chính sách hoàn cọc, QR có webhook, thanh toán kết hợp, hoàn tiền |
| 10 | Ví và gói liệu trình | Sổ cái chỉ ghi thêm, tiền thật/tiền tặng, gói nhiều buổi, doanh thu thực hiện theo buổi, hoàn gói |
| 11 | Hoa hồng | Quy tắc có ngày hiệu lực, chốt kỳ, thu hồi khi hoàn tiền |
| 12 | Thông báo | Email OTP, xác nhận, nhắc lịch trước 24h và 2h |
| 13 | Báo cáo cơ bản | Doanh thu, tiền trả trước vs doanh thu thực hiện, tỉ lệ lấp đầy, tỉ lệ không đến |
| 14 | **Chatbot đặt lịch trên web** | Hỏi dịch vụ, giá, giờ trống, đặt lịch hộ qua tool calling, chuyển lễ tân khi không xử lý được |

### 3.2. Nâng cao (chỉ làm khi lõi đã xong)

- Danh sách chờ (thông báo theo thứ tự, xác nhận trong 30 phút).
- Gợi ý giờ đặt để tránh khoảng trống lẻ 15–20 phút.
- Lịch định kỳ cho gói liệu trình.
- Nối chatbot vào Zalo OA hoặc Messenger.

### 3.3. Không làm (đưa vào chương "Hướng phát triển")

Nha khoa và hồ sơ bệnh án · Kho và vật tư · Tính năng riêng của ngành thú cưng (sổ tiêm phòng, khách sạn thú cưng) · Ngành thứ ba trở đi · Hạng thành viên, điểm thưởng, kịch bản chăm sóc tự động · Thu phí nền tảng thật · Dự đoán khách bỏ hẹn bằng ML · Ứng dụng di động native · Hóa đơn điện tử · Đặt vượt số lượng · Bảng lương đầy đủ.

---

## 4. Vai trò người dùng

Tên hiển thị của vai trò thay đổi theo ngành (ví dụ "thợ" ở salon, "groomer" ở spa thú cưng), nhưng quyền hạn giống nhau.

| Vai trò | Phạm vi | Quyền chính |
|---|---|---|
| Quản trị nền tảng | Toàn hệ thống | Duyệt/khóa khách thuê, quản lý gói cấu hình ngành, xem thống kê tổng; **không** xem dữ liệu chi tiết của khách thuê |
| Chủ cơ sở | Toàn chuỗi | Cấu hình, dịch vụ, nhân sự, chính sách, báo cáo, chốt kỳ hoa hồng |
| Quản lý chi nhánh | Chi nhánh được giao | Xếp ca, duyệt nghỉ phép, xử lý lịch bị ảnh hưởng, báo cáo chi nhánh |
| Lễ tân / Thu ngân | Chi nhánh đang làm | Đặt, đổi, hủy lịch; check-in; thu tiền; bán gói; nạp ví |
| Kỹ thuật viên | Lịch của bản thân | Xem lịch, cập nhật trạng thái dịch vụ, xem hoa hồng tạm tính |
| Khách hàng | Hồ sơ của mình tại từng cơ sở | Đặt lịch (OTP), quản lý đối tượng phục vụ (ví dụ thú cưng), xem lịch sử, gói, ví, tự đổi/hủy trong hạn |

Một tài khoản có thể có nhiều vai trò và thuộc nhiều khách thuê. Quyền luôn được xét theo cặp **(khách thuê, vai trò)**.

---

## 5. Kiến trúc: lõi dùng chung + gói cấu hình theo ngành

### 5.1. Lõi dùng chung — không biết gì về ngành

Tài nguyên · Dịch vụ chia thành đoạn chiếm dụng · Tính giờ trống · Giữ chỗ · Lịch hẹn · Thanh toán · Sổ cái · Gói liệu trình · Hoa hồng · Thông báo · Báo cáo.

Trong code lõi **không được** xuất hiện từ khóa riêng của ngành như "tóc", "thú cưng", "nail".

### 5.2. Gói cấu hình theo ngành (industry template) — là dữ liệu, không phải code

| Thành phần | Salon, spa | Spa thú cưng |
|---|---|---|
| Loại tài nguyên | Ghế cắt, ghế gội, phòng VIP, giường massage | Bàn tắm, bàn cắt tỉa, lồng sấy |
| Dịch vụ mẫu (đoạn chiếm dụng) | Nhuộm: thợ bận 20' → rảnh 30' (ủ) → bận 20'; ghế bận suốt 70' | Tắm sấy: groomer bận 25' + bàn tắm 25' → lồng sấy 30' (groomer rảnh) → groomer bận 10' chải |
| Đối tượng được phục vụ | Chính khách hàng | Thú cưng của khách (tên, loài, giống, cân nặng) |
| Thuộc tính đối tượng ảnh hưởng dịch vụ | Độ dài tóc → biến thể dịch vụ | Cân nặng / kích cỡ → biến thể dịch vụ và thời lượng |
| Từ ngữ hiển thị | Thợ, khách | Groomer, bé cưng |
| Chính sách mặc định | Cọc 30% với dịch vụ trên 500.000đ | Cọc cố định 50.000đ |

Khi tiệm đăng ký và chọn ngành, hệ thống **nạp gói cấu hình** làm dữ liệu ban đầu; chủ tiệm tự chỉnh sửa tiếp.

### 5.3. Đối tượng được phục vụ (served subject)

- Mỗi `appointment_item` gắn với một **đối tượng được phục vụ**, không gắn thẳng với khách hàng.
- Ngành salon: đối tượng mặc định chính là khách hàng (tạo tự động, khách không thấy khái niệm này).
- Ngành thú cưng: một khách có nhiều thú cưng; một lịch hẹn có thể gồm nhiều bé cùng lúc (tận dụng luôn tính năng đặt nhóm).
- Thuộc tính của đối tượng (cân nặng, độ dài tóc) được khai báo trong gói cấu hình dưới dạng schema động (JSON Schema) và dùng để chọn **biến thể dịch vụ**.

---

## 6. Tám bài toán khó (xương sống của đồ án)

Mỗi bài toán là một mục trong chương 4 của báo cáo, theo khung: **vấn đề → hệ thống khác làm thế nào → các phương án → lựa chọn và lý do → thực nghiệm chứng minh**.

### BT1. Tính giờ trống với nhiều tài nguyên ràng buộc

- **Vấn đề:** dịch vụ cần nhân viên đủ kỹ năng + phòng đúng loại + máy, tất cả rảnh cùng lúc; có thời gian chuẩn bị, dọn dẹp, đoạn "chờ" mà nhân viên được rảnh; chuỗi dịch vụ nối tiếp do nhiều người làm; đặt nhóm cần nhiều nhân viên song song.
- **Tham khảo:** processing time của Mangomint, related resources của SimplyBook.me.
- **Hướng giải:** biểu diễn dịch vụ thành các **đoạn chiếm dụng** theo từng loại tài nguyên. Thuật toán: giao các khoảng rảnh (giờ mở cửa ∩ ca làm − nghỉ phép − lịch đã có − khoảng đệm), trượt theo bước nhảy, kiểm tra mọi đoạn.
- **Chứng minh:** kiểm thử ngẫu nhiên (property-based) hàng nghìn kịch bản; so với thuật toán vét cạn làm đối chứng: không trả giờ sai, không bỏ sót giờ đúng.

### BT2. Chống trùng lịch khi đặt đồng thời, kèm giữ chỗ 10 phút

- **Vấn đề:** hai khách cùng bấm đặt giờ cuối cùng trong một giây; giờ đang giữ chỗ không được hiện cho người khác; giữ chỗ hết hạn phải trả lại.
- **Hướng giải:** bảng `resource_bookings` lưu từng đoạn chiếm dụng, ràng buộc của PostgreSQL:
  ```sql
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE resource_bookings ADD CONSTRAINT no_overlap
    EXCLUDE USING gist (
      tenant_id WITH =,
      resource_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (status IN ('hold', 'active'));
  ```
  Giữ chỗ là đoạn có `status = 'hold'` và `expires_at`. Ràng buộc không dùng được `now()`, nên giữ chỗ hết hạn được dọn bằng job định kỳ **và** được xóa ngay trong cùng transaction trước khi insert lịch mới.
- **Chứng minh:** 100 request đồng thời vào cùng một giờ → đúng 1 thành công, 99 nhận lỗi kèm gợi ý giờ gần nhất.

### BT3. Thanh toán idempotent và đối soát

- **Vấn đề:** webhook về hai lần; khách trả tiền khi giữ chỗ đã hết hạn; tiền về lúc server đang sập.
- **Hướng giải:** `idempotency_key` duy nhất cho mỗi khoản thanh toán; xử lý webhook trong transaction, kiểm tra trạng thái trước khi ghi; nếu giữ chỗ đã hết hạn thì xác nhận khi giờ vẫn trống, ngược lại tạo yêu cầu hoàn tiền. payOS **không có** môi trường test (D-09), nên bản chính dùng `MockPaymentProvider` với webhook giả lập có chữ ký HMAC; tích hợp provider thật là tùy chọn.
- **Chứng minh:** gửi lại cùng một webhook 10 lần (cả tuần tự lẫn song song) → số dư và trạng thái chỉ đổi 1 lần.

### BT4. Sổ cái ví và gói liệu trình, doanh thu thực hiện

- **Vấn đề:** số dư không được sửa tay; tách tiền thật và tiền tặng; bán gói 3 triệu chưa phải doanh thu 3 triệu.
- **Hướng giải:** `ledger_entries` chỉ INSERT (chặn UPDATE/DELETE bằng quyền DB hoặc trigger). Số dư = tổng bút toán. Mỗi lần dùng buổi gói sinh bút toán ghi nhận doanh thu thực hiện.
- **Chứng minh:** bất biến "số dư lưu trữ = tổng bút toán" đúng sau hàng nghìn thao tác ngẫu nhiên.

### BT5. Hoa hồng có ngày hiệu lực, chốt kỳ và thu hồi

- **Vấn đề:** đổi quy tắc giữa tháng; kỳ đã chốt không được sửa; hoàn tiền sau khi chốt.
- **Hướng giải:** quy tắc có `effective_from`; hoa hồng ghi thành bút toán gắn hóa đơn; kỳ `open → closed`; hoàn tiền sau chốt sinh bút toán âm vào kỳ mở kế tiếp.
- **Chứng minh:** bộ test kịch bản: đổi quy tắc ngày 15, hoàn tiền sau chốt, hai thợ chia 70/30, dịch vụ trả bằng gói.

### BT6. Cô lập dữ liệu giữa các khách thuê

- **Vấn đề:** một lỗi quên điều kiện `tenant_id` là lộ dữ liệu tiệm khác.
- **Hướng giải:** hai lớp: (1) tầng ứng dụng luôn lấy `tenant_id` từ phiên; (2) **Row Level Security**, mỗi transaction chạy `SET LOCAL app.tenant_id = ...`.
- **Chứng minh:** test truy cập chéo tenant qua mọi endpoint → 100% bị chặn, kể cả khi tắt lớp kiểm tra ở tầng ứng dụng.

### BT7. Chatbot đặt lịch an toàn

- **Vấn đề:** AI có thể bịa giá, giờ trống hoặc đặt nhầm.
- **Hướng giải:** LLM chỉ có các tool `list_services`, `get_price`, `find_available_slots`, `create_hold`, `request_otp`. Mọi con số đến từ API; AI không có quyền xác nhận lịch, bước cuối luôn qua OTP; câu ngoài phạm vi → chuyển lễ tân; giới hạn lượt chat. Từ ngữ của chatbot lấy theo gói cấu hình ngành.
- **Chứng minh:** bộ đánh giá 50–100 câu hỏi mẫu cho cả hai ngành: tỉ lệ đúng giá và giờ, tỉ lệ chuyển lễ tân đúng lúc, 0 lịch tạo khi chưa qua OTP.

### BT8. Tổng quát theo ngành chỉ bằng cấu hình

- **Vấn đề:** hệ thống "đa ngành" thường bị viết cứng theo ngành đầu tiên; thêm ngành mới lại phải sửa code.
- **Hướng giải:** gói cấu hình theo ngành (mục 5.2); đối tượng được phục vụ với thuộc tính khai báo động (mục 5.3); biến thể dịch vụ chọn theo thuộc tính đối tượng; quy tắc "không có từ khóa ngành trong code lõi" kiểm tra tự động bằng lint.
- **Chứng minh:** một bộ test tạo tenant spa thú cưng **chỉ từ gói cấu hình**, rồi chạy lại toàn bộ test đặt lịch, thanh toán, hoa hồng, chatbot → tất cả qua, không sửa dòng code nào. Đo thêm: thời gian tạo một gói cấu hình ngành mới.

---

## 7. Quy tắc nghiệp vụ

Bảng quy tắc nghiệp vụ (BR-xx) là tài liệu sống, nằm ở trang [Quy tắc nghiệp vụ](../nghiep-vu/quy-tac.md). Mỗi BR có test tương ứng; tên test bắt đầu bằng mã BR.

---

## 8. Mô hình dữ liệu và vòng đời trạng thái

### 8.1. Các thực thể chính

- **Nền tảng:** `tenants`, `users`, `memberships` (user × tenant × role), `industry_templates`
- **Cấu hình:** `branches`, `opening_hours`, `special_days`, `resource_types`, `services`, `service_variants`, `service_segments`, `service_resource_requirements`, `service_prices`, `terminology`
- **Nhân sự, tài nguyên:** `staff`, `staff_skills`, `shifts`, `leave_requests`, `resources`
- **Khách hàng:** `customers`, `served_subjects` (subject_type, attributes JSONB), `customer_notes`, `otp_requests`
- **Đặt lịch:** `appointments`, `appointment_items` (gắn `served_subject_id`), `resource_bookings` (đoạn chiếm dụng), `holds`
- **Tiền:** `invoices`, `invoice_lines`, `payments`, `refunds`, `ledger_accounts`, `ledger_entries`, `packages`, `customer_packages`
- **Hoa hồng:** `commission_rules`, `commission_periods`
- **Hệ thống:** `outbox_events`, `audit_logs`, `notifications`, `chat_sessions`

### 8.2. Vòng đời cần vẽ sơ đồ trạng thái

**Lịch hẹn**
```
chờ thanh toán ──► đã xác nhận ──► đã đến ──► đang thực hiện ──► hoàn thành
      │                 │  │
      ▼                 │  └──► không đến
   đã hủy ◄─────────────┘
```

**Thanh toán:** `khởi tạo → chờ → thành công | thất bại | hết hạn`; `thành công → hoàn một phần | hoàn toàn bộ`

**Gói liệu trình:** `đang dùng → hết buổi | hết hạn | đã hoàn`

**Kỳ hoa hồng:** `mở → đã chốt`

### 8.3. Sự kiện khi lịch hoàn thành (outbox pattern)

Trong cùng transaction chuyển lịch sang "hoàn thành", ghi một dòng vào `outbox_events`. Worker (BullMQ) đọc outbox và lần lượt: tạo hóa đơn → ghi bút toán hoa hồng → trừ buổi gói và ghi doanh thu thực hiện → gửi email cảm ơn. Server sập giữa chừng thì sự kiện không mất.

---

## 9. Tech stack

Tóm tắt; lý do, phiên bản và nguồn xem [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md).

| Lớp | Công nghệ |
|---|---|
| Runtime, monorepo | Node.js 24 LTS, pnpm 11 workspaces (catalog), Turborepo |
| Frontend | Next.js 16.4 (App Router, Cache Components), React 19.3, Tailwind CSS 4, shadcn/ui, TanStack Query |
| Lịch lễ tân | Tự dựng timeline theo tài nguyên (CSS grid + dnd-kit); FullCalendar resource timeline là gói trả phí |
| Backend | NestJS 12 (ESM, Express), validation bằng Zod 4 qua Standard Schema, OpenAPI |
| Database | PostgreSQL 18, Drizzle ORM v1 (RC, ghim phiên bản), exclusion constraint, RLS |
| Hàng đợi, realtime | Redis, BullMQ, Socket.IO |
| Xác thực | Tự xây: session token trong cookie httpOnly, argon2id; OTP email cho khách |
| Thanh toán | `PaymentProvider` + `MockPaymentProvider` (webhook ký HMAC); provider thật tùy chọn (D-09) |
| Email, AI | Nodemailer + Mailpit; Claude API (tool use) cho chatbot |
| Kiểm thử | Vitest, fast-check, Testcontainers, Supertest, Testing Library, MSW, Playwright (+ axe), k6 |
| Lint, format | oxlint, Prettier, TypeScript strict |
| Triển khai | Docker Compose; web trên Vercel, api + Postgres + Redis trên VPS hoặc Railway |

---

## 10. Lộ trình 34 tuần

> Mỗi giai đoạn có **đầu ra** và **tiêu chí hoàn thành**. Không chuyển giai đoạn khi chưa đạt tiêu chí, trừ khi đã cắt phạm vi có chủ đích.

### Giai đoạn 0 — Chốt đề tài và khảo sát (Tuần 1–2: 02/11 – 15/11/2026)

- [x] Viết đề cương theo mẫu UIT, gửi giảng viên hướng dẫn (03/11)
- [ ] Sửa đề cương theo góp ý của cô (nếu có)
- [ ] **Tự dùng thử** SimplyBook.me và ít nhất một phần mềm Việt Nam (MySpa, NanoSpa hoặc SalonHero); chụp màn hình, ghi lại họ làm gì, thiếu gì
- [ ] Đọc tài liệu processing time của Mangomint, related resources của SimplyBook.me (nguồn cho chương 2)
- [ ] Đọc 50–100 đánh giá 1–3 sao của các đối thủ trên App Store, Google Play, Capterra; tổng hợp nỗi đau (mục 12)
- [ ] Đăng Google Form vào nhóm Facebook chủ salon, spa, nail, pet shop
- [x] Tạo 2 repo `datn-saas`, `datn-docs`; đưa đề cương, roadmap, quyết định vào `datn-docs` (03/11)
- [x] Dựng base source `datn-saas` theo [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md), Phần A (03/11, review 05/11)
- [ ] Dựng app docs + mock `datn-docs` theo [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md), Phần B

**Đầu ra:** đề cương được duyệt, bảng so sánh đối thủ có bằng chứng, tổng hợp đánh giá, repo chạy được.

### Giai đoạn 1 — Phân tích và thiết kế (Tuần 3–5: 16/11 – 06/12)

- [ ] Use case theo 6 vai trò; đặc tả các luồng chính
- [ ] Hoàn thiện danh sách BR (mục 7)
- [ ] **Thiết kế gói cấu hình ngành:** định dạng file, danh sách thành phần; viết sẵn gói salon và gói spa thú cưng ở dạng tài liệu
- [ ] ERD đầy đủ (có `industry_templates`, `served_subjects`); sơ đồ trạng thái; sequence cho: đặt lịch online có cọc, webhook thanh toán, hoàn thành lịch → outbox
- [ ] Mock UI và prototype click được: trang đặt lịch của khách (cả hai ngành), lịch lễ tân, cấu hình dịch vụ, thu tiền
- [ ] Thiết kế thuật toán tính giờ trống bằng mã giả, kèm 10 ví dụ tính tay (có ví dụ ngành thú cưng)

**Tiêu chí:** đi hết luồng đặt lịch → thanh toán → hoàn thành trên prototype; mọi BR có chỗ đứng trong ERD; hai gói cấu hình viết xong mà không cần thêm bảng riêng cho ngành nào.

### Giai đoạn 2 — Nền tảng (Tuần 6–8: 07/12 – 27/12)

- [ ] Đăng ký khách thuê, chọn ngành, nạp gói cấu hình, xác thực email, slug
- [ ] Đăng nhập JWT, `memberships`, guard theo (tenant, role)
- [ ] **RLS** trên mọi bảng nghiệp vụ + bộ test truy cập chéo tenant (BT6)
- [ ] CRUD chi nhánh, giờ mở cửa, ngày đặc biệt, loại tài nguyên, tài nguyên, dịch vụ (biến thể, đoạn, yêu cầu tài nguyên), nhân sự, kỹ năng, ca làm
- [ ] Đối tượng được phục vụ với thuộc tính kiểm tra theo JSON Schema
- [ ] Nhật ký thao tác nhạy cảm; lint chặn từ khóa ngành trong code lõi

**Tiêu chí:** một tenant salon và một tenant spa thú cưng seed chạy song song; test cô lập xanh 100%.

### Giai đoạn 3 — Lõi đặt lịch (Tuần 9–14: 28/12/2026 – 07/02/2027)

- [ ] Thuật toán tính giờ trống (BT1) viết theo TDD; thuật toán vét cạn làm đối chứng; property-based test
- [ ] `resource_bookings` + exclusion constraint + giữ chỗ 10 phút + job dọn (BT2); test 100 request đồng thời
- [ ] Trang đặt lịch công khai: chọn chi nhánh, đối tượng (nếu ngành yêu cầu), dịch vụ, nhân viên/"bất kỳ ai", giờ; OTP qua email
- [ ] Phân công "bất kỳ ai" theo quy tắc cấu hình
- [ ] Chuỗi dịch vụ nối tiếp; đặt theo nhóm (nhiều người hoặc nhiều thú cưng)
- [ ] Lịch lễ tân realtime: xem theo nhân viên/tài nguyên, kéo thả có kiểm tra ràng buộc, khách vãng lai, check-in
- [ ] Đổi/hủy theo chính sách; đánh dấu không đến; nghỉ phép kèm xử lý lịch bị ảnh hưởng

**Tiêu chí:** demo được cảnh 100 người bấm cùng một giờ; property test 10.000 kịch bản không lỗi, chạy với dịch vụ của cả hai ngành.

### Đệm Tết Nguyên Đán (Tuần 15–16: 08/02 – 21/02/2027)

- [ ] Nghỉ Tết; nếu còn sức: sửa lỗi tồn đọng, viết nháp chương 1–2

### Giai đoạn 4 — Tiền: thanh toán, ví, gói (Tuần 17–20: 22/02 – 21/03)

- [ ] Hóa đơn tự tạo khi hoàn thành (outbox + BullMQ)
- [ ] Đặt cọc; QR + webhook idempotent (BT3); xử lý thanh toán sau khi giữ chỗ hết hạn
- [ ] Chính sách hoàn cọc; hoàn tiền có lý do và phê duyệt
- [ ] Sổ cái chỉ ghi thêm (BT4); ví tiền thật/tiền tặng; nạp ví
- [ ] Gói liệu trình: bán, trừ buổi, ghi doanh thu thực hiện, hết hạn, hoàn gói
- [ ] Thanh toán kết hợp nhiều phương thức

**Tiêu chí:** test webhook lặp 10 lần; test bất biến sổ cái sau 5.000 thao tác ngẫu nhiên.

### Giai đoạn 5 — Hoa hồng, thông báo, báo cáo (Tuần 21–23: 22/03 – 11/04)

- [ ] Quy tắc hoa hồng (%, cố định, bán gói, khách chỉ định), ngày hiệu lực, chia nhiều thợ (BT5)
- [ ] Chốt kỳ, thu hồi vào kỳ kế tiếp; nhân viên xem hoa hồng tạm tính
- [ ] Email xác nhận, nhắc lịch 24h và 2h bằng BullMQ delayed job
- [ ] Báo cáo: doanh thu, tiền trả trước vs doanh thu thực hiện, tỉ lệ lấp đầy, tỉ lệ không đến
- [ ] *(Nâng cao, nếu kịp)* Danh sách chờ

**Mốc quan trọng 11/04:** toàn bộ lõi chạy đầu–cuối cho ngành salon. Nếu trễ, cắt danh sách chờ và báo cáo nâng cao, **không cắt kiểm thử**.

### Giai đoạn 6 — Chatbot và chứng minh tổng quát (Tuần 24–26: 12/04 – 02/05)

- [ ] Chatbot: định nghĩa tool, prompt theo tenant và từ ngữ ngành; khung chat trên trang đặt lịch; luồng hỏi → tìm giờ → giữ chỗ → OTP (BT7)
- [ ] Guardrail: không tự xác nhận, chuyển lễ tân, giới hạn lượt
- [ ] Bộ đánh giá 50–100 câu hỏi cho cả hai ngành
- [ ] **Hoàn thiện gói cấu hình spa thú cưng** và bộ test BT8: tạo tenant từ gói, chạy lại toàn bộ test lõi
- [ ] *(Nâng cao)* Gợi ý giờ tránh khoảng trống lẻ

### Giai đoạn 7 — Hoàn thiện và thực nghiệm (Tuần 27–28: 03/05 – 16/05)

- [ ] Playwright e2e cho 5 luồng chính (chạy trên cả hai ngành)
- [ ] Load test k6 API tìm giờ trống và đặt lịch
- [ ] Rà soát bảo mật: rate limit OTP, validation, phân quyền từng endpoint
- [ ] Seed dữ liệu đẹp: một salon tóc, một spa, một spa thú cưng
- [ ] Thử nghiệm độ dễ dùng với 5–8 người (bạn bè đóng vai lễ tân, khách), đo SUS
- [ ] Triển khai bản demo online

**16/05/2027: ĐÓNG BĂNG TÍNH NĂNG.** Sau mốc này chỉ sửa lỗi.

### Giai đoạn 8 — Báo cáo và bảo vệ (Tuần 29–34: 17/05 – 27/06)

- [ ] Viết báo cáo theo cấu trúc mục 13
- [ ] Video demo 5–7 phút: 100 request đồng thời, webhook lặp, chatbot, **cùng mã nguồn chạy salon và spa thú cưng**
- [ ] Slide bảo vệ 15–20 trang
- [ ] Kịch bản demo cố định + video dự phòng
- [ ] Luyện trả lời câu hỏi ở mục 15

### Tổng hợp mốc

| Mốc | Ngày | Tiêu chí |
|---|---|---|
| M0 | 15/11/2026 | Đề cương được duyệt, đã dùng thử đối thủ |
| M1 | 06/12/2026 | Thiết kế + prototype + hai gói cấu hình ngành |
| M2 | 27/12/2026 | Nền tảng, cô lập tenant đã kiểm chứng |
| M3 | 07/02/2027 | Lõi đặt lịch chống trùng tuyệt đối |
| M4 | 21/03/2027 | Tiền: thanh toán, ví, gói |
| M5 | 11/04/2027 | Lõi hoàn chỉnh đầu–cuối |
| M6 | 02/05/2027 | Chatbot + chứng minh tổng quát (BT8) |
| M7 | 16/05/2027 | Đóng băng tính năng, có số liệu thực nghiệm |
| M8 | Cuối 6/2027 | Bảo vệ |

---

## 11. Kế hoạch kiểm thử và thực nghiệm

| # | Thực nghiệm | Cách làm | Chỉ số đưa vào báo cáo |
|---|---|---|---|
| E1 | Đúng đắn của tính giờ trống | fast-check sinh ngẫu nhiên giờ mở cửa, ca, lịch có sẵn, dịch vụ của cả hai ngành; so với vét cạn | Số kịch bản, số sai lệch (mục tiêu 0) |
| E2 | Chống trùng đồng thời | 100 request song song vào cùng một giờ | Số lịch thành công (phải = 1) |
| E3 | Webhook idempotent | Gửi lặp 10 lần, tuần tự và song song | Số lần số dư thay đổi (phải = 1) |
| E4 | Bất biến sổ cái | 5.000 thao tác ngẫu nhiên nạp, trừ, hoàn | Số lần số dư ≠ tổng bút toán (phải = 0) |
| E5 | Cô lập tenant | Truy cập chéo qua mọi endpoint, có và không có lớp kiểm tra ứng dụng | Tỉ lệ bị chặn (phải 100%) |
| E6 | Hiệu năng | k6 tăng dần người dùng ảo trên API tìm giờ và đặt lịch | p95 độ trễ, thông lượng, điểm bắt đầu suy giảm |
| E7 | Chatbot | 50–100 câu hỏi mẫu có đáp án, cả hai ngành | Tỉ lệ đúng giá/giờ, chuyển lễ tân đúng, lịch tạo khi chưa OTP (phải = 0) |
| E8 | Độ dễ dùng | 5–8 người thực hiện 5 nhiệm vụ | Điểm SUS, thời gian hoàn thành, số lỗi thao tác |
| E9 | Tổng quát theo ngành | Tạo tenant spa thú cưng chỉ từ gói cấu hình, chạy lại toàn bộ test lõi | Số test qua / tổng, số dòng code lõi phải sửa (phải = 0), thời gian viết gói |

> Ghi kết quả thật, kể cả khi chưa đạt mục tiêu, kèm phân tích nguyên nhân.

---

## 12. Khảo sát không cần gặp mặt

### 12.1. Dùng thử và đọc đánh giá đối thủ

- **Dùng thử:** SimplyBook.me + một phần mềm Việt Nam. Ghi theo mẫu: *Tính năng — Có/Không — Cách làm — Ảnh chụp.*
- **Đọc đánh giá:** App Store, Google Play, Capterra của MySpa, NanoSpa, SalonHero, SimplyBook.me, MoeGo.
- Lập bảng: *Nỗi đau — Số lần xuất hiện — Trích dẫn ngắn — Đồ án giải quyết bằng tính năng/BR nào.*

### 12.2. Google Form (dưới 3 phút)

1. Cơ sở của anh/chị thuộc loại nào? (Salon tóc / Nail / Spa / Spa thú cưng / Khác)
2. Có bao nhiêu nhân viên kỹ thuật?
3. Hiện nhận lịch hẹn bằng cách nào? (Sổ tay / Zalo, Messenger / Excel / Phần mềm: ___)
4. Trong 1 tháng, khoảng bao nhiêu lần bị trùng lịch hoặc quên lịch?
5. Có dịch vụ nào mà trong lúc chờ (ủ thuốc, sấy...) thợ làm được việc khác không? Hiện xếp lịch các dịch vụ đó thế nào?
6. Tỉ lệ khách đặt rồi không đến ước chừng bao nhiêu? Có thu cọc không?
7. Có bán gói liệu trình, thẻ trả trước không? Theo dõi số buổi còn lại bằng cách nào?
8. Hoa hồng cho thợ tính theo cách nào, mất bao lâu mỗi tháng?
9. Nếu có công cụ miễn phí giúp nhận lịch online, chống trùng, tính hoa hồng, anh/chị có muốn dùng thử không? (để lại liên hệ nếu có)

---

## 13. Cấu trúc báo cáo đề xuất

1. **Tổng quan:** bối cảnh, khảo sát hiện trạng (mục 12), bảng so sánh đối thủ có bằng chứng, **phạm vi áp dụng** (mục 2), mục tiêu, phạm vi đồ án
2. **Cơ sở lý thuyết và các hệ thống liên quan:** mô hình đặt lịch của SimplyBook.me, Mangomint, Timely; SaaS multi-tenant, RLS, exclusion constraint, idempotency, sổ cái kế toán, outbox pattern, cấu hình theo ngành bằng dữ liệu, tool calling của LLM
3. **Phân tích và thiết kế:** vai trò, use case, bảng BR, kiến trúc lõi + gói cấu hình, ERD, sơ đồ trạng thái, sequence
4. **Giải quyết các bài toán khó:** BT1 → BT8, mỗi bài theo khung *vấn đề → hệ thống khác làm thế nào → phương án → lựa chọn → hiện thực*
5. **Cài đặt và thực nghiệm:** giao diện chính của cả hai ngành, kết quả E1 → E9 kèm phân tích
6. **Kết luận và hướng phát triển:** kết quả, hạn chế (nói thẳng), các phân hệ ở mục 3.3, ngành thứ ba trở đi

---

## 14. Rủi ro và cách giảm thiểu

| Rủi ro | Dấu hiệu sớm | Cách xử lý |
|---|---|---|
| Thuật toán giờ trống phức tạp hơn dự kiến | Tuần 11 chưa qua property test | Tạm bỏ đặt nhóm, giữ chuỗi dịch vụ; ghi rõ trong phần hạn chế |
| Thiết kế bị viết cứng theo ngành salon | Gói thú cưng ở giai đoạn 1 cần thêm bảng riêng | Sửa mô hình ngay ở giai đoạn 1, khi còn rẻ |
| Phình phạm vi | Muốn thêm kho, nha khoa, ngành thứ ba, app di động | Chỉ thêm khi M5 đã đạt; còn lại vào "Hướng phát triển" |
| Cổng thanh toán không có môi trường thử | Không lấy được tài khoản thử | Giả lập webhook có chữ ký HMAC; vẫn chứng minh idempotency |
| Chi phí AI | Chi phí API tăng khi test | Cache, giới hạn lượt, model nhỏ cho bộ đánh giá |
| Không có người dùng thật | Google Form không ai trả lời | Thực nghiệm E1–E9 + SUS với bạn bè; nêu trung thực trong báo cáo |
| Trễ tiến độ | Trễ quá 1 tuần ở bất kỳ mốc nào | Cắt mục "Nâng cao" trước, rồi đơn giản hóa chatbot; **không cắt E1–E5 và E9** |
| Code AI sinh ra sai nghiệp vụ | Test BR thất bại | Viết test BR trước, code sau; tự review mọi phần phân quyền và tiền |

---

## 15. Câu hỏi hội đồng dự kiến

| Câu hỏi | Hướng trả lời |
|---|---|
| SimplyBook.me, Mangomint đã có tài nguyên và processing time, em làm lại để làm gì? | Không tuyên bố phát minh; đóng góp là kết hợp đầy đủ + chứng minh đúng đắn (E1, E2) + chống trùng ở tầng DB + nghiệp vụ tiền kiểu Việt Nam + tổng quát bằng cấu hình (E9). Dẫn bảng so sánh có ảnh chụp ở chương 1 |
| Thị trường Việt Nam đã có MySpa, NanoSpa? | Như trên; thêm kết quả dùng thử ở giai đoạn 0 |
| "Dùng cho mọi dịch vụ" có quá tham không? | Không phải mọi dịch vụ; chỉ dịch vụ theo lịch hẹn có ba đặc điểm (mục 2), kèm danh sách ngành không phù hợp và lý do |
| Thêm ngành mới tốn bao nhiêu công? | Chỉ viết gói cấu hình; E9 cho thấy 0 dòng code lõi phải sửa |
| Hai người bấm đặt cùng lúc thì sao? | Exclusion constraint; demo E2 |
| Thợ đang ủ thuốc thì nhận khách khác được không? | Mô hình đoạn chiếm dụng, BR-05 |
| Webhook về hai lần? | idempotency_key + transaction; E3 |
| Gói 10 buổi dùng 4 buổi rồi hoàn, giá lẻ đã tăng? | BR-27: dùng giá lẻ tại thời điểm mua gói |
| Kỳ hoa hồng đã chốt mà khách được hoàn tiền? | BR-42: bút toán âm vào kỳ mở kế tiếp |
| Tiệm A có xem được dữ liệu tiệm B không? | Hai lớp, có RLS; E5 |
| AI đặt sai lịch thì sao? | AI chỉ gọi tool, không xác nhận; mọi lịch qua OTP và exclusion constraint; E7 |
| Em đã thử với người dùng thật chưa? | Trình bày dùng thử đối thủ, khảo sát gián tiếp, SUS; nêu rõ hạn chế |
| Vì sao tách NestJS khỏi Next.js? | Backend độc lập phục vụ nhiều client (web, chatbot, sau này app); module rõ; WebSocket; hàng đợi |

---

## 16. Nguyên tắc làm việc

1. **Lõi trước, phụ sau.** Không đụng chatbot trước M5.
2. **Không viết cứng theo ngành.** Mỗi khi muốn viết `if (industry === ...)` trong code lõi, dừng lại và đưa nó vào gói cấu hình.
3. **Viết test BR trước khi code** phần đặt lịch, tiền, hoa hồng.
4. **Mỗi tuần một dòng nhật ký tiến độ** trong `docs/progress.md`; cuối đồ án dùng làm phụ lục.
5. **Dùng AI để sinh code nhưng tự review** mọi phần phân quyền, cô lập tenant và tiền.
6. **Cuối mỗi giai đoạn, tự hỏi:** "Nếu bảo vệ ngay hôm nay, mình demo được gì và chứng minh được gì?"
7. **Tài liệu này là tài liệu sống:** cập nhật sau mỗi mốc, nhưng chỉ *thu hẹp* phạm vi, không mở rộng.
