---
title: Danh sách màn hình
description: Toàn bộ màn hình của Sapio theo khu vực và vai trò, kèm route, đợt làm mock, mức độ thiết kế và quy tắc nghiệp vụ liên quan.
---

Danh sách này rút từ [phạm vi làm chắc](../du-an/roadmap.md#31-làm-chắc-bắt-buộc) và [6 vai trò](../du-an/roadmap.md#4-vai-trò-người-dùng) của roadmap. Không thêm tính năng ngoài phạm vi: không có bảng giá hay thu phí nền tảng, kho vật tư, hạng thành viên ([3.3](../du-an/roadmap.md#33-không-làm-đưa-vào-chương-hướng-phát-triển)). Màn hình mới phát sinh thì thêm vào đây trước, rồi mới vẽ hoặc code.

## Cách đọc

**Vai trò:** KH khách hàng · LT lễ tân/thu ngân · KTV kỹ thuật viên · QL quản lý chi nhánh · CCS chủ cơ sở · QTNT quản trị nền tảng. Chủ cơ sở thấy mọi màn của lễ tân và quản lý; quản lý chỉ thấy chi nhánh được giao.

**Đợt** (mock đi trước code một giai đoạn):

| Đợt | Mục tiêu | Phục vụ code ở |
|---|---|---|
| 1 | Tài khoản, khung ứng dụng, cấu hình cơ sở, đặt lịch, ca và nghỉ phép, gói cấu hình ngành | Giai đoạn 2–3 (nền tảng, lõi đặt lịch) |
| 2 | Tiền: thu tiền, cọc, gói, ví, hóa đơn, hoàn tiền | Giai đoạn 4 |
| 3 | Hoa hồng, báo cáo, thông báo, chatbot, tổng quan | Giai đoạn 5–6 |

**Mức thiết kế:**

- **Vẽ:** vẽ riêng trên canvas Claude Design rồi mới code. Dành cho màn thể hiện bài toán của đề tài hoặc có tương tác riêng.
- **DS:** dựng từ *mẫu trang danh sách* (MH-09): tiêu đề, nút chính, tìm kiếm, bộ lọc, bảng hoặc thẻ trên điện thoại, phân trang, trạng thái trống. Ghi rõ cột và bộ lọc là đủ.
- **Form:** dựng từ *mẫu trang form* (MH-10): các nhóm trường, lưu, hủy thay đổi, lỗi từng trường. Ghi rõ trường là đủ.
- **Nhẹ:** trang đơn giản theo khung chung, không cần vẽ.

**Trạng thái:** Chưa làm · Đang làm · Đã chốt (cô đồng ý). Trạng thái hiện trên trang `/mock` (lấy từ `mock/screens.ts`).

## Quy ước route

Đã chốt ở [T-15](../ky-thuat/quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url).

- **Tiếng Anh**, chữ thường, nối bằng gạch ngang, danh từ số nhiều cho tập hợp (`/customers/[id]`), cùng từ với [Thuật ngữ](../nghiep-vu/thuat-ngu.md). Lý do: khớp tên trong code và API (`/v1/customers`), không có vấn đề dấu tiếng Việt trong URL, theo thói quen của các sản phẩm SaaS. Chữ hiển thị trên màn hình vẫn là tiếng Việt; tài liệu `/docs` giữ đường dẫn tiếng Việt.
- **Bốn khu:**

| Khu | Tiền tố | Ai dùng |
|---|---|---|
| Công khai của Sapio | `/`, `/signup`, `/login`... | Người chưa đăng nhập |
| Trang khách của một cơ sở | `/[tenant]/...` | Khách hàng |
| Khu nội bộ của một cơ sở | `/app/[tenant]/...` | LT, KTV, QL, CCS |
| Quản trị nền tảng | `/admin/...` | QTNT |

- `[tenant]` là slug của cơ sở (`toc-may`, `pawpaw`). Slug nằm trong URL cả ở khu nội bộ, để mở hai cơ sở ở hai tab không lẫn, và link gửi cho đồng nghiệp mở đúng cơ sở. Quyền vẫn xét theo cặp (cơ sở, vai trò) của tài khoản.
- Slug theo BR-72: chữ thường không dấu, số, gạch ngang, duy nhất, không trùng từ dành riêng (`app`, `admin`, `login`...).
- Trạng thái xem đặt trong query để chia sẻ link và tải lại không mất: `?date=2026-11-07`, `?view=resources`, `?branch=q3`, `?step=time`.
- **Mock** dùng đúng route thật, thêm tiền tố `/mock`: `/mock/toc-may/book`, `/mock/app/toc-may/calendar`. Đổi cơ sở là đổi slug trong URL. Các route mock hiện có (`/mock/dat-lich`, `/mock/le-tan`, `/mock/hom-nay`) đổi tên sau khi PR #2 merge.

## A. Tài khoản và đăng ký cơ sở

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-01 | Trang giới thiệu Sapio | `/` | Ai cũng xem | 1 | Nhẹ | Sapio là gì, ảnh lịch nhiều cột, nút "Đăng ký cơ sở" |
| MH-02 | Đăng ký cơ sở | `/signup?step=account\|verify\|industry\|business\|done` | CCS | 1 | Vẽ | Tài khoản → mã xác thực email → **chọn ngành** → tên, slug, chi nhánh đầu tiên, giờ mở cửa → xem trước dịch vụ mẫu từ gói ngành rồi tạo. BR-70 |
| MH-03 | Đăng nhập | `/login` | Nhân sự | 1 | Nhẹ | Email + mật khẩu; khóa tạm sau nhiều lần sai |
| MH-04 | Quên và đặt lại mật khẩu | `/forgot-password`, `/reset-password` | Nhân sự | 1 | Nhẹ | |
| MH-05 | Nhận lời mời | `/invite/[token]` | LT, KTV, QL | 1 | Nhẹ | Thấy tên cơ sở, vai trò được mời; đặt mật khẩu hoặc nhận bằng tài khoản có sẵn |
| MH-06 | Chọn cơ sở | `/select-workspace` | Nhân sự | 1 | Nhẹ | Khi tài khoản thuộc nhiều cơ sở |

## B. Khung chung

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-07 | Khung ứng dụng | mọi route `/app/[tenant]` | Nhân sự | 1 | Vẽ | Thanh bên theo vai trò, đổi chi nhánh, tìm nhanh khách, menu tài khoản, nút sáng/tối. Máy tính: thanh bên; iPad: thu gọn thành icon; điện thoại: thanh điều hướng dưới (như `LeTanDienThoai`) |
| MH-08 | Mẫu trang danh sách | | | 1 | Vẽ | Dùng cho mọi màn mức DS |
| MH-09 | Mẫu trang form | | | 1 | Vẽ | Dùng cho mọi màn mức Form; có thanh "Còn thay đổi chưa lưu" |
| MH-10 | Trang lỗi và trạng thái | | Mọi người | 1 | Nhẹ | 404, 403 "Không có quyền", lỗi máy chủ, cơ sở bị khóa (trang khách và nội bộ nói khác nhau), mất kết nối realtime |

## C. Khách hàng: `/[tenant]`

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-11 | Trang cơ sở | `/[tenant]` | KH | 1 | Vẽ | Tên, ảnh, địa chỉ chi nhánh, giờ mở cửa, nhóm dịch vụ và giá, nhân viên (hồ sơ công khai, BR-15), chính sách hủy; nút "Đặt lịch" |
| MH-12 | Luồng đặt lịch | `/[tenant]/book?step=...` | KH | 1 | Vẽ | **Đang làm** (D-12, D-13, D-14). BR-03, BR-06, BR-07, BR-13, BR-14, BR-16, BR-17 |
| MH-13 | Đặt nhiều dịch vụ | trong MH-12 | KH | 1 | Vẽ | Thêm dịch vụ vào giỏ, thứ tự làm, cùng hay khác thợ; giờ trống tính cho cả chuỗi (BT1) |
| MH-14 | Đặt nhóm | trong MH-12 | KH | 1 | Vẽ | Nhiều người hoặc nhiều bé cùng giờ, mỗi đối tượng một dịch vụ; không đủ chỗ thì gợi ý giờ lệch nhau |
| MH-15 | Trả tiền cọc | `/[tenant]/book/pay` | KH | 2 | Vẽ | QR của provider giả lập (D-09), đếm ngược giữ chỗ, kết quả thanh toán; trả xong mà giữ chỗ đã hết hạn (BR-07, BR-21) |
| MH-16 | Đăng nhập khách | `/[tenant]/login` | KH | 1 | Nhẹ | Email → mã 6 số (BR-16); phiên gắn với cơ sở |
| MH-17 | Lịch của tôi | `/[tenant]/me` | KH | 1 | Nhẹ | Sắp tới, đã qua; đặt lại lịch cũ |
| MH-18 | Chi tiết lịch hẹn của khách | `/[tenant]/me/appointments/[id]` | KH | 1 | Vẽ | Đổi giờ (BR-08: trước X giờ, tối đa N lần), hủy kèm mức hoàn cọc (BR-23); hết hạn tự đổi thì hiện số điện thoại cơ sở |
| MH-19 | Đối tượng được phục vụ | `/[tenant]/me/subjects` | KH | 1 | Form | Thuộc tính theo schema của ngành (BR-71). Ngành không có đối tượng khác thì không hiện mục này |
| MH-20 | Gói và ví | `/[tenant]/me/wallet` | KH | 2 | Nhẹ | Số buổi còn và hạn của gói; số dư tiền thật, tiền tặng; lịch sử |
| MH-21 | Thông tin cá nhân | `/[tenant]/me/profile` | KH | 1 | Form | Họ tên, số điện thoại, email; đồng ý nhận quảng cáo (BR-64) |
| MH-22 | Khung chat đặt lịch | nổi trên MH-11, MH-12 | KH | 3 | Vẽ | BT7: hỏi giá, giờ; giữ chỗ rồi chuyển sang bước OTP; "Gặp lễ tân" |
| MH-23 | Email gửi khách | | KH | 1 (OTP), 3 | Nhẹ | Mã OTP, xác nhận lịch, nhắc 24h và 2h, đã đổi, đã hủy, đã hoàn tiền |

## D. Lễ tân và thu ngân: `/app/[tenant]`

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-24 | Lịch | `/app/[tenant]/calendar?view=staff\|resources&date=` | LT, QL, CCS | 1 | Vẽ | **Đang làm**. Hai kiểu xem, bảng chi tiết (D-12) |
| MH-25 | Hôm nay | `/app/[tenant]/today` | LT | 1 | Vẽ | **Đang làm**. Đang làm, chờ thanh toán, sắp đến |
| MH-26 | Tạo lịch hẹn | ngăn trượt trên MH-24; `/app/[tenant]/appointments/new` trên điện thoại | LT | 1 | Vẽ | Tìm hoặc tạo khách theo số điện thoại (BR-61), khách vãng lai, dịch vụ, thợ, giờ trống; bấm ô trống trên lịch thì điền sẵn giờ và cột |
| MH-27 | Kéo thả đổi giờ, đổi người | trong MH-24 | LT | 1 | Vẽ | Kiểm ràng buộc khi đang kéo (ô không hợp lệ tô `danger-soft`), thả xong có Hoàn tác (D-14); lịch "bất kỳ ai" và lịch chọn đích danh xử lý khác nhau |
| MH-28 | Chi tiết lịch hẹn | `/app/[tenant]/appointments/[id]` | LT, KTV | 1 | Nhẹ | Trang riêng cho điện thoại; nội dung như bảng chi tiết của MH-24 |
| MH-29 | Thu tiền | `/app/[tenant]/checkout/[appointmentId]` | LT | 2 | Vẽ | Hóa đơn từ lịch hẹn, thêm bán lẻ, trừ cọc, trừ buổi gói, dùng ví, giảm giá (BR-22), nhiều phương thức, QR; bấm hai lần chỉ ghi một lần (BR-21) |
| MH-30 | Bán gói, nạp ví | `/app/[tenant]/sales/new?type=package\|wallet` | LT | 2 | Form | Chọn khách, gói hoặc số tiền nạp, tiền tặng kèm; qua MH-29 để thu |
| MH-31 | Hóa đơn | `/app/[tenant]/invoices`, `/invoices/[id]` | LT, CCS | 2 | DS | Cột: số, giờ, khách, tổng, phương thức, trạng thái; chi tiết có in và "Yêu cầu hoàn tiền" |
| MH-32 | Khách hàng | `/app/[tenant]/customers` | LT, CCS | 1 | DS | Tìm theo tên, số điện thoại chuẩn hóa; cột: lần đến gần nhất, số lần, số lần không đến |
| MH-33 | Hồ sơ khách | `/app/[tenant]/customers/[id]` | LT, CCS | 1 (tiền ở 2) | Vẽ | Lịch sử, ghi chú nội bộ (BR-62), đối tượng được phục vụ, gói, ví, bắt buộc cọc (BR-10) |
| MH-34 | Hoàn tiền | `/app/[tenant]/refunds` | LT tạo, QL/CCS duyệt | 2 | DS | Lý do bắt buộc, chờ duyệt (BR-28); duyệt thì thu hồi hoa hồng và hoàn buổi gói |

## E. Kỹ thuật viên (ưu tiên điện thoại)

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-35 | Lịch của tôi | `/app/[tenant]/my/schedule` | KTV | 1 | Vẽ | Chỉ lịch của mình, theo ngày và tuần; cập nhật trạng thái dịch vụ; ghi chú về khách (không thấy số điện thoại nếu cơ sở tắt) |
| MH-36 | Xin nghỉ | `/app/[tenant]/my/time-off` | KTV | 1 | Form | Chọn ngày, cả ngày hay vài giờ, lý do; thấy trước số lịch bị ảnh hưởng |
| MH-37 | Hoa hồng tạm tính | `/app/[tenant]/my/commission` | KTV | 3 | Nhẹ | Kỳ đang mở, từng dịch vụ, khoản bị thu hồi |

## F. Quản lý chi nhánh

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-38 | Xếp ca | `/app/[tenant]/shifts?week=` | QL, CCS | 1 | Vẽ | Lưới tuần × nhân viên, nhiều khung mỗi ngày, chép tuần trước; bớt ca mà còn lịch thì cảnh báo |
| MH-39 | Đơn nghỉ phép | `/app/[tenant]/time-off` | QL, CCS | 1 | DS | Cột: nhân viên, thời gian, số lịch bị ảnh hưởng, trạng thái |
| MH-40 | Xử lý lịch bị ảnh hưởng | `/app/[tenant]/time-off/[id]` | QL, CCS | 1 | Vẽ | BR-11: từng lịch bị ảnh hưởng, gợi ý người thay còn trống, khách chọn đích danh thì gửi hỏi ý; chỉ duyệt được khi mọi lịch đã xử lý |

Báo cáo chi nhánh dùng chung MH-55 với bộ lọc chi nhánh.

## G. Chủ cơ sở: `/app/[tenant]`

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-41 | Tổng quan | `/app/[tenant]` | CCS, QL | 3 | Vẽ | Hôm nay: số lịch, đang làm, doanh thu; tuần: lấp đầy, không đến; việc cần xử lý (nghỉ phép, hoàn tiền chờ duyệt) |
| MH-42 | Chi nhánh | `/app/[tenant]/settings/branches` | CCS | 1 | DS | |
| MH-43 | Chi tiết chi nhánh | `/app/[tenant]/settings/branches/[id]` | CCS | 1 | Vẽ | Giờ mở cửa nhiều khung mỗi ngày, ngày đặc biệt (BR-02), giá riêng của chi nhánh |
| MH-44 | Dịch vụ | `/app/[tenant]/settings/services` | CCS | 1 | DS | Nhóm dịch vụ, kéo đổi thứ tự, bật/tắt đặt online |
| MH-45 | Chi tiết dịch vụ | `/app/[tenant]/settings/services/[id]` | CCS | 1 | Vẽ | **Màn đặc trưng thứ hai.** Biến thể theo thuộc tính đối tượng (BR-13); các đoạn chiếm dụng vẽ trên trục thời gian, mỗi đoạn chọn loại tài nguyên (BR-04, BR-05); kỹ năng (BR-03); giá theo cấp nhân viên; xem trước khối lịch hẹn như trên lịch lễ tân |
| MH-46 | Tài nguyên | `/app/[tenant]/settings/resources` | CCS | 1 | DS | Nhóm theo loại (từ gói ngành), chi nhánh, tạm ngưng bảo trì kèm số lịch bị ảnh hưởng |
| MH-47 | Nhân sự | `/app/[tenant]/settings/staff` | CCS | 1 | DS | Mời, vai trò, chi nhánh, nhận đặt online |
| MH-48 | Hồ sơ nhân viên | `/app/[tenant]/settings/staff/[id]` | CCS | 1 | Form | Hai lớp hồ sơ (BR-15), kỹ năng, cấp, chi nhánh, vai trò |
| MH-49 | Chính sách | `/app/[tenant]/settings/policies` | CCS | 1 (cọc ở 2) | Form | Tham số X, Y, N, M, K của BR-06 đến BR-10; mức hoàn cọc (BR-23); mỗi trường có câu giải thích bằng ví dụ |
| MH-50 | Thương hiệu và trang đặt lịch | `/app/[tenant]/settings/branding` | CCS | 1 | Form | Logo, ảnh bìa, màu nhấn (kiểm tương phản 4.5:1 như token `tenant-*`), slug, xem trước MH-11 |
| MH-51 | Gói liệu trình | `/app/[tenant]/settings/packages` | CCS | 2 | Form | Số buổi, dịch vụ áp dụng, giá, hạn dùng |
| MH-52 | Thanh toán | `/app/[tenant]/settings/payments` | CCS | 2 | Nhẹ | Provider giả lập (D-09), phương thức nhận tại quầy |
| MH-53 | Thông báo | `/app/[tenant]/settings/notifications` | CCS | 3 | Form | Bật/tắt nhắc 24h, 2h; xem trước email |
| MH-54 | Chatbot | `/app/[tenant]/settings/chatbot` | CCS | 3 | Form | Bật/tắt, lời chào, giới hạn lượt |
| MH-55 | Báo cáo | `/app/[tenant]/reports` | CCS, QL | 3 | Vẽ | Doanh thu, tiền trả trước và doanh thu thực hiện, lấp đầy, không đến; lọc chi nhánh và khoảng ngày |
| MH-56 | Hoa hồng | `/app/[tenant]/commission`, `/commission/periods/[id]` | CCS | 3 | Vẽ | Quy tắc có ngày hiệu lực (BR-41), chia nhiều thợ (BR-43), chốt kỳ, khoản thu hồi vào kỳ sau (BR-42) |
| MH-57 | Nhật ký thao tác | `/app/[tenant]/audit-log` | CCS | 3 | DS | BR-63; cột: giờ, người, thao tác, đối tượng |

## H. Quản trị nền tảng: `/admin`

| Mã | Màn hình | Route | Vai trò | Đợt | Mức | Ghi chú |
|---|---|---|---|---|---|---|
| MH-58 | Khách thuê | `/admin/tenants`, `/admin/tenants/[id]` | QTNT | 1 | DS | Duyệt, khóa, mở khóa; chi tiết chỉ có số liệu tổng (số chi nhánh, số lịch tháng), **không** xem dữ liệu khách của cơ sở |
| MH-59 | Gói cấu hình ngành | `/admin/templates`, `/admin/templates/[id]` | QTNT | 1 | Vẽ | **Màn chứng minh BT8.** Loại tài nguyên, dịch vụ mẫu có đoạn chiếm dụng, từ ngữ hiển thị (thợ/groomer, khách/bé), schema đối tượng được phục vụ, chính sách mặc định; sửa gói không ảnh hưởng cơ sở đã tạo (BR-70) |
| MH-60 | Tổng quan nền tảng | `/admin` | QTNT | 3 | Nhẹ | Số cơ sở theo ngành, số lịch đặt, cơ sở mới |

## Tổng hợp

| Đợt | Vẽ | DS | Form | Nhẹ | Cộng |
|---|---|---|---|---|---|
| 1 | 20 | 7 | 6 | 10 | 43 |
| 2 | 2 | 2 | 2 | 2 | 8 |
| 3 | 4 | 1 | 2 | 2 | 9 |
| **Cộng** | **26** | **10** | **10** | **14** | **60** |

Đợt 1 nhiều nhất vì giai đoạn 2–3 là phần lớn mã nguồn. Trong đợt 1, thứ tự vẽ đề xuất:

1. **Khung và mẫu:** MH-07, MH-08, MH-09.
2. **Đăng ký có chọn ngành:** MH-02.
3. **Cấu hình dịch vụ:** MH-45, cùng MH-59 vì dùng chung phần soạn đoạn chiếm dụng.
4. **Nghiệp vụ lịch:** MH-26, MH-27, MH-38, MH-40.
5. **Phía khách:** MH-11, MH-13, MH-14, MH-18.
