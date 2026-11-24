---
title: Phạm vi
description: Bài toán, phạm vi, vai trò, kiến trúc lõi, bảy bài toán khó và thực nghiệm E1–E8.
---

## 1. Định vị đề tài

### 1.1. Vấn đề

Các cơ sở làm đẹp nhỏ (salon tóc, tiệm nail, spa, massage) vẫn ghi lịch bằng sổ tay, Zalo, Excel. Hậu quả:

- Trùng lịch, nhất là khi một dịch vụ cần cả người lẫn phòng hoặc máy.
- Không tận dụng được thời gian chờ (thợ ngồi không trong lúc khách ủ thuốc).
- Khách bỏ hẹn mà không có cơ chế đặt cọc.
- Tiền gói liệu trình trả trước bị lẫn với doanh thu thật; hoa hồng thợ tính tay dễ sai.

### 1.2. Thị trường đã có gì (nói thẳng)

| Nhóm | Sản phẩm | Đã có |
|---|---|---|
| Quốc tế, nhiều loại dịch vụ | SimplyBook.me | Tài nguyên (phòng, thiết bị) gắn với dịch vụ; thời gian đệm |
| Quốc tế, salon | Mangomint | Processing time: khách bận nhưng thợ được rảnh để nhận khách khác |
| Quốc tế, salon | Timely | Đặt phòng, thiết bị kèm dịch vụ để tránh trùng |
| Việt Nam | MySpa, NanoSpa, SalonHero, Salo, eBizSpa | Lịch hẹn, khách hàng, liệu trình, hoa hồng, đa chi nhánh |

**Kết luận:** các khái niệm "tài nguyên" và "thời gian xử lý" **không mới**. Đồ án không tuyên bố phát minh ra chúng.

### 1.3. Đóng góp của đồ án

1. **Một bộ máy đặt lịch kết hợp đầy đủ** nhiều tài nguyên + đoạn bận/rảnh + chuỗi dịch vụ + đặt nhóm, và **chứng minh tính đúng đắn** bằng kiểm thử ngẫu nhiên, thử nghiệm đồng thời.
2. **Chống trùng ở tầng cơ sở dữ liệu**, không phụ thuộc vào code ứng dụng.
3. **Nghiệp vụ tiền theo thực tế Việt Nam:** VietQR có đối soát, ví tách tiền thật và tiền tặng, gói liệu trình ghi nhận doanh thu theo buổi, hoa hồng kiểu salon Việt.
4. **Chatbot đặt lịch an toàn:** AI chỉ gọi API của bộ máy đặt lịch, không thể tạo ra giờ trống hay giá sai.

> **Việc cần làm ở giai đoạn 0:** tự dùng thử SimplyBook.me (có gói miễn phí) và ít nhất một phần mềm Việt Nam để kiểm chứng mục 3 ở trên: họ thiếu gì, làm khác gì. Ghi lại bằng ảnh chụp màn hình cho chương 1.

**Câu chốt khi bảo vệ:** *"Đồ án giải triệt để 7 bài toán khó của một hệ thống đặt lịch thương mại cho cơ sở làm đẹp, và chứng minh từng bài bằng thực nghiệm có số liệu."*

---

## 2. Phạm vi áp dụng của nền tảng

Nền tảng chỉ dành cho **cơ sở làm đẹp** ([D-16](../decisions/d16-beauty-only-scope.md)): salon tóc, tiệm nail, spa, massage, gội dưỡng sinh. Các cơ sở này có chung ba đặc điểm:

1. Khách đến tận nơi, vào một khung giờ xác định trong ngày.
2. Thời lượng dịch vụ biết trước, kể cả khi có đoạn chờ giữa chừng (ủ thuốc, xông hơi).
3. Cần các tài nguyên có hạn: nhân viên, ghế, giường, phòng, bồn, máy.

Salon tóc và spa dùng chung nghiệp vụ, chỉ khác danh sách dịch vụ và tài nguyên mỗi tiệm tự nhập. Không có cấu hình riêng theo loại cơ sở.

