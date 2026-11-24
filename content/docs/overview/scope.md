---
title: Phạm vi
description: Bài toán, phạm vi, vai trò, kiến trúc lõi, tám bài toán khó và thực nghiệm E1–E9.
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
| 1 | Khách thuê | Tự đăng ký, **chọn ngành**, dùng thử 7 ngày rồi kích hoạt gói Sapio (giả lập, D-15), trang đặt lịch riêng trên tên miền con (T-16), cấu hình thương hiệu, cô lập dữ liệu |
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

Nha khoa và hồ sơ bệnh án · Kho và vật tư · Tính năng riêng của ngành thú cưng (sổ tiêm phòng, khách sạn thú cưng) · Ngành thứ ba trở đi · Hạng thành viên, điểm thưởng, kịch bản chăm sóc tự động · Thu phí nền tảng thật (bản đồ án chỉ giả lập, D-15) · Dự đoán khách bỏ hẹn bằng ML · Ứng dụng di động native · Hóa đơn điện tử · Đặt vượt số lượng · Bảng lương đầy đủ.

---

## 4. Vai trò người dùng

Tên hiển thị của vai trò thay đổi theo ngành (ví dụ "thợ" ở salon, "groomer" ở spa thú cưng), nhưng quyền hạn giống nhau.

| Vai trò | Phạm vi | Quyền chính |
|---|---|---|
| Quản trị nền tảng | Toàn hệ thống | Khóa/mở khóa khách thuê, cấu hình gói Sapio và giá, quản lý gói cấu hình ngành, xem thống kê tổng; **không** xem dữ liệu chi tiết của khách thuê |
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
- **Hướng giải:** quy tắc có `effective_from`; hoa hồng ghi thành bút toán gắn hóa đơn; kỳ `open → closed`; hoàn tiền sinh bút toán âm vào kỳ của ngày duyệt hoàn, kỳ cũ giữ nguyên (BR-42).
- **Chứng minh:** bộ test kịch bản: đổi quy tắc ngày 15, hoàn tiền sau chốt, quy tắc cụ thể hơn thắng, dịch vụ trả bằng gói.

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

## 8. Mô hình dữ liệu và vòng đời trạng thái

### 8.1. Các thực thể chính

Bản chi tiết (cột, khóa, ràng buộc, RLS, trạng thái) ở [Mô hình dữ liệu](../architecture/erd.md). Ở đó giữ chỗ là lịch hẹn trạng thái `held`, không có bảng `holds` riêng.

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

