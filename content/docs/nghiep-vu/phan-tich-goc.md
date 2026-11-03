---
title: Phân tích nghiệp vụ gốc
description: Bản phân tích nghiệp vụ đầy đủ ban đầu (17 phân hệ, 3 ngành). Phạm vi rộng hơn đồ án; dùng để tham khảo.
---

> **Lưu ý:** đây là bản phân tích ban đầu cho một sản phẩm thương mại đầy đủ, **rộng hơn nhiều so với phạm vi đồ án**. Phạm vi chính thức: [Đề cương](../du-an/de-cuong), [Roadmap](../du-an/roadmap) mục 3, [D-04](../du-an/quyet-dinh#d-04-cắt-phạm-vi-cho-một-người-làm). Các phần nha khoa, kho, chăm sóc khách hàng tự động, thu phí nền tảng **không làm**.

# Tổng quan hệ thống & logic nghiệp vụ
## Nền tảng đặt lịch và quản lý cho Salon, Spa, Nha khoa

---

## Mục lục

1. [Giới thiệu hệ thống](#1-giới-thiệu-hệ-thống)
2. [Các bên tham gia và vai trò](#2-các-bên-tham-gia-và-vai-trò)
3. [Bản đồ phân hệ](#3-bản-đồ-phân-hệ)
4. [Logic nghiệp vụ chi tiết](#4-logic-nghiệp-vụ-chi-tiết)
5. [Các luồng nghiệp vụ xuyên suốt](#5-các-luồng-nghiệp-vụ-xuyên-suốt)
6. [Tình huống đặc biệt cần xử lý](#6-tình-huống-đặc-biệt-cần-xử-lý)
7. [Lộ trình phát triển](#7-lộ-trình-phát-triển)
8. [Thuật ngữ](#8-thuật-ngữ)

---

## 1. Giới thiệu hệ thống

### 1.1. Hệ thống là gì

Một nền tảng cho thuê theo gói tháng/năm. Các cơ sở làm đẹp và nha khoa tự đăng ký tài khoản, có ngay trang đặt lịch riêng mang thương hiệu của mình, và dùng hệ thống để vận hành toàn bộ công việc hằng ngày: nhận lịch, xếp nhân viên, thu tiền, bán gói, quản lý kho, tính hoa hồng, chăm sóc khách hàng.

Mỗi cơ sở (hoặc chuỗi cơ sở) đăng ký được gọi là một **khách thuê**. Tất cả khách thuê dùng chung một hệ thống nhưng dữ liệu tách biệt tuyệt đối, giống như nhiều căn hộ trong cùng một tòa nhà.

### 1.2. Khách hàng mục tiêu

| Nhóm | Đặc điểm | Nhu cầu chính |
|---|---|---|
| Salon tóc, nail nhỏ | 1 cơ sở, 3–5 thợ | Nhận lịch online, giảm khách bỏ hẹn, tính hoa hồng thợ |
| Spa, thẩm mỹ viện | 1–10 chi nhánh | Bán gói liệu trình, quản lý phòng và máy móc, kho mỹ phẩm, báo cáo toàn chuỗi |
| Phòng khám nha khoa | 1–5 chi nhánh, nhiều bác sĩ | Hồ sơ bệnh án, sơ đồ răng, kế hoạch điều trị dài hạn, trả góp |

### 1.3. Giá trị mang lại

- **Cho chủ cơ sở**: lịch luôn kín, giảm khách bỏ hẹn, nắm doanh thu từng chi nhánh theo thời gian thực, tính lương không sai sót.
- **Cho lễ tân và nhân viên**: không còn sổ tay, không trùng lịch, biết trước lịch làm việc của mình.
- **Cho khách hàng cuối**: đặt lịch 24/7, được nhắc lịch, theo dõi gói đã mua và điểm thưởng.

### 1.4. Nguyên tắc nghiệp vụ nền tảng

1. **Dữ liệu của khách thuê là riêng tư tuyệt đối.** Không một cơ sở nào có thể nhìn thấy khách hàng, doanh thu hay lịch hẹn của cơ sở khác.
2. **Không bao giờ có hai lịch hẹn chiếm cùng một nhân viên, phòng hoặc máy trong cùng một thời điểm.**
3. **Tiền không được sửa, chỉ được ghi thêm.** Mọi thay đổi số dư (ví, gói, công nợ) đều phải có một giao dịch đi kèm và truy vết được.
4. **Hồ sơ y tế không bao giờ bị xóa.** Phiếu khám đã chốt chỉ được bổ sung ghi chú, không được sửa nội dung cũ.
5. **Mọi quy tắc kinh doanh đều do từng cơ sở tự cấu hình** (giờ mở cửa, chính sách hủy, hoa hồng, điểm thưởng), hệ thống chỉ cung cấp giá trị mặc định.

---

## 2. Các bên tham gia và vai trò

### 2.1. Cấp nền tảng

| Vai trò | Trách nhiệm |
|---|---|
| Quản trị nền tảng | Duyệt, khóa, mở khách thuê; quản lý các gói cước; hỗ trợ kỹ thuật; xem thống kê toàn hệ thống (không xem dữ liệu chi tiết của khách thuê nếu không được cấp quyền hỗ trợ) |

### 2.2. Cấp khách thuê

| Vai trò | Phạm vi | Quyền chính |
|---|---|---|
| Chủ cơ sở | Toàn bộ chuỗi | Toàn quyền: cấu hình, báo cáo tài chính, hoa hồng, thanh toán gói cước |
| Quản lý chi nhánh | Một hoặc vài chi nhánh được giao | Xếp ca, duyệt nghỉ phép, xem báo cáo chi nhánh, xử lý khiếu nại |
| Lễ tân / Thu ngân | Chi nhánh đang làm | Đặt lịch, đổi lịch, check-in, thu tiền, bán gói, bán sản phẩm |
| Kỹ thuật viên / Thợ | Lịch của bản thân | Xem lịch làm việc, cập nhật trạng thái dịch vụ, ghi chú về khách, xem hoa hồng tạm tính |
| Bác sĩ (nha khoa) | Bệnh nhân mình phụ trách | Khám, ghi hồ sơ bệnh án, lập kế hoạch điều trị, kê đơn |
| Phụ tá nha khoa | Theo bác sĩ phụ trách | Chuẩn bị, chụp ảnh, ghi chép hỗ trợ; không chốt chẩn đoán |
| Kế toán | Toàn chuỗi | Xem và xuất báo cáo tài chính, chốt lương, không sửa lịch hẹn |

Chủ cơ sở có thể tạo thêm vai trò tùy chỉnh bằng cách chọn từng quyền cụ thể.

### 2.3. Khách hàng cuối

| Vai trò | Quyền |
|---|---|
| Khách vãng lai | Xem dịch vụ, giá, đặt lịch (cần xác thực số điện thoại hoặc email) |
| Khách có tài khoản | Thêm: xem lịch sử, gói còn lại, số dư ví, điểm thưởng, tự đổi/hủy lịch |
| Bệnh nhân nha khoa | Thêm: xem kế hoạch điều trị, lịch trả góp, ký phiếu đồng ý |

---

## 3. Bản đồ phân hệ

| # | Phân hệ | Mô tả ngắn |
|---|---|---|
| 1 | Quản lý khách thuê | Đăng ký, trang riêng, cấu hình chung, gói cước |
| 2 | Chi nhánh | Thông tin, giờ mở cửa, ngày nghỉ lễ |
| 3 | Dịch vụ | Danh mục, giá, thời lượng, yêu cầu tài nguyên |
| 4 | Nhân sự | Hồ sơ, kỹ năng, ca làm, nghỉ phép |
| 5 | Tài nguyên | Phòng, giường, ghế nha, máy móc |
| 6 | **Đặt lịch** | Tính giờ trống, đặt, đổi, hủy, danh sách chờ (phân hệ lõi) |
| 7 | Khách hàng | Hồ sơ, lịch sử, phân loại |
| 8 | Bán hàng & thanh toán | Hóa đơn, thu tiền, đặt cọc, hoàn tiền |
| 9 | Ví & gói trả trước | Ví tiền, thẻ quà tặng, gói liệu trình |
| 10 | Hoa hồng & lương | Quy tắc hoa hồng, chốt kỳ, bảng lương |
| 11 | Kho | Sản phẩm, vật tư tiêu hao, nhập, xuất, chuyển kho |
| 12 | Nha khoa | Hồ sơ bệnh án, sơ đồ răng, kế hoạch điều trị, hình ảnh |
| 13 | Thông báo | Nhắc lịch, xác nhận, khuyến mãi qua nhiều kênh |
| 14 | Chăm sóc khách hàng | Hạng thành viên, điểm, voucher, chiến dịch tự động |
| 15 | Báo cáo | Doanh thu, hiệu suất, tỷ lệ lấp đầy, khách quay lại |
| 16 | Thu phí nền tảng | Gói cước, giới hạn, gia hạn |
| 17 | Trợ lý thông minh | Dự đoán khách bỏ hẹn, gợi ý giờ, trả lời tin nhắn tự động |

**Mối quan hệ chính giữa các phân hệ:**

- *Đặt lịch* sử dụng dữ liệu từ *Chi nhánh*, *Dịch vụ*, *Nhân sự*, *Tài nguyên* để biết giờ nào còn trống.
- Khi lịch hẹn hoàn thành, nó kích hoạt *Bán hàng* (tạo hóa đơn), *Kho* (trừ vật tư), *Hoa hồng* (ghi nhận cho nhân viên), *Chăm sóc khách hàng* (cộng điểm) và *Thông báo* (gửi khảo sát).
- *Ví & gói trả trước* là một phương thức thanh toán trong *Bán hàng*.
- *Báo cáo* chỉ đọc dữ liệu từ tất cả các phân hệ khác, không tự tạo dữ liệu.

---

## 4. Logic nghiệp vụ chi tiết

### 4.1. Quản lý khách thuê

**Đăng ký**
- Người đăng ký nhập tên cơ sở, ngành nghề (salon / spa / nha khoa), địa chỉ trang riêng mong muốn, số điện thoại, email.
- Địa chỉ trang riêng phải chưa có người dùng và không thuộc danh sách từ cấm (tên thương hiệu nổi tiếng, từ hệ thống).
- Sau khi xác thực email, khách thuê được tạo kèm một chi nhánh mặc định và **dữ liệu mẫu theo ngành** (danh mục dịch vụ phổ biến, mẫu tin nhắn) để dùng được ngay.
- Mỗi khách thuê mới được **dùng thử 14 ngày** gói cao nhất.

**Cấu hình chung**
- Thương hiệu: logo, màu chủ đạo, ảnh bìa trang đặt lịch.
- Múi giờ, ngôn ngữ, định dạng tiền.
- Chính sách mặc định: hủy lịch, đặt cọc, giờ không gửi tin nhắn.

**Quy tắc cách ly dữ liệu**
- Một người có cùng số điện thoại đi làm đẹp ở hai cơ sở khác nhau sẽ là **hai hồ sơ khách hàng độc lập**, mỗi cơ sở chỉ thấy hồ sơ của mình.
- Một nhân viên có thể làm việc cho hai khách thuê khác nhau bằng cùng một tài khoản đăng nhập, nhưng khi vào khách thuê nào thì chỉ thấy dữ liệu của khách thuê đó.
- Quản trị nền tảng chỉ được xem dữ liệu chi tiết khi khách thuê **chủ động cấp quyền hỗ trợ** có thời hạn, và mọi thao tác trong thời gian đó đều được ghi nhật ký.

**Trạng thái khách thuê**

| Trạng thái | Ý nghĩa | Được làm gì |
|---|---|---|
| Dùng thử | Trong 14 ngày đầu | Toàn bộ tính năng |
| Đang hoạt động | Đã trả phí | Theo gói đã mua |
| Quá hạn | Hết hạn chưa gia hạn, trong 7 ngày ân hạn | Dùng bình thường, hiện cảnh báo |
| Tạm khóa | Quá ân hạn | Chỉ xem dữ liệu, không tạo lịch mới; trang đặt lịch công khai tạm đóng |
| Đã hủy | Chủ cơ sở yêu cầu hoặc khóa quá 90 ngày | Dữ liệu được giữ thêm 30 ngày để xuất, sau đó xóa |

### 4.2. Chi nhánh

- Mỗi chi nhánh có địa chỉ, số điện thoại, **giờ mở cửa theo từng ngày trong tuần** (có thể nghỉ trưa, tức là nhiều khung giờ trong một ngày).
- **Ngày đặc biệt**: nghỉ lễ, mở cửa muộn, đóng cửa sớm. Ngày đặc biệt luôn ưu tiên hơn giờ mở cửa thường lệ.
- Giá dịch vụ có thể **khác nhau theo chi nhánh** (chi nhánh trung tâm đắt hơn ngoại thành). Nếu chi nhánh không khai báo giá riêng thì dùng giá chung.
- Một dịch vụ có thể chỉ có ở một số chi nhánh (ví dụ chỉ chi nhánh A có máy laser).
- Khách hàng, ví, gói liệu trình, điểm thưởng **dùng chung toàn chuỗi**: mua gói ở chi nhánh A được dùng ở chi nhánh B, trừ khi chủ cơ sở cấu hình gói chỉ dùng tại nơi mua.

### 4.3. Dịch vụ

Mỗi dịch vụ gồm các thông tin nghiệp vụ sau:

| Thuộc tính | Ý nghĩa | Ví dụ |
|---|---|---|
| Thời lượng thực hiện | Thời gian làm dịch vụ | Cắt tóc nam 30 phút |
| Thời gian chuẩn bị | Trước khi khách vào | Chuẩn bị dụng cụ 5 phút |
| Thời gian dọn dẹp | Sau khi khách ra, nhân viên/phòng chưa nhận khách mới | Tiệt trùng ghế nha 15 phút |
| Thời gian chờ giữa chừng | Khách ngồi chờ, nhân viên được rảnh để làm khách khác | Ủ thuốc nhuộm 30 phút |
| Tài nguyên cần thiết | Những gì phải rảnh cùng lúc | 1 kỹ thuật viên + 1 phòng VIP + 1 máy triệt lông |
| Nhân viên đủ kỹ năng | Ai được phép làm | Chỉ thợ cấp 2 trở lên được uốn tóc |
| Giá | Có thể khác theo cấp nhân viên | Thợ chính 200.000đ, thợ phụ 150.000đ |
| Biến thể | Cùng dịch vụ khác độ dài/mức độ | Nhuộm tóc ngắn / dài |
| Dịch vụ thêm | Bán kèm khi đặt | Gội đầu dưỡng sinh thêm 15 phút |

**Quy tắc "thời gian chờ giữa chừng"** là điểm khác biệt quan trọng: trong 30 phút ủ thuốc, thợ đó có thể nhận một khách cắt tóc 20 phút. Hệ thống phải hiểu rằng dịch vụ nhuộm chiếm thợ theo kiểu "bận – rảnh – bận".

### 4.4. Nhân sự

**Hồ sơ nhân viên**: thông tin cá nhân, cấp bậc, chi nhánh làm việc, dịch vụ được phép làm, ảnh đại diện hiện trên trang đặt lịch, có cho khách chọn đích danh hay không.

**Ca làm việc**
- Lịch ca cố định theo tuần, có thể khác nhau từng tuần (xoay ca).
- Một nhân viên làm nhiều chi nhánh thì **các ca không được chồng lên nhau** và phải tính thời gian di chuyển nếu chủ cơ sở cấu hình.
- Quản lý có thể đổi ca đột xuất cho một ngày cụ thể.

**Nghỉ phép**
- Nhân viên xin nghỉ, quản lý duyệt.
- **Nếu ngày nghỉ đã có lịch hẹn**, hệ thống không cho duyệt ngay mà hiện danh sách lịch bị ảnh hưởng. Quản lý phải chọn: chuyển sang nhân viên khác cùng kỹ năng, liên hệ khách để dời lịch, hoặc từ chối đơn nghỉ.
- Khi chuyển lịch sang nhân viên khác, khách được thông báo; nếu khách đã chọn đích danh nhân viên cũ thì phải hỏi ý khách trước.

### 4.5. Tài nguyên

- Tài nguyên là những thứ có hạn cần "đặt chỗ": phòng, giường, ghế gội, ghế nha, máy laser, máy chụp X-quang.
- Mỗi tài nguyên thuộc một chi nhánh, có loại (ví dụ "phòng VIP", "ghế nha") và có thể tạm ngưng (đang bảo trì).
- Dịch vụ yêu cầu **loại** tài nguyên, không yêu cầu một tài nguyên cụ thể. Hệ thống tự chọn tài nguyên còn rảnh. Lễ tân có thể đổi thủ công.
- Nhân viên cũng được xem là một loại tài nguyên trong logic xếp lịch: dịch vụ chỉ đặt được khi **mọi** tài nguyên nó cần đều rảnh trong cùng khoảng thời gian.

### 4.6. Đặt lịch (phân hệ lõi)

#### a) Cách hệ thống xác định giờ còn trống

Khi khách chọn một dịch vụ và một ngày, hệ thống lần lượt:

1. Lấy giờ mở cửa của chi nhánh trong ngày đó (đã tính ngày lễ, ngày đặc biệt).
2. Với mỗi nhân viên đủ kỹ năng: lấy ca làm, bỏ đi giờ nghỉ phép, bỏ đi các khoảng đã có lịch (tính cả thời gian chuẩn bị và dọn dẹp).
3. Làm tương tự với từng loại tài nguyên mà dịch vụ yêu cầu.
4. Chỉ giữ lại những khoảng mà **tất cả** tài nguyên cần thiết đều rảnh cùng lúc.
5. Chia thành các mốc giờ theo bước nhảy do cơ sở cấu hình (ví dụ mỗi 15 phút), chỉ giữ mốc nào đủ dài để làm trọn dịch vụ.
6. Áp các quy tắc giới hạn: không cho đặt quá gần giờ hiện tại (ví dụ phải trước ít nhất 1 giờ), không cho đặt quá xa (ví dụ tối đa 60 ngày tới).

#### b) Các kênh tạo lịch hẹn

| Kênh | Người tạo | Đặc điểm |
|---|---|---|
| Trang đặt lịch công khai | Khách | Chỉ thấy giờ trống, phải xác thực số điện thoại hoặc email |
| Tại quầy / qua điện thoại | Lễ tân | Được phép đặt chèn ngoài giờ trống nếu có quyền |
| Khách vãng lai | Lễ tân | Tạo lịch và check-in ngay lập tức |
| Ứng dụng khách hàng | Khách | Giống trang công khai, có sẵn thông tin khách |
| Tin nhắn Zalo / Messenger | Trợ lý tự động | Hỏi đáp rồi đặt hộ khách (giai đoạn sau) |

#### c) Chọn nhân viên

- Khách có thể **chọn đích danh** nhân viên (nếu nhân viên đó cho phép) hoặc chọn **"bất kỳ ai"**.
- Khi chọn "bất kỳ ai", hệ thống phân công theo quy tắc cơ sở cấu hình: người có ít lịch nhất trong ngày, xoay vòng lần lượt, ưu tiên người cấp cao, hoặc ưu tiên người từng phục vụ khách này.
- Lịch được chỉ định đích danh và lịch được phân công có thể có **mức hoa hồng khác nhau** (xem mục 4.10).

#### d) Đặt nhiều dịch vụ và đặt theo nhóm

- Một lịch hẹn có thể gồm nhiều dịch vụ nối tiếp (gội → cắt → nhuộm). Các dịch vụ có thể do những nhân viên khác nhau làm, hệ thống tìm khung giờ mà chuỗi này xếp vừa liền mạch.
- Đặt theo nhóm: nhiều người đi cùng (ví dụ 3 người làm nail cùng lúc). Hệ thống phải tìm giờ có đủ 3 nhân viên rảnh song song.

#### e) Giữ chỗ tạm thời

Khi khách đã chọn giờ nhưng đang điền thông tin hoặc thanh toán, giờ đó được **giữ riêng cho khách trong 10 phút**. Người khác sẽ không thấy giờ này. Hết 10 phút mà khách chưa hoàn tất thì giờ được trả lại.

#### f) Trạng thái lịch hẹn

| Trạng thái | Ý nghĩa | Chuyển sang | Ai thực hiện |
|---|---|---|---|
| Chờ thanh toán | Cần đặt cọc, chưa trả | Đã xác nhận / Đã hủy (hết hạn) | Hệ thống |
| Chờ xác nhận | Cơ sở cấu hình phải duyệt lịch online | Đã xác nhận / Đã hủy | Lễ tân |
| Đã xác nhận | Lịch chắc chắn | Đã đến / Đã hủy / Không đến | Lễ tân, khách |
| Đã đến | Khách có mặt tại quầy | Đang thực hiện | Lễ tân |
| Đang thực hiện | Nhân viên đang làm | Hoàn thành | Nhân viên, lễ tân |
| Hoàn thành | Đã làm xong, chờ hoặc đã thanh toán | (kết thúc) | Hệ thống sau khi thu tiền |
| Đã hủy | Khách hoặc cơ sở hủy | (kết thúc) | Khách, lễ tân |
| Không đến | Quá giờ hẹn một khoảng (ví dụ 15 phút) mà khách không tới | (kết thúc) | Lễ tân hoặc hệ thống tự đánh dấu |

#### g) Đổi lịch và hủy lịch

- Khách được tự đổi hoặc hủy **trước một khoảng thời gian tối thiểu** (ví dụ 4 giờ). Sau mốc đó phải gọi điện cho cơ sở.
- Số lần tự đổi lịch có giới hạn (ví dụ tối đa 2 lần cho một lịch hẹn).
- Đổi lịch giữ nguyên tiền cọc đã đóng. Hủy lịch thì áp dụng chính sách hoàn cọc (mục 4.8).
- Cơ sở hủy lịch (do nhân viên ốm, mất điện…) thì **luôn hoàn cọc 100%** và nên kèm voucher xin lỗi.

#### h) Khách không đến

- Mỗi lần không đến được ghi vào hồ sơ khách.
- Cơ sở cấu hình ngưỡng: ví dụ không đến 2 lần trong 6 tháng thì lần sau **bắt buộc đặt cọc**; 3 lần thì đưa vào danh sách hạn chế, chỉ đặt qua lễ tân.
- Tiền cọc của lịch không đến được giữ lại theo chính sách.

#### i) Lịch định kỳ

- Dùng cho tái khám nha khoa, chỉnh nha, liệu trình spa.
- Ví dụ: "mỗi 4 tuần, thứ Bảy, 9 giờ sáng, 10 lần".
- Hệ thống tạo trước toàn bộ chuỗi lịch. Buổi nào trùng ngày nghỉ hoặc nhân viên vắng thì đánh dấu để lễ tân xử lý.
- Dời một buổi không ảnh hưởng các buổi khác, trừ khi người dùng chọn "dời tất cả các buổi sau".

#### j) Danh sách chờ

- Khi khung giờ mong muốn đã kín, khách có thể đăng ký chờ.
- Có lịch hủy trùng khung đó → hệ thống gửi thông báo cho người chờ theo thứ tự đăng ký. Người đầu tiên xác nhận trong 30 phút sẽ được nhận, quá hạn thì chuyển người kế tiếp.

#### k) Đặt vượt số lượng (tùy chọn)

Cơ sở có tỷ lệ khách không đến cao có thể bật cho phép đặt vượt một số lượng nhỏ ở khung giờ cao điểm. Chỉ áp dụng cho dịch vụ ngắn và khi hệ thống đánh giá khách có khả năng bỏ hẹn cao (giai đoạn sau).

### 4.7. Khách hàng

- **Nhận diện khách bằng số điện thoại.** Số được chuẩn hóa để "0912…" và "+84912…" là một.
- Hồ sơ gồm: thông tin cá nhân, ngày sinh, nguồn khách (Facebook, giới thiệu, đi ngang qua), nhân viên quen, sở thích, ghi chú nội bộ ("dị ứng tinh dầu sả", "thích phòng yên tĩnh").
- **Lịch sử**: mọi lịch hẹn, dịch vụ đã làm, sản phẩm đã mua, tổng chi tiêu, lần đến gần nhất.
- **Gắn nhãn** tự do (VIP, khó tính, khách quen) và nhãn tự động (khách mới, khách sắp rời bỏ).
- **Gộp hồ sơ trùng**: khi phát hiện hai hồ sơ cùng một người, gộp toàn bộ lịch sử, ví, gói, điểm vào một hồ sơ.
- Ghi chú nội bộ **không bao giờ hiện cho khách** xem.

### 4.8. Bán hàng và thanh toán

#### a) Hóa đơn

- Một hóa đơn có thể gồm: dịch vụ đã làm, sản phẩm bán lẻ, gói liệu trình mua mới, nạp tiền vào ví, thẻ quà tặng.
- Hóa đơn được tạo tự động khi lịch hẹn chuyển sang hoàn thành, hoặc lễ tân tạo thủ công cho đơn bán lẻ.

#### b) Thứ tự áp dụng giảm giá

1. Giá gốc theo chi nhánh và cấp nhân viên.
2. Giảm giá theo hạng thành viên.
3. Chương trình khuyến mãi tự động.
4. Voucher khách nhập (mỗi hóa đơn tối đa 1 voucher, trừ khi cấu hình khác).
5. Đổi điểm thưởng.

Phần còn lại được trả bằng một hoặc nhiều phương thức.

#### c) Phương thức thanh toán

- Tiền mặt, chuyển khoản qua mã QR (hệ thống tự nhận biết khi tiền về), thẻ, ví điện tử, trừ ví khách hàng, trừ buổi trong gói liệu trình, thẻ quà tặng.
- **Thanh toán kết hợp**: ví dụ 300.000đ trừ ví + 200.000đ tiền mặt.
- **Ghi nợ**: cho phép với khách quen nếu chủ cơ sở bật, có hạn mức nợ tối đa.

#### d) Đặt cọc

- Cấu hình theo dịch vụ, theo khung giờ cao điểm, hoặc theo hồ sơ khách (khách hay bỏ hẹn).
- Mức cọc: số tiền cố định hoặc % giá dịch vụ.
- Tiền cọc được trừ vào hóa đơn khi khách đến làm.

#### e) Chính sách hủy và hoàn cọc (ví dụ mặc định)

| Thời điểm khách hủy | Hoàn cọc |
|---|---|
| Trước giờ hẹn hơn 24 giờ | 100% |
| Từ 4 đến 24 giờ | 50% |
| Dưới 4 giờ hoặc không đến | 0% |
| Cơ sở chủ động hủy | 100% + voucher xin lỗi (tùy chọn) |

Khách có thể chọn nhận hoàn tiền về tài khoản hoặc **nhận vào ví** (thường được khuyến khích bằng cách cộng thêm %).

#### f) Hoàn tiền sau khi đã thanh toán

- Hoàn toàn bộ hoặc một phần hóa đơn, bắt buộc ghi lý do, cần quyền quản lý.
- Hoàn tiền kéo theo: **thu hồi hoa hồng** đã ghi nhận cho nhân viên, **trừ lại điểm thưởng** đã cộng, **hoàn lại số buổi** nếu đã trừ gói, nhập lại kho nếu trả sản phẩm.

#### g) Hóa đơn điện tử

Cơ sở có thể bật xuất hóa đơn điện tử cho khách yêu cầu, theo thông tin mã số thuế khách cung cấp.

### 4.9. Ví, thẻ quà tặng và gói liệu trình

#### a) Ví khách hàng

- Khách nạp tiền vào ví, thường được tặng thêm (nạp 5 triệu được 5,5 triệu).
- **Tách rõ tiền thật và tiền tặng**: khi dùng, trừ tiền tặng trước hay tiền thật trước tùy cấu hình; khi khách yêu cầu rút lại tiền, chỉ hoàn phần tiền thật còn lại.
- Số dư ví không bao giờ được sửa tay. Mọi điều chỉnh phải tạo giao dịch có lý do và người duyệt.

#### b) Thẻ quà tặng

- Có mã, mệnh giá, hạn dùng. Người mua và người dùng có thể khác nhau.
- Dùng một phần thì phần còn lại vẫn giữ trên thẻ đến hết hạn.

#### c) Gói liệu trình

- Ví dụ: "Triệt lông nách 10 buổi giá 3 triệu, hạn 12 tháng".
- Gói có thể gồm **nhiều dịch vụ khác nhau** (combo: 5 buổi chăm sóc da + 5 buổi massage).
- Mỗi lần khách dùng, trừ 1 buổi. Có thể đặt trước các buổi theo lịch định kỳ.
- **Ghi nhận doanh thu theo buổi**: bán gói 3 triệu chưa phải doanh thu 3 triệu; mỗi buổi dùng mới ghi nhận 300.000đ. Báo cáo cần hiển thị cả "tiền đã thu" và "doanh thu thực hiện".
- **Hết hạn**: số buổi còn lại bị hủy (hoặc cho gia hạn có phí, tùy cơ sở). Hệ thống nhắc khách trước 30 ngày và 7 ngày.
- **Chuyển nhượng**: cho phép chuyển số buổi còn lại sang người thân nếu cơ sở cho phép.
- **Hoàn gói**: hoàn tiền = giá gói − (số buổi đã dùng × giá lẻ của dịch vụ) − phí hủy. Nếu kết quả âm thì không hoàn.

### 4.10. Hoa hồng và lương

#### a) Các loại hoa hồng

| Loại | Cách tính | Ví dụ |
|---|---|---|
| Làm dịch vụ theo % | % trên giá trị thực thu | 10% mỗi lần cắt tóc |
| Làm dịch vụ cố định | Số tiền cố định mỗi lần | 50.000đ mỗi buổi massage |
| Bán sản phẩm | % trên doanh số sản phẩm | 5% mỗi chai dầu gội |
| Bán gói liệu trình | % khi bán gói | 3% giá trị gói |
| Bậc thang | Tỷ lệ tăng theo tổng doanh số tháng | Dưới 30 triệu 8%, 30–50 triệu 10%, trên 50 triệu 12% |
| Khách chỉ định | Cộng thêm khi khách chọn đích danh | Thêm 2% |

#### b) Quy tắc tính

- Hoa hồng tính trên **giá trị thực thu sau giảm giá**, trừ khi cơ sở cấu hình tính trên giá gốc.
- Dịch vụ trả bằng buổi trong gói: tính trên giá trị một buổi của gói.
- Nhiều nhân viên cùng làm một dịch vụ: chia theo tỷ lệ cấu hình sẵn (thợ chính 70%, thợ phụ 30%).
- Quy tắc hoa hồng có **ngày hiệu lực**. Thay đổi quy tắc không ảnh hưởng các kỳ đã chốt.

#### c) Chốt kỳ lương

- Cuối kỳ, kế toán xem bảng tạm tính: lương cứng + hoa hồng + thưởng − phạt − tạm ứng.
- Có thể điều chỉnh thủ công từng dòng, bắt buộc ghi lý do.
- Sau khi chốt, kỳ bị khóa. Hoàn tiền phát sinh sau khi chốt sẽ được trừ hoa hồng **vào kỳ tiếp theo**.
- Nhân viên xem được hoa hồng tạm tính của mình hằng ngày để có động lực.

### 4.11. Kho

- Hai loại hàng: **sản phẩm bán lẻ** (bán cho khách) và **vật tư tiêu hao** (dùng khi làm dịch vụ).
- **Định mức vật tư theo dịch vụ**: ví dụ một lần nhuộm dùng 60ml thuốc nhuộm và 60ml oxy. Khi dịch vụ hoàn thành, kho tự động trừ theo định mức.
- Nhân viên có thể điều chỉnh lượng thực tế dùng nếu khác định mức (tóc dài dùng nhiều hơn).
- **Tồn kho theo từng chi nhánh**. Chuyển kho giữa chi nhánh gồm hai bước: chi nhánh gửi xuất, chi nhánh nhận xác nhận đã nhận.
- **Nhập hàng** theo nhà cung cấp, có giá nhập để tính giá vốn và lãi gộp.
- **Kiểm kê** định kỳ: nhập số thực tế, hệ thống tính chênh lệch, quản lý duyệt điều chỉnh.
- **Cảnh báo**: tồn dưới mức tối thiểu, hàng sắp hết hạn sử dụng.
- So sánh **lượng vật tư lý thuyết** (theo định mức × số dịch vụ) với **lượng thực tế** để phát hiện hao hụt bất thường.

### 4.12. Nha khoa

#### a) Hồ sơ bệnh án

- **Thông tin y tế nền**: tiền sử bệnh (tim mạch, tiểu đường, máu khó đông…), dị ứng thuốc, thuốc đang dùng, đang mang thai hay không.
- **Cảnh báo nổi bật**: dị ứng và bệnh nền luôn hiện ở đầu hồ sơ mỗi khi bác sĩ mở ra.
- **Phiếu khám theo từng lần**: lý do đến khám, khám lâm sàng, chẩn đoán, thủ thuật đã làm, đơn thuốc, hẹn tái khám.
- **Khóa phiếu**: sau khi bác sĩ ký chốt, phiếu khám không sửa được nữa, chỉ được thêm ghi chú bổ sung có ghi rõ người và thời điểm.

#### b) Sơ đồ răng

- Hiển thị toàn bộ hàm theo cách đánh số quốc tế (răng người lớn và răng sữa trẻ em).
- Bác sĩ chọn từng răng, thậm chí từng mặt răng, để ghi tình trạng: sâu, đã trám, đã nhổ, mất răng, cấy ghép, bọc sứ, điều trị tủy, răng khôn mọc lệch…
- Phân biệt bằng màu: **tình trạng hiện có** và **đề xuất điều trị**.
- Mỗi răng có **dòng thời gian** riêng: lần khám nào phát hiện gì, làm gì.

#### c) Kế hoạch điều trị

- Được tạo từ các đề xuất trên sơ đồ răng, chia thành nhiều **giai đoạn** (ví dụ: giai đoạn 1 điều trị sâu răng, giai đoạn 2 nhổ răng khôn, giai đoạn 3 bọc sứ).
- Mỗi hạng mục có thể có **nhiều phương án báo giá** (sứ kim loại 2 triệu, sứ toàn phần 6 triệu). Bệnh nhân chọn phương án.
- Bệnh nhân **duyệt kế hoạch** (ký xác nhận) trước khi bắt đầu.
- **Trả góp**: chia tổng tiền thành nhiều đợt, mỗi đợt có hạn thanh toán. Hệ thống nhắc trước hạn và báo quá hạn.
- Theo dõi tiến độ: hạng mục nào đã làm, đang làm, chưa làm; số tiền đã trả so với giá trị điều trị đã thực hiện.
- Thay đổi kế hoạch giữa chừng phải tạo phiên bản mới, giữ lại phiên bản cũ để đối chiếu.

#### d) Phiếu đồng ý điều trị

- Các thủ thuật có rủi ro (nhổ răng, cấy ghép, gây tê) cần bệnh nhân **ký phiếu đồng ý** trước khi làm.
- Ký trực tiếp trên máy tính bảng tại phòng khám. Phiếu đã ký được lưu thành bản cố định, không chỉnh sửa được.
- Bệnh nhân dưới 18 tuổi cần người giám hộ ký.

#### e) Hình ảnh

- Lưu ảnh chụp trong miệng, ảnh X-quang, ảnh trước/sau điều trị, gắn với lần khám và với răng cụ thể.
- Xem phóng to, so sánh hai ảnh cạnh nhau theo thời gian.

#### f) Quyền truy cập hồ sơ y tế

- Bác sĩ chỉ xem hồ sơ bệnh nhân **mình phụ trách**, trừ khi được chia sẻ hoặc là trưởng phòng khám.
- Lễ tân chỉ thấy thông tin hành chính và lịch hẹn, **không thấy** chẩn đoán và tiền sử bệnh.
- Mọi lần xem và sửa hồ sơ y tế đều được ghi nhật ký: ai, lúc nào, xem gì.

### 4.13. Thông báo

#### a) Các sự kiện gửi thông báo

| Sự kiện | Người nhận | Thời điểm |
|---|---|---|
| Đặt lịch thành công | Khách, nhân viên được giao | Ngay lập tức |
| Nhắc lịch | Khách | Trước 24 giờ và trước 2 giờ |
| Đổi / hủy lịch | Khách, nhân viên, lễ tân | Ngay lập tức |
| Có giờ trống từ danh sách chờ | Khách đang chờ | Ngay lập tức |
| Cảm ơn và khảo sát | Khách | 2 giờ sau khi hoàn thành |
| Gói sắp hết hạn | Khách | Trước 30 ngày và 7 ngày |
| Nhắc tái khám | Bệnh nhân | Theo lịch bác sĩ hẹn (ví dụ 6 tháng) |
| Nhắc trả góp | Bệnh nhân | Trước hạn 3 ngày, ngày đến hạn |
| Chúc mừng sinh nhật | Khách | Sáng ngày sinh nhật |
| Đánh giá thấp | Chủ cơ sở, quản lý | Ngay lập tức |
| Tồn kho thấp | Quản lý chi nhánh | Hằng ngày |

#### b) Quy tắc gửi

- **Thứ tự ưu tiên kênh**: Zalo → SMS → Email. Kênh trước gửi thất bại thì tự chuyển kênh sau.
- **Giờ yên lặng**: không gửi tin quảng cáo từ 21 giờ đến 8 giờ sáng. Tin nhắc lịch và xác nhận vẫn được gửi.
- **Khách từ chối nhận tin quảng cáo** thì chỉ nhận tin giao dịch (xác nhận, nhắc lịch).
- Mỗi cơ sở tự chỉnh nội dung mẫu tin, có chèn tên khách, giờ hẹn, tên nhân viên.
- Tin SMS và Zalo có chi phí, được tính vào hạn mức của gói cước (mục 4.16).

### 4.14. Chăm sóc khách hàng

#### a) Hạng thành viên

- Ví dụ: Thành viên → Bạc (chi 5 triệu/năm) → Vàng (15 triệu/năm) → Kim cương (40 triệu/năm).
- Mỗi hạng có ưu đãi: giảm % dịch vụ, nhân điểm thưởng, quà sinh nhật, ưu tiên đặt giờ cao điểm.
- Xét hạng định kỳ (ví dụ mỗi năm). Không đủ chi tiêu thì xuống hạng.

#### b) Điểm thưởng

- Tích điểm theo số tiền chi (ví dụ 10.000đ = 1 điểm), có thể nhân hệ số theo hạng hoặc trong chương trình đặc biệt.
- Đổi điểm lấy giảm giá hoặc dịch vụ miễn phí.
- Điểm có hạn sử dụng. Hoàn tiền thì trừ lại điểm đã cộng.

#### c) Khuyến mãi và voucher

- Các dạng khuyến mãi: giảm %, giảm tiền, tặng dịch vụ kèm, mua X tặng Y, giá đặc biệt theo khung giờ vắng khách.
- Điều kiện áp dụng: dịch vụ, chi nhánh, khung giờ, hạng thành viên, khách mới hay khách cũ, giá trị hóa đơn tối thiểu.
- Giới hạn: tổng số lượt dùng, số lượt mỗi khách, ngân sách tối đa.
- **Giới thiệu bạn bè**: mỗi khách có mã riêng; người được giới thiệu nhận ưu đãi lần đầu, người giới thiệu nhận thưởng **sau khi** người kia hoàn thành dịch vụ đầu tiên.

#### d) Phân nhóm khách hàng

Chủ cơ sở tạo nhóm bằng điều kiện kết hợp, ví dụ: "Khách hạng Vàng trở lên VÀ chưa quay lại hơn 60 ngày VÀ từng làm dịch vụ chăm sóc da". Nhóm tự cập nhật khi dữ liệu thay đổi.

#### e) Kịch bản chăm sóc tự động

Mỗi kịch bản gồm: **khi nào xảy ra → điều kiện gì → làm gì**.

| Kịch bản | Khi nào | Điều kiện | Hành động |
|---|---|---|---|
| Kéo khách quay lại | 45 ngày không đến | Đã từng đến ít nhất 2 lần | Gửi voucher giảm 15% hạn 14 ngày |
| Khách mới | Hoàn thành lần đầu | — | Cảm ơn, tặng voucher cho lần 2 |
| Tái khám nha khoa | 6 tháng sau lần cạo vôi | Chưa có lịch hẹn mới | Nhắc đặt lịch |
| Gói sắp hết | Còn 1 buổi | — | Gợi ý mua gói mới, giảm 10% |
| Khách không hài lòng | Đánh giá dưới 3 sao | — | Báo quản lý, tạo việc gọi lại cho khách |

### 4.15. Báo cáo

| Nhóm | Báo cáo chính | Câu hỏi trả lời |
|---|---|---|
| Doanh thu | Theo ngày/tháng, chi nhánh, dịch vụ, nhân viên, phương thức thanh toán | Kiếm được bao nhiêu, từ đâu |
| Tiền trả trước | Tiền thu từ gói và ví so với doanh thu đã thực hiện; tổng giá trị buổi còn nợ khách | Còn bao nhiêu nghĩa vụ phải phục vụ |
| Vận hành | Tỷ lệ lấp đầy lịch, giờ cao điểm, giờ vắng | Nhân sự đang dư hay thiếu, lúc nào |
| Lịch hẹn | Số lịch, tỷ lệ hủy, tỷ lệ không đến, nguồn đặt lịch | Kênh nào hiệu quả, khách có giữ hẹn không |
| Khách hàng | Khách mới, tỷ lệ quay lại, giá trị trung bình mỗi khách, khách sắp rời bỏ | Có giữ được khách không |
| Nhân viên | Doanh số, số khách, tỷ lệ khách chọn đích danh, điểm đánh giá, hoa hồng | Ai làm tốt |
| Kho | Tồn kho, giá vốn, lãi gộp, hao hụt | Có thất thoát không |
| Nha khoa | Giá trị kế hoạch đã báo giá, tỷ lệ bệnh nhân chấp nhận, công nợ trả góp | Tư vấn có hiệu quả không |

**Định nghĩa một số chỉ số:**

- **Tỷ lệ lấp đầy** = tổng thời gian nhân viên có khách ÷ tổng thời gian nhân viên có ca làm.
- **Tỷ lệ quay lại** = số khách đến từ 2 lần trở lên trong kỳ ÷ tổng số khách trong kỳ.
- **Tỷ lệ không đến** = số lịch "không đến" ÷ số lịch đã xác nhận.
- **Giá trị vòng đời khách** = tổng chi tiêu trung bình của một khách từ lần đầu đến hiện tại.

### 4.16. Thu phí nền tảng

| Hạng mục | Cơ bản | Chuyên nghiệp | Doanh nghiệp |
|---|---|---|---|
| Số chi nhánh | 1 | 3 | Không giới hạn |
| Số nhân viên | 5 | 20 | Không giới hạn |
| Đặt lịch online, nhắc lịch | Có | Có | Có |
| Gói liệu trình, ví, hoa hồng | — | Có | Có |
| Kho, đa chi nhánh | — | Có | Có |
| Nha khoa chuyên sâu | — | Có | Có |
| Chăm sóc tự động, báo cáo nâng cao | — | — | Có |
| Tên miền riêng, ứng dụng mang thương hiệu | — | — | Có |
| Tin SMS/Zalo miễn phí mỗi tháng | 200 | 1.000 | 5.000 |

**Quy tắc:**

- Vượt giới hạn số chi nhánh/nhân viên: không cho thêm mới, gợi ý nâng gói.
- Vượt hạn mức tin nhắn: tính phí theo tin hoặc mua thêm gói tin.
- **Nâng gói giữa kỳ**: có hiệu lực ngay, trả phần chênh lệch theo số ngày còn lại.
- **Hạ gói**: có hiệu lực từ kỳ sau. Dữ liệu của tính năng bị mất quyền vẫn được giữ, chỉ không dùng được.
- Hết hạn: 7 ngày ân hạn → tạm khóa (xem mục 4.1).

### 4.17. Trợ lý thông minh

- **Dự đoán khách bỏ hẹn**: dựa vào lịch sử không đến, thời gian đặt trước bao lâu, khung giờ, thời tiết, kênh đặt. Lịch có rủi ro cao thì nhắc thêm lần, yêu cầu đặt cọc, hoặc cho phép đặt vượt.
- **Gợi ý giờ đặt**: ưu tiên đề xuất những giờ giúp lịch nhân viên liền mạch, tránh để lại các khoảng trống lẻ 15–20 phút không ai đặt được.
- **Dự báo đông khách**: gợi ý số nhân viên cần xếp ca theo từng ngày, từng khung giờ.
- **Trả lời tin nhắn tự động** trên Zalo và Messenger: tư vấn dịch vụ, báo giá, giờ mở cửa, đặt lịch hộ khách; chuyển cho lễ tân khi không xử lý được.

### 4.18. Bảo mật và tuân thủ ở góc độ nghiệp vụ

- **Nhật ký thao tác**: ghi lại các hành động nhạy cảm (sửa giá, hoàn tiền, điều chỉnh ví, xóa lịch, xem hồ sơ y tế, xuất danh sách khách).
- **Thao tác cần duyệt**: hoàn tiền trên một ngưỡng, điều chỉnh ví, giảm giá thủ công vượt % cho phép.
- **Đồng ý xử lý dữ liệu cá nhân**: khách đồng ý khi đặt lịch lần đầu; đồng ý nhận tin quảng cáo là lựa chọn riêng.
- **Quyền của khách**: yêu cầu xem, xuất, hoặc xóa dữ liệu cá nhân. Riêng hồ sơ y tế và chứng từ tài chính được giữ theo thời hạn luật định, chỉ ẩn danh thông tin không bắt buộc.
- **Xuất danh sách khách hàng** chỉ dành cho chủ cơ sở, mỗi lần xuất đều được ghi nhật ký.

---

## 5. Các luồng nghiệp vụ xuyên suốt

### 5.1. Khách đặt lịch online có đặt cọc

1. Khách vào trang đặt lịch của cơ sở, chọn chi nhánh, dịch vụ, nhân viên (hoặc "bất kỳ ai").
2. Hệ thống hiện các giờ còn trống. Khách chọn giờ, giờ đó được giữ riêng 10 phút.
3. Khách nhập số điện thoại, nhận mã xác thực. Hệ thống tìm hồ sơ cũ hoặc tạo hồ sơ mới.
4. Dịch vụ yêu cầu cọc → khách quét mã QR hoặc thanh toán ví điện tử. Lịch ở trạng thái "chờ thanh toán".
5. Tiền về → lịch chuyển "đã xác nhận", khách và nhân viên nhận thông báo, lịch của lễ tân cập nhật ngay.
6. Hết 10 phút chưa thanh toán → lịch tự hủy, giờ được trả lại.
7. Trước 24 giờ và 2 giờ, khách nhận tin nhắc lịch.
8. Khách đến → lễ tân check-in → nhân viên bắt đầu dịch vụ → hoàn thành.
9. Hóa đơn tự tạo, trừ tiền cọc, khách thanh toán phần còn lại.
10. Đồng thời: kho trừ vật tư, nhân viên được ghi hoa hồng, khách được cộng điểm, 2 giờ sau khách nhận khảo sát.

### 5.2. Khách vãng lai tại quầy

1. Khách đến không hẹn trước. Lễ tân tìm khách theo số điện thoại hoặc tạo mới.
2. Hệ thống gợi ý nhân viên rảnh ngay bây giờ hoặc sớm nhất.
3. Lễ tân tạo lịch và check-in luôn trong một thao tác.
4. Các bước tiếp theo giống luồng 5.1 từ bước 8.

### 5.3. Mua và sử dụng gói liệu trình

1. Sau buổi trải nghiệm, nhân viên tư vấn gói 10 buổi. Lễ tân bán gói, khách thanh toán (có thể trả góp nếu cơ sở cho phép).
2. Nhân viên tư vấn được ghi hoa hồng bán gói. Tiền thu được ghi là "tiền trả trước", chưa phải doanh thu.
3. Lễ tân đặt trước lịch định kỳ cho cả liệu trình.
4. Mỗi buổi khách đến: hoàn thành dịch vụ → trừ 1 buổi → ghi nhận doanh thu 1 buổi → nhân viên thực hiện được hoa hồng làm dịch vụ.
5. Còn 1 buổi → hệ thống gửi gợi ý mua gói mới.
6. Gần hết hạn mà còn buổi → nhắc khách đặt lịch.

### 5.4. Bệnh nhân nha khoa từ lần khám đầu đến khi hoàn tất

1. Bệnh nhân đặt lịch khám tổng quát. Lần đầu đến, điền thông tin y tế nền trên máy tính bảng.
2. Bác sĩ khám, ghi tình trạng từng răng lên sơ đồ răng, chụp X-quang.
3. Bác sĩ lập kế hoạch điều trị 3 giai đoạn, mỗi hạng mục có 2 phương án giá.
4. Tư vấn viên giải thích, bệnh nhân chọn phương án, ký duyệt kế hoạch, chọn trả góp 4 đợt.
5. Mỗi buổi điều trị: ký phiếu đồng ý (nếu cần) → bác sĩ thực hiện → ghi phiếu khám → cập nhật sơ đồ răng → đánh dấu hạng mục hoàn thành.
6. Hệ thống nhắc trả góp đúng hạn, báo quản lý nếu bệnh nhân quá hạn.
7. Hoàn tất kế hoạch → đặt lịch tái khám định kỳ 6 tháng.

### 5.5. Chốt lương cuối tháng

1. Ngày cuối tháng, hệ thống tổng hợp toàn bộ hoa hồng theo quy tắc đang hiệu lực.
2. Kế toán xem bảng tạm tính, đối chiếu, điều chỉnh các trường hợp đặc biệt (có ghi lý do).
3. Chủ cơ sở duyệt → kỳ lương bị khóa → xuất bảng lương.
4. Hoàn tiền phát sinh sau đó sẽ trừ hoa hồng vào tháng sau.

### 5.6. Nhân viên xin nghỉ đột xuất

1. Nhân viên báo ốm sáng nay, quản lý ghi nhận nghỉ.
2. Hệ thống liệt kê 6 lịch hẹn trong ngày bị ảnh hưởng.
3. Với từng lịch: hệ thống gợi ý nhân viên khác cùng kỹ năng đang rảnh.
4. Lịch khách không chỉ định đích danh → chuyển và báo khách.
5. Lịch khách chỉ định đích danh → gửi tin cho khách chọn: đổi nhân viên, dời ngày, hoặc hủy (hoàn cọc 100%).

---

## 6. Tình huống đặc biệt cần xử lý

| Tình huống | Cách xử lý |
|---|---|
| Hai khách cùng bấm đặt một giờ cuối cùng trong cùng một giây | Chỉ một người thành công, người còn lại được báo giờ vừa hết và gợi ý giờ gần nhất |
| Khách thanh toán xong nhưng lịch đã hết hạn giữ chỗ | Nếu giờ vẫn trống thì xác nhận lịch; nếu đã có người khác đặt thì tự động hoàn tiền hoặc đề xuất giờ khác |
| Cổng thanh toán báo kết quả hai lần | Chỉ ghi nhận một lần, không cộng tiền hai lần |
| Dịch vụ kéo dài quá giờ dự kiến, lấn sang lịch sau | Cảnh báo lễ tân, gợi ý chuyển lịch sau cho nhân viên khác hoặc báo khách đến muộn hơn |
| Khách đến trễ 20 phút | Lễ tân chọn: vẫn phục vụ (rút gọn dịch vụ nếu cần) hoặc đánh dấu không đến theo chính sách |
| Đổi giá dịch vụ khi đã có lịch hẹn đặt trước | Lịch đã đặt giữ giá cũ, lịch mới áp giá mới (cơ sở có thể chọn áp giá mới cho tất cả) |
| Đổi quy tắc hoa hồng giữa tháng | Quy tắc mới chỉ áp cho dịch vụ hoàn thành từ ngày hiệu lực |
| Gói liệu trình hết hạn khi khách đang có lịch đặt trước | Cảnh báo khi đặt lịch; đến ngày thì lễ tân chọn gia hạn hoặc tính giá lẻ |
| Khách có hai hồ sơ trùng, mỗi hồ sơ có ví và gói riêng | Gộp hồ sơ, cộng dồn ví, giữ nguyên các gói, giữ lịch sử của cả hai |
| Chi nhánh mất điện, phải đóng cửa đột xuất | Quản lý đánh dấu đóng cửa, hệ thống liệt kê lịch bị ảnh hưởng và gửi tin hàng loạt cho khách |
| Khách thuê hết hạn gói cước khi còn lịch hẹn của khách | Trong thời gian ân hạn vẫn phục vụ bình thường; khi bị tạm khóa, lịch đã đặt vẫn hiển thị để cơ sở liên hệ khách |
| Bác sĩ nghỉ việc, còn nhiều bệnh nhân đang điều trị dở | Quản lý chuyển giao bệnh nhân cho bác sĩ khác, lịch sử điều trị giữ nguyên tên bác sĩ cũ |
| Nhân viên làm hai chi nhánh, có lịch sát giờ nhau | Hệ thống tính thời gian di chuyển giữa hai chi nhánh và không cho đặt lịch vi phạm |

---

## 7. Lộ trình phát triển

Lộ trình chia theo giá trị kinh doanh: mỗi giai đoạn kết thúc bằng một phiên bản dùng được với khách hàng thật.

### Giai đoạn 1: Phiên bản đầu tiên (tháng 1–3)

**Mục tiêu**: một salon hoặc spa một chi nhánh dùng hằng ngày thay sổ tay.

- Khách thuê tự đăng ký, trang đặt lịch riêng, cấu hình thương hiệu
- Phân quyền cơ bản: chủ cơ sở, lễ tân, nhân viên
- Dịch vụ, nhân viên, ca làm, nghỉ phép, phòng và thiết bị
- Đặt lịch: tính giờ trống, chọn nhân viên, nhiều dịch vụ liên tiếp, giữ chỗ tạm thời
- Lịch làm việc cho lễ tân: xem theo nhân viên/phòng, kéo thả đổi giờ, khách vãng lai, check-in
- Hồ sơ khách hàng, lịch sử, ghi chú
- Nhắc lịch qua email
- Thu tiền tại quầy (ghi nhận tiền mặt, chuyển khoản), báo cáo doanh thu ngày

**Kết quả**: 2–3 cơ sở dùng thử thật, không xảy ra trùng lịch.

### Giai đoạn 2: Vận hành kinh doanh (tháng 4–6)

**Mục tiêu**: đáp ứng chuỗi spa nhiều chi nhánh và bắt đầu bán được.

- Đa chi nhánh, giá theo chi nhánh, nhân viên làm nhiều nơi
- Thanh toán online, mã QR tự đối soát, đặt cọc, chính sách hủy, hoàn tiền
- Ví khách hàng, thẻ quà tặng, gói liệu trình
- Hoa hồng và chốt lương
- Kho: sản phẩm, vật tư theo định mức, chuyển kho, kiểm kê
- Lịch cập nhật tức thời giữa các máy, màn hình hàng chờ tại quầy
- Nhắc lịch qua Zalo và SMS, lịch định kỳ, danh sách chờ
- Xử lý khách không đến

**Kết quả**: phiên bản thương mại 1.0, ít nhất 1 chuỗi 3 chi nhánh sử dụng.

### Giai đoạn 3: Nha khoa và giữ chân khách (tháng 7–9)

**Mục tiêu**: mở rộng sang nha khoa và giúp cơ sở tăng tỷ lệ khách quay lại.

- Hồ sơ bệnh án, sơ đồ răng, kế hoạch điều trị nhiều phương án, trả góp
- Phiếu đồng ý ký điện tử, lưu trữ hình ảnh X-quang
- Phân quyền chi tiết cho hồ sơ y tế, nhật ký truy cập
- Hạng thành viên, điểm thưởng, khuyến mãi, voucher, giới thiệu bạn bè
- Phân nhóm khách hàng, kịch bản chăm sóc tự động, khảo sát hài lòng
- Thu phí nền tảng theo gói, dùng thử, gia hạn, nâng/hạ gói
- Hóa đơn điện tử

**Kết quả**: ít nhất 1 phòng khám nha khoa sử dụng; bắt đầu có doanh thu từ thu phí khách thuê.

### Giai đoạn 4: Mở rộng và thông minh hóa (tháng 10–12)

**Mục tiêu**: tăng giá trị cho khách thuê lớn và tự động hóa vận hành.

- Báo cáo nâng cao, báo cáo gửi định kỳ cho chủ cơ sở
- Dự đoán khách bỏ hẹn, gợi ý giờ đặt tối ưu, dự báo đông khách
- Trả lời tin nhắn và đặt lịch tự động qua Zalo, Messenger
- Ứng dụng di động cho khách và cho nhân viên
- Tên miền riêng, ứng dụng mang thương hiệu cho gói Doanh nghiệp
- Kết nối với hệ thống bên ngoài (lịch Google, phần mềm kế toán)
- Quyền của khách về dữ liệu cá nhân, quy trình cấp quyền hỗ trợ cho quản trị nền tảng

**Kết quả**: phiên bản 2.0, sẵn sàng phục vụ số lượng lớn khách thuê.

### Tổng hợp các mốc

| Mốc | Thời điểm | Kết quả |
|---|---|---|
| Phiên bản thử nghiệm | Cuối tháng 3 | 2–3 cơ sở dùng thật |
| Phiên bản thương mại 1.0 | Cuối tháng 6 | Bán được cho chuỗi spa |
| Mở rộng nha khoa | Cuối tháng 9 | Có phòng khám dùng, bắt đầu thu phí |
| Phiên bản 2.0 | Cuối tháng 12 | Thông minh hóa, ứng dụng di động |

### Thứ tự ưu tiên nếu nguồn lực có hạn

1. **Đặt lịch không trùng** là thứ phải đúng tuyệt đối trước mọi thứ khác.
2. **Thanh toán, ví và gói liệu trình** vì đây là lý do chủ cơ sở chịu trả tiền.
3. **Đa chi nhánh và hoa hồng** để bán được cho chuỗi.
4. **Nha khoa** như một sản phẩm mở rộng thị trường.
5. Các phần còn lại.

---

## 8. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Khách thuê | Một cơ sở hoặc chuỗi cơ sở đăng ký sử dụng nền tảng |
| Khách hàng | Người đến làm dịch vụ tại cơ sở của khách thuê |
| Tài nguyên | Thứ có hạn cần đặt chỗ: nhân viên, phòng, ghế, máy móc |
| Giờ trống | Khoảng thời gian mà mọi tài nguyên cần cho một dịch vụ đều rảnh |
| Giữ chỗ tạm thời | Giờ được giữ riêng cho một khách trong lúc hoàn tất đặt lịch |
| Gói liệu trình | Nhiều buổi dịch vụ bán trước với giá ưu đãi, dùng dần |
| Doanh thu thực hiện | Doanh thu được ghi nhận khi dịch vụ thực sự được làm, khác với tiền đã thu trước |
| Định mức vật tư | Lượng vật tư tiêu hao chuẩn cho mỗi lần làm một dịch vụ |
| Tỷ lệ lấp đầy | Phần trăm thời gian làm việc của nhân viên có khách |
| Kế hoạch điều trị | Danh sách các hạng mục điều trị nha khoa theo giai đoạn, có báo giá |
| Sơ đồ răng | Hình hàm răng để bác sĩ ghi tình trạng và điều trị theo từng răng |
| Ân hạn | Khoảng thời gian sau khi hết hạn gói cước mà khách thuê vẫn dùng được bình thường |