| Ngoài phạm vi | Lý do |
|---|---|
| Spa, khách sạn cho vật nuôi | Người được phục vụ không phải khách đặt lịch; tính theo đêm |
| Phòng khám, nha khoa, thẩm mỹ viện có can thiệp y tế | Vướng hồ sơ bệnh án và quy định y tế |
| Dịch vụ tại nhà khách | Cần tính đường di chuyển |
| Lưu trú, cho thuê sân, lớp học | Logic đặt chỗ khác |

Ghi rõ bảng này trong chương 1 của báo cáo. Hội đồng đánh giá cao việc tự xác định ranh giới.

---

## 3. Phạm vi đồ án

### 3.1. Làm chắc (bắt buộc)

| # | Phân hệ | Nội dung chính |
|---|---|---|
| 1 | Khách thuê | Tự đăng ký, dùng thử 7 ngày rồi kích hoạt gói Sapio (giả lập, D-15), trang đặt lịch riêng trên tên miền con (T-16), cấu hình thương hiệu, cô lập dữ liệu |
| 2 | (đã bỏ, D-16) | |
| 3 | Chi nhánh | 1–2 chi nhánh, giờ mở cửa nhiều khung/ngày, ngày đặc biệt, giá theo chi nhánh |
| 4 | Dịch vụ | Các đoạn chiếm dụng (chuẩn bị, làm, chờ, dọn), tài nguyên yêu cầu, kỹ năng, giá theo cấp nhân viên |
| 5 | Nhân sự | Hồ sơ, kỹ năng, ca làm, nghỉ phép có kiểm tra lịch bị ảnh hưởng |
| 6 | Tài nguyên | Ghế, giường, phòng, bồn, máy; tạm ngưng bảo trì |
| 7 | **Đặt lịch** | Tính giờ trống, giữ chỗ 10 phút, chọn nhân viên hoặc "bất kỳ ai", chuỗi dịch vụ, đặt nhóm, đổi/hủy, không đến, khách vãng lai, lịch lễ tân realtime |
| 8 | Khách hàng | Khách nhận diện theo số điện thoại chuẩn hóa; lịch sử, ghi chú nội bộ |
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

Loại cơ sở khác ngoài làm đẹp (mục 2) · Kho và vật tư · Hạng thành viên, điểm thưởng, kịch bản chăm sóc tự động · Thu phí nền tảng thật (bản đồ án chỉ giả lập, D-15) · Dự đoán khách bỏ hẹn bằng ML · Ứng dụng di động native · Hóa đơn điện tử · Đặt vượt số lượng · Bảng lương đầy đủ.

---

## 4. Vai trò người dùng

| Vai trò | Phạm vi | Quyền chính |
|---|---|---|
| Quản trị nền tảng | Toàn hệ thống | Khóa/mở khóa khách thuê, cấu hình gói Sapio và giá, xem thống kê tổng; **không** xem dữ liệu chi tiết của khách thuê |
| Chủ cơ sở | Toàn chuỗi | Cấu hình, dịch vụ, nhân sự, chính sách, báo cáo, chốt kỳ hoa hồng |
| Quản lý chi nhánh | Chi nhánh được giao | Xếp ca, duyệt nghỉ phép, xử lý lịch bị ảnh hưởng, báo cáo chi nhánh |
| Lễ tân / Thu ngân | Chi nhánh đang làm | Đặt, đổi, hủy lịch; check-in; thu tiền; bán gói; nạp ví |
| Kỹ thuật viên | Lịch của bản thân | Xem lịch, cập nhật trạng thái dịch vụ, xem hoa hồng tạm tính |
| Khách hàng | Hồ sơ của mình tại từng cơ sở | Đặt lịch (OTP), xem lịch sử, gói, ví, tự đổi/hủy trong hạn |

Một tài khoản có thể có nhiều vai trò và thuộc nhiều khách thuê. Quyền luôn được xét theo cặp **(khách thuê, vai trò)**.

---

## 5. Kiến trúc lõi

Tài nguyên · Dịch vụ chia thành đoạn chiếm dụng · Tính giờ trống · Giữ chỗ · Lịch hẹn · Thanh toán · Sổ cái · Gói liệu trình · Hoa hồng · Thông báo · Báo cáo.

- Mỗi dịch vụ có một hoặc nhiều **biến thể** (tóc ngắn/dài, liệu trình 60/90 phút), khách tự chọn (BR-13).
- Mỗi biến thể là dãy đoạn chiếm dụng trên các loại tài nguyên. Ví dụ Nhuộm: thợ bận 20′, rảnh 30′ trong lúc ủ, rồi bận 20′; ghế bận suốt 70′.
- Cơ sở mới có sẵn loại tài nguyên mặc định (Nhân viên, Ghế, Giường, Phòng) và chính sách mặc định; chủ cơ sở tự nhập dịch vụ.
- Lịch hẹn gồm các **mục**, mỗi mục là một dịch vụ cho một người: người đặt, hoặc người đi cùng khi đặt nhóm.

---

## 6. Bảy bài toán khó (xương sống của đồ án)

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
- **Hướng giải:** LLM chỉ có các tool `list_services`, `get_price`, `find_available_slots`, `create_hold`, `request_otp`. Mọi con số đến từ API; AI không có quyền xác nhận lịch, bước cuối luôn qua OTP; câu ngoài phạm vi → chuyển lễ tân; giới hạn lượt chat.
- **Chứng minh:** bộ đánh giá 50–100 câu hỏi mẫu cho salon tóc và spa: tỉ lệ đúng giá và giờ, tỉ lệ chuyển lễ tân đúng lúc, 0 lịch tạo khi chưa qua OTP.

### BT8. (đã bỏ, D-16)

Mục tiêu "tổng quát theo ngành chỉ bằng cấu hình" không còn trong phạm vi.

---

## 8. Mô hình dữ liệu và vòng đời trạng thái

### 8.1. Các thực thể chính

Bản chi tiết (cột, khóa, ràng buộc, RLS, trạng thái) ở [Mô hình dữ liệu](../architecture/erd.md). Ở đó giữ chỗ là lịch hẹn trạng thái `held`, không có bảng `holds` riêng.

- **Nền tảng:** `tenants`, `users`, `memberships` (user × tenant × role)
- **Cấu hình:** `branches`, `opening_hours`, `special_days`, `resource_types`, `services`, `service_variants`, `service_segments`, `service_resource_requirements`, `service_prices`, `terminology`
- **Nhân sự, tài nguyên:** `staff`, `staff_skills`, `shifts`, `leave_requests`, `resources`
- **Khách hàng:** `customers`, `customer_notes`, `otp_requests`
- **Đặt lịch:** `appointments`, `appointment_items` (người đặt hoặc người đi cùng), `resource_bookings` (đoạn chiếm dụng), `holds`
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
| E1 | Đúng đắn của tính giờ trống | fast-check sinh ngẫu nhiên giờ mở cửa, ca, lịch có sẵn, dịch vụ mẫu của salon tóc và spa; so với vét cạn | Số kịch bản, số sai lệch (mục tiêu 0) |
| E2 | Chống trùng đồng thời | 100 request song song vào cùng một giờ | Số lịch thành công (phải = 1) |
| E3 | Webhook idempotent | Gửi lặp 10 lần, tuần tự và song song | Số lần số dư thay đổi (phải = 1) |
| E4 | Bất biến sổ cái | 5.000 thao tác ngẫu nhiên nạp, trừ, hoàn | Số lần số dư ≠ tổng bút toán (phải = 0) |
| E5 | Cô lập tenant | Truy cập chéo qua mọi endpoint, có và không có lớp kiểm tra ứng dụng | Tỉ lệ bị chặn (phải 100%) |
| E6 | Hiệu năng | k6 tăng dần người dùng ảo trên API tìm giờ và đặt lịch | p95 độ trễ, thông lượng, điểm bắt đầu suy giảm |
| E7 | Chatbot | 50–100 câu hỏi mẫu có đáp án, salon tóc và spa | Tỉ lệ đúng giá/giờ, chuyển lễ tân đúng, lịch tạo khi chưa OTP (phải = 0) |
| E8 | Độ dễ dùng | 5–8 người thực hiện 5 nhiệm vụ | Điểm SUS, thời gian hoàn thành, số lỗi thao tác |
| E9 | (đã bỏ, D-16) | | |

> Ghi kết quả thật, kể cả khi chưa đạt mục tiêu, kèm phân tích nguyên nhân.

---

