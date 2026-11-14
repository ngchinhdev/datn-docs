---
title: Tiến độ
description: Nhật ký tiến độ theo tuần. Mỗi phiên làm việc kết thúc bằng một dòng ở đây.
---

**Quy ước:** mới nhất ở trên. Mỗi mục ghi: đã làm gì, vướng gì, việc tiếp theo. Cuối đồ án, trang này dùng làm phụ lục báo cáo.

## Tuần 2 (09/11 – 15/11/2026)

### 14/11/2026 (đêm muộn): mock trợ lý đặt lịch (Bước 18, đợt H)

- **Đã làm** (nhánh `feat/mock-assistant`, mỗi mục 18a–18e một commit):
  - 18a: `mock/assistant.ts`, hàm thuần nhận `now`: nhận ý định bằng từ khóa, trả tin kèm thẻ (dịch vụ, giờ trống, giữ chỗ, lễ tân, hết lượt), đếm lượt (BR-67), hàm cho biết nút có hiện không (BR-92).
  - 18b: khung chat `components/mock/assistant-chat.tsx` và store trong layout trang khách; nút nổi trên `/mock/[tenant]` và các bước Dịch vụ, Ngày giờ; toàn màn hình trên điện thoại, góc phải dưới từ 1024 px.
  - 18c: `mock/assistant-hold.ts`: bấm giờ trong thẻ tạo lịch trạng thái giữ chỗ 10 phút (chưa có khách) trên lịch cơ sở, rồi sang `/book?giu=1` qua `useBookingDraft`; thẻ giữ chỗ đọc trạng thái từ lịch (đếm ngược, đã dùng, đã trả lại); hết giờ thì đưa các giờ còn trống của thợ đó.
  - 18d: công cụ mock "Tua 10 phút", "Dùng hết lượt hôm nay"; MH-22 "Đang làm".
  - 18e: `pnpm check:assistant` (35 ca); các lệnh kiểm xanh.
- **Tự quyết:**
  - `ChatHoi` và `ChatGiuCho` đặt giờ trong câu chữ của trợ lý ("Mai còn trống 14:15 và 16:15"); BR-92 cấm, nên mock chỉ đặt giờ và tiền trong thẻ.
  - `ChatGioiHan` hiện cả ba loại sau "Poodle, 6 kg"; Bước 18 và BR-13 yêu cầu đúng một loại, mock theo Bước 18 (Tắm chó nhỏ 150.000 ₫).
  - Thẻ giá hiện giá thấp nhất và giá bậc cao nhất của những người nhận đặt online (BR-56): Nhuộm ngắn 500.000 ₫ và 550.000 ₫, vì bậc 600.000 ₫ không có người nhận online.
  - Spa thú cưng: "Xác nhận bằng email" mở bước `subject` thay cho `info`, vì tên bé bắt buộc mà trợ lý không hỏi; loài và cân nặng đã điền sẵn, đồng hồ giữ chỗ chạy ở cả hai bước.
  - Dùng thử (`?plan=trial`) vẫn có nút theo BR-92 nhưng không giữ chỗ, vì cơ sở chưa nhận đặt lịch online (BR-81); trợ lý vẫn hỏi giá và giờ.
  - Khung chat không hiện khi đang đổi giờ một lịch có sẵn (`?doi=`).
  - Câu "Trợ lý nghỉ đến 00:00" nằm trong thẻ hết lượt, không nằm trong câu của trợ lý.
- **Ghi chú cho ERD:** giữ chỗ của trợ lý là một dòng `appointments` trạng thái `held`, `customer_id` null, giống giữ chỗ của luồng đặt lịch; hết hạn thì loại khỏi giờ bận bằng `hold_expires_at` (VD9).
- **Tiếp theo:** người dùng kiểm "Xong khi" của Bước 18 và review PR.

### 14/11/2026 (đêm muộn): merge Bước 17, chốt đợt H, trợ lý đặt lịch

- **Đã làm:**
  - Review và merge PR #12 (Bước 17). Người dùng tự kiểm mục "Xong khi" sau.
  - Vẽ và chốt đợt H (4 bảng, MH-22): nút "Hỏi trợ lý" và hỏi giá, hỏi giờ; giữ chỗ rồi sang bước Thông tin liên hệ; gặp lễ tân, hết lượt, spa thú cưng; khung chat trên máy tính.
  - Quy tắc: BR-92 trợ lý đặt lịch (khi nào hiện, số liệu chỉ trong thẻ, một dịch vụ một người, giữ chỗ rồi OTP, gặp lễ tân, đếm lượt, lưu 30 ngày).
  - Viết Bước 18 (`feat/mock-assistant`).
- **Vướng:** khách sửa hoặc mua gói ở trang Gói Sapio thì trang quản trị nền tảng không thấy (store của cơ sở không ghi về store nền tảng). Chỉ là giới hạn của mock; app thật có một bảng `subscriptions`.
- **Ghi chú cho ERD:**
  - `chat_conversations`: tenant_id, customer_id (null khi chưa có phiên), browser_key, started_at, hold_id (giữ chỗ đang mở, tối đa một).
  - `chat_messages`: conversation_id, role (khách, trợ lý, hệ thống), text, cards (jsonb: loại thẻ và tham số tool đã gọi), created_at; xóa sau 30 ngày.
  - Đếm lượt: theo `chat_messages` của khách trong ngày (giờ chi nhánh) và trong tháng của cơ sở; `chatbot_settings.used_this_month` có thể là số đếm dẫn xuất.
  - Giữ chỗ từ trợ lý dùng chung cơ chế với luồng đặt lịch: lịch hẹn trạng thái `held` (ERD không có bảng `holds`), thêm cột `source` (web, assistant) vào `appointments`. Mock Bước 18 đã làm đúng cách này.
- **Tiếp theo:** Claude Code làm Bước 18; người dùng kiểm Bước 17; báo cô D-15.

### 14/11/2026 (đêm): mock quản trị nền tảng (Bước 17, đợt G)

- **Đã làm** (nhánh `feat/mock-admin`, mỗi mục 17a–17f một commit):
  - 17a: `mock/fixtures/platform.ts` (23 cơ sở), `mock/platform.ts` (trạng thái gói, số tổng quan, lọc, khóa, gia hạn, thay đổi gói), `pnpm check:platform` (48 ca). Giá gói và % giảm theo kỳ vào store (`platform-store.tsx`); trang giới thiệu, trang Gói Sapio, phần nâng gói, trang đặt lịch của khách đọc từ đó.
  - 17b: `/mock/admin` tổng quan.
  - 17c: `/mock/admin/tenants` danh sách, bộ lọc trên URL.
  - 17d: `/mock/admin/tenants/[id]` chi tiết; khóa, mở khóa, gia hạn thủ công; `/mock/admin/audit-log`.
  - 17e: `/mock/admin/plans` gói và giá.
  - 17f: `mock/screens.ts` MH-58, MH-60, MH-62 "Đang làm"; mọi lệnh kiểm xanh.
- **Tự quyết:**
  - Dùng thử 7 ngày tính cả ngày tạo (BR-80) không dựng đúng cùng lúc "5 cơ sở mới" và "1 hết trong 3 ngày" của bảng; Barber Anh Tuấn tạo 04/11, nên "Cơ sở mới" không còn Spa Mèo Ú (vẫn mở được từ "Sắp hết hạn").
  - Số "Thu tháng 11" tính từ dữ liệu: 5.451.000 ₫, 11 giao dịch (bảng ghi 5.183.000 ₫, 12); không dựng lại được mà vẫn giữ 9 Cơ bản + 6 Chuyên nghiệp.
  - Gói có hơn 1 chi nhánh thì có tính năng nhiều chi nhánh; bảng không có công tắc riêng cho tính năng này.
  - Số cơ sở bị ảnh hưởng khi tắt tính năng của Chuyên nghiệp gồm cả cơ sở dùng thử (BR-81).
  - Lý do mở khóa chỉ cần không trống; email mở khóa không kèm lý do (BR-90).
  - Mở khóa, khóa, gia hạn cùng gửi thư vào hộp thư mẫu `/mock/mailbox`.
  - Route `/mock/admin/[...rest]` (trang "Chưa làm") đổi từ catch-all tùy chọn sang bắt buộc, vì Next không cho trùng với `/mock/admin`.
- **Ghi chú cho ERD:** khóa và gia hạn thủ công ghi `platform_audit_log` kèm `reason`; thanh toán gói lưu giá lúc trả nên đổi giá không động tới kỳ đã trả.
- **Tiếp theo:** người dùng kiểm Bước 17 và review PR; phiên claude.ai vẽ đợt H (MH-22 chatbot).

### 14/11/2026 (chiều muộn): chốt đợt G, quản trị nền tảng

- **Đã làm:**
  - Vẽ và chốt đợt G (6 bảng):
    - MH-60 tổng quan nền tảng;
    - MH-58 danh sách khách thuê, chi tiết cơ sở, hộp khóa cơ sở, hộp gia hạn thủ công;
    - MH-62 gói và giá.
  - Quy tắc:
    - BR-83 thêm phần quản trị sửa gói: đổi giá chỉ áp lần thanh toán sau; tắt tính năng hoặc giảm chi nhánh phải xác nhận.
    - BR-89 quản trị nền tảng chỉ thấy số tổng; trạng thái gói tách khỏi cờ khóa.
    - BR-90 khóa, mở khóa có lý do; gói vẫn chạy khi khóa.
    - BR-91 gia hạn thủ công tối đa 90 ngày, không tạo khoản thu.
  - Viết Bước 17 (`feat/mock-admin`).
- **Ghi chú cho ERD:**
  - `tenants`: thêm `unlocked_at`, `unlock_reason` (hoặc bảng `tenant_locks` giữ lịch sử khóa, mở khóa).
  - `subscription_adjustments`: tenant_id, days, old_end, new_end, reason, admin_id, created_at (gia hạn thủ công, không vào sổ).
  - `plans`: code, name, monthly_price_vnd, short_note, max_branches (null là không giới hạn), features; `period_discounts`: months, percent. Thanh toán gói lưu giá lúc trả.
  - `platform_audit_log` cho khóa, mở khóa, gia hạn, đổi gói.
  - Tài khoản quản trị nền tảng là cờ trên `users`, không phải thành viên của cơ sở.
- **Tiếp theo:** Claude Code làm Bước 17; phiên claude.ai vẽ đợt H (MH-22 chatbot).

### 14/11/2026 (tối, sau review): chốt Bước 16

- **Đã làm:**
  - Review PR #11 (Bước 16). Claude Code sửa hai điểm:
    - quản lý chỉ gửi lại, thu hồi lời mời của vai mình mời được;
    - không tạo lời mời thứ hai cho email đang có lời mời chờ nhận.
  - Người dùng đã merge.
  - BR-78 thêm hai ý trên. BR-79 ghi rõ nhân viên không thấy cả lý do lẫn thời điểm khóa.
  - Bảng `NhanLoiMoiCoTaiKhoan` đổi sang `nam.tran@email.vn` được mời vào Pawpaw (Thảo Điền, Lê Thu Hà mời), khớp mock; thêm nút "Từ chối lời mời" như bảng `NhanLoiMoi`.
- **Ghi chú cho ERD:** `invitations` có ràng buộc một lời mời `pending` còn hạn cho mỗi (tenant_id, email). Khi mời mới sau lời mời đã hết hạn, đánh dấu lời mời cũ là `revoked` để danh sách chỉ còn một dòng cho mỗi email.
- **Tiếp theo:** phiên claude.ai vẽ đợt G (quản trị nền tảng: MH-58, MH-60, MH-62).

### 14/11/2026 (tối): mock tài khoản và khung (Bước 16, đợt F)

- **Đã làm** (nhánh `feat/mock-account`, mỗi mục 16a–16g một commit):
  - 16a: `mock/fixtures/accounts.ts` (tài khoản, thành viên, lời mời), `mock/account.ts` (đăng nhập, đặt lại mật khẩu, lời mời, đi đâu sau đăng nhập), `pnpm check:account`. Lễ tân là Linh ở cả hai cơ sở; Lan và Vy chỉ còn là kỹ thuật viên. Quản lý có cột lịch (Hùng, Khoa) xem được "Hoa hồng của tôi".
  - 16b: `/mock/login`, `/mock/forgot-password`, `/mock/reset-password`, `/mock/mailbox`; đồng hồ mock có nút "Cho thời gian trôi 15 phút".
  - 16c: `/mock/invite/[token]`, `/mock/select-workspace`; người nhận khách có cột lịch với hồ sơ trống.
  - 16d: Nhân sự liệt kê mọi thành viên, bảng lời mời đang chờ, hộp "Mời nhân viên".
  - 16e: 403 trong khung với một hàm quyền (`mock/permissions.ts`) cho menu và trang, 404, 500, cơ sở bị khóa, trang khách tạm dừng, dải mất kết nối.
  - 16f: `/mock/landing`, bảng giá đọc từ dữ liệu gói.
  - 16g: `mock/screens.ts`: MH-01, MH-03 đến MH-06, MH-10 "Đang làm", ghi chú MH-47.
- **Tự quyết:**
  - Thư của trang tài khoản (đặt lại mật khẩu, báo khóa, lời mời) hiện ở `/mock/mailbox`, không gắn cơ sở.
  - Mọi tài khoản mẫu dùng chung mật khẩu `ca phe sua da buoi sang`, ghi trong `accounts.ts`.
  - Lời mời mẫu cho tài khoản đã có là `nam.tran@email.vn` vào Pawpaw, vì Linh đã là thành viên Tóc Mây (BR-78 cấm mời).
  - Quản lý chỉ mở được `settings/staff` trong Cài đặt, và không sửa hồ sơ nhân viên.
  - Trang khóa cơ sở: nhân viên không thấy lý do lẫn thời điểm khóa.
  - Bỏ các thông báo chặn riêng ở Tổng quan, Báo cáo, Hoa hồng; hàm quyền thay chúng.
  - Công cụ mock: menu tài khoản trong app (Khóa cơ sở, Mất kết nối, trang lỗi 500), nút "Khóa cơ sở" ở thanh trên trang khách, thanh đồng hồ và hộp thư ở trang tài khoản.
  - Hóa đơn, hoàn tiền, nhật ký mẫu ghi Linh thu thay cho Lan và Vy.
- **Ghi chú cho ERD:**
  - Đếm đăng nhập sai theo email, kể cả email không có tài khoản.
  - Nhật ký có thêm bốn thao tác: Gửi lời mời, Gửi lại lời mời, Thu hồi lời mời, Nhận lời mời.
- **Tiếp theo:** người dùng kiểm Bước 16 và review PR; phiên claude.ai vẽ đợt G (quản trị nền tảng: MH-58, MH-60, MH-62).

### 14/11/2026 (chiều): chốt đợt F, tài khoản và khung

- **Đã làm:**
  - Review PR #10 (Bước 15): thu hồi hoa hồng khi hoàn không theo dòng tính dư nếu hóa đơn có dòng bán lẻ không ghi người bán; Claude Code sửa mẫu số cho giống `revenueItems` và thêm ca vào `check:reports`. Người dùng đã merge.
  - Vẽ và chốt đợt F (14 bảng):
    - MH-01 trang giới thiệu;
    - MH-03 đăng nhập, bị tạm khóa;
    - MH-04 quên mật khẩu, đặt mật khẩu mới;
    - MH-05 nhận lời mời (chưa có và đã có tài khoản);
    - MH-06 chọn cơ sở;
    - MH-47 phần mời nhân viên;
    - MH-10 403, 404 và 500, mất kết nối, cơ sở bị khóa (nội bộ và trang khách).
  - Quy tắc mới BR-76 (đăng nhập, tạm khóa, phiên), BR-77 (đặt lại mật khẩu), BR-78 (lời mời, một vai trò mỗi cơ sở), BR-79 (vào cơ sở, cơ sở tạm dừng hoặc bị khóa, trang lỗi).
  - Dữ liệu mẫu trên bảng: thêm lễ tân Phạm Khánh Linh (không nhận khách trên lịch); Lan chỉ là kỹ thuật viên, khớp "một vai trò mỗi cơ sở".
  - Sửa ghi chú bảng `HoaHong`: quy tắc mới chỉ áp cho hóa đơn thu từ ngày hiệu lực (BR-41).
  - Kế hoạch Bước 16 (nhánh `feat/mock-account`), gồm việc còn lại của Bước 15: thành viên có cột lịch (như quản lý Hùng) xem được hoa hồng của mình.
- **Ghi chú cho ERD:**
  - `users`: `email` duy nhất, `password_hash`, `failed_login_count`, `locked_until`, `last_tenant_id`.
  - `sessions`: `token_hash`, `user_id`, `persistent`, `expires_at`, `last_used_at`; đổi mật khẩu thì xóa các phiên khác.
  - `password_reset_tokens`: `token_hash`, `user_id`, `expires_at`, `used_at`; tạo token mới thì token cũ hết hiệu lực.
  - `invitations`: `tenant_id`, `email`, `role`, `branch_id?` (rỗng là tất cả), `takes_bookings`, `token_hash`, `invited_by`, `expires_at`, `status` (`pending`, `accepted`, `declined`, `revoked`), `accepted_at`; hết hạn tính từ `expires_at`, không cần job.
  - `memberships`: duy nhất theo (`tenant_id`, `user_id`), `role`, `branch_id?`, `staff_resource_id?`.
  - `tenants`: `locked_at`, `locked_reason`, `locked_by`.
- **Tiếp theo:** Claude Code làm Bước 16; phiên claude.ai vẽ đợt G (quản trị nền tảng: MH-58, MH-60, MH-62).

### 14/11/2026 (tối): mock tổng quan, báo cáo, hoa hồng (Bước 15, đợt E)

- **Đã làm** (nhánh `feat/mock-reports`, mỗi mục 15a–15g một commit):
  - 15a: quy tắc hoa hồng trong store (phạm vi, cấp, tỉ lệ, ngày hiệu lực; cụ thể hơn thắng), `mock/commission.ts`. Khoản hoa hồng gắn từng dòng hóa đơn và nhớ quy tắc, tỉ lệ, số tính trên. Kỳ theo tháng giờ chi nhánh, thu hồi vào kỳ của ngày duyệt hoàn với tỉ lệ của dòng gốc, kỳ đã chốt không nhận thêm. Dòng bán lẻ ở Thu tiền có ô "Người bán".
  - 15b: `mock/reports.ts` (doanh thu thực hiện, tiền thu vào, trả trước còn giữ, lấp đầy, không đến, theo ngày, nhân viên, dịch vụ).
  - 15c: `/app/[tenant]` là Tổng quan (MH-41) cho chủ cơ sở và quản lý.
  - 15d: `/reports` (MH-55), xuất CSV ghi nhật ký.
  - 15e: `/commission` và `/commission/periods/[id]` (MH-56): thêm, sửa quy tắc, chốt kỳ.
  - 15f: `/my/commission` (MH-37).
  - 15g: ngày đặc biệt nhiều khung giờ; ô "Tên miền" ở Thương hiệu.
  - `pnpm check:reports` (script mới).
- **Tự quyết:**
  - Dữ liệu mẫu có thêm một hóa đơn đã thu cho mỗi lịch hoàn thành từ 01/10 (`mock/fixtures/sales-history.ts`), để báo cáo và hoa hồng có số. Hóa đơn mới nhất của Tóc Mây là HĐ-0230; Pawpaw đánh lại số từ HĐ-0001. Thêm ba buổi gói của anh Phúc và một hoàn tiền duyệt 05/11 cho hóa đơn tháng 10 của Mai.
  - Kỳ 09/2026 đã chốt nhưng trống: quy tắc "mọi dịch vụ 10%" có hiệu lực từ 01/10 như bảng `HoaHong`.
  - "Tháng này" so với cùng các ngày của tháng trước (bảng `BaoCao`); các khoảng khác so với khoảng liền trước cùng độ dài. Ngày 07/11, "7 ngày" và "Tháng này" cùng bao 01–07/11 nên cùng số.
  - Hoàn tiền một gói trừ vào "trả trước còn giữ" đúng số tiền trả lại; hoàn tiền không gắn dòng nào chia theo giá trị các dòng.
  - Quy tắc sửa mà chưa tới ngày hiệu lực thì sửa tại chỗ; đã áp thì thêm quy tắc mới từ ngày chọn.
  - Quản lý thấy mục Tổng quan, không thấy dòng nhắc chốt kỳ (chỉ chủ cơ sở).
- **Ghi chú cho ERD:**
  - `commission_entries` thêm `line_id`, `rule_id`, `percent`, `base_vnd`, `source`, `session_no`; `commission_periods` thêm `closed_at`, `closed_by`.
  - `special_day_windows` (ngày đặc biệt có nhiều khung, rỗng là đóng cửa cả ngày).
- **Tiếp theo:** người dùng kiểm Bước 15 và review PR; phiên claude.ai vẽ đợt F (tài khoản và khung: MH-01, MH-03 đến MH-06, MH-10).

### 14/11/2026 (sáng): chốt đợt E, tổng quan, báo cáo, hoa hồng

- **Đã làm:**
  - Review và cho merge PR #9 (Bước 14) sau bản sửa màn Xếp ca đọc đủ các khung mở cửa.
  - Vẽ và chốt đợt E (5 bảng):
    - MH-41 tổng quan;
    - MH-55 báo cáo;
    - MH-56 hoa hồng, chi tiết kỳ của một người;
    - MH-37 hoa hồng tạm tính của kỹ thuật viên.
  - Quy tắc:
    - BR-40 thêm cách tính dòng bán lẻ, buổi gói; bán gói và nạp ví không có hoa hồng.
    - BR-41 quy tắc theo phạm vi × cấp × tỉ lệ × ngày hiệu lực, cụ thể hơn thắng.
    - BR-42 kỳ theo tháng, chốt tay, khoản thu hồi vào kỳ của ngày duyệt hoàn (trước đây ghi "kỳ mở kế tiếp", không rõ khi có hai kỳ chưa chốt). Sửa theo ở BR-28, BT5.
    - Bỏ BR-43 (chia hoa hồng nhiều thợ): mỗi mục lịch chỉ có một người làm.
    - BR-44 kỹ thuật viên chỉ thấy hoa hồng của mình.
    - Mục mới "Báo cáo": BR-45 doanh thu thực hiện, BR-46 tiền thu vào và tiền trả trước, BR-47 lấp đầy và không đến.
    - Bỏ câu hỏi mở về hoa hồng buổi gói (đã trả lời ở BR-26).
  - Sửa bảng `ThuongHieu`, `ChatbotCaiDat` theo T-16: địa chỉ `toc-may.sapio.vn`. Sửa bảng `HoaHong`, `HoaHongKy` cho khớp BR-42 và khớp số thu hồi.
  - Kế hoạch Bước 15 (nhánh `feat/mock-reports`), gồm hai việc còn lại của Bước 14: ngày đặc biệt nhiều khung, ô tên miền ở Thương hiệu.
- **Ghi chú cho ERD:**
  - `commission_rules`: phạm vi (`all`, `service`, `retail`), `service_id?`, `staff_level?`, `percent`, `effective_from`; không sửa quy tắc đã áp, tạo quy tắc mới.
  - `commission_entries` lưu `rule_id`, `percent`, `base_vnd`, `invoice_line_id`, `period_id`, `kind` (`earn`, `clawback`); chỉ thêm.
  - `commission_periods` theo tháng, `closed_at`, `closed_by`. Bỏ `services.commission_split` (BR-43 đã bỏ).
  - `invoice_lines.staff_resource_id` dùng cho cả dòng bán lẻ (người bán).
  - Báo cáo tính từ hóa đơn, khoản thanh toán, buổi gói đã dùng, sổ ví, lịch hẹn và ca; chưa cần bảng tổng hợp riêng, xem lại khi đo hiệu năng.
- **Tiếp theo:** Claude Code làm Bước 15; phiên claude.ai vẽ đợt F (tài khoản và khung: MH-01, MH-03 đến MH-06, MH-10).

### 13/11/2026 (tối): mock cấu hình cơ sở (Bước 14, đợt D)

- **Đã làm** (nhánh `feat/mock-settings`, mỗi mục 14a–14h một commit, `pnpm build` chạy trước mỗi commit):
  - 14a: cấu hình của cơ sở nằm trong store: chi nhánh, giờ mở cửa nhiều khung, ngày đặc biệt, giá riêng, tài nguyên và khoảng ngưng, chính sách, thương hiệu, gói, thanh toán, thông báo, chatbot. `findSlots` đọc giờ mở cửa nhiều khung và bỏ tài nguyên đang ngưng; giá theo chi nhánh (giá theo cấp tính trên giá chi nhánh, BR-56); màn Thu tiền đọc phương thức quầy; nhật ký có cấu trúc (người, vai trò, thao tác, đối tượng, chi tiết).
  - 14b: `/settings/branches`, `/settings/branches/[id]`: nhiều khung mỗi ngày không chồng nhau (BR-02), ngày đặc biệt, giá riêng. Lưu mà có lịch nằm ngoài giờ mới thì nút thành "Lưu và xếp lại N lịch", các lịch vào "Cần xếp lại".
  - 14c: `/settings/resources`: tạm ngưng theo khoảng giờ; lịch còn tài nguyên cùng loại trống thì tự chuyển, không còn thì vào "Cần xếp lại" (BR-37). "Mở lại" kết thúc khoảng ngưng ngay.
  - 14d: Chính sách có câu ví dụ tính từ giờ mock và số đang nhập, ba mức hoàn cọc (BR-23). Lịch đặt online giữ điều khoản lúc đặt (BR-38). Nút "Không đến" dùng số phút của chính sách (BR-09).
  - 14e: `/settings/branding`: màu nhấn kiểm tương phản 4,5 : 1 (BR-65), logo xem trước trong trình duyệt, đường dẫn trang đặt lịch. Trang khách đổi màu ngay.
  - 14f: `/settings/packages` (Đang bán, "X ₫ mỗi buổi, rẻ hơn giá lẻ Y%"), `/settings/payments` (cổng giả lập, phương thức quầy, mức tặng nhiều bậc, phí hủy gói). MH-29 và MH-30 đọc từ đây.
  - 14g: `/settings/notifications` (chỉ hai email nhắc tắt được, BR-66; xem trước dùng mẫu của `mock/emails.ts`), `/settings/chatbot` (lời chào tối đa 200 ký tự, hai giới hạn, BR-67; câu trả lời xem trước lấy giờ trống, giá, thời lượng từ hệ thống).
  - 14h: `/audit-log`: lọc người, thao tác, khoảng ngày, tìm theo đối tượng; chỉ thêm, giữ 12 tháng (BR-63). Thu tiền và việc hệ thống tự làm (bật bắt buộc cọc khi đủ K lần không đến, hoàn cọc tự động) cũng được ghi.
  - `pnpm check:shop` (script mới): giờ nhiều khung, ngày đặc biệt, tài nguyên ngưng, giá chi nhánh, tương phản màu, điều khoản theo lịch, gói và mức tặng, email nhắc, chatbot, nhật ký.
- **Tự quyết:**
  - Địa chỉ trang đặt lịch viết dạng `toc-may.sapio.vn` theo T-16; bảng `ThuongHieu` vẽ `sapio.vn/toc-may`. Route mock giữ slug cố định, nên đổi đường dẫn chỉ ghi slug cũ và hạn chuyển hướng 90 ngày.
  - Bảng `TaiNguyen` ghi Ghế 3 "Bảo trì đến 12/11" mà khung bên cạnh lại xếp lịch sang "Ghế 3 trống". Mock không dựng khoảng ngưng sẵn cho Ghế 3 (lịch mẫu đang dùng nó); ca tạm ngưng Ghế 2 ngày 10/11 09:00–13:00 tính từ dữ liệu: một lịch dùng Ghế 2 và không còn ghế trống, nên vào "Cần xếp lại".
  - Nhắc trước 2 giờ mặc định bật (bảng vẽ tắt) để mẫu email MH-23 giữ đủ tám mẫu.
  - Điều khoản một lịch (tự đổi trước X giờ, số lần đổi, mức hoàn cọc) lưu trên lịch lúc đặt; lịch mẫu dùng điều khoản lúc cơ sở mở.
  - Lịch "nằm ngoài giờ" khi đổi giờ mở cửa chỉ tính lịch đã xác nhận từ bây giờ trở đi.
  - Nút trò chuyện chưa có trên trang khách; chatbot mới có cấu hình và xem trước. Hai công tắc báo nhân viên chỉ lưu, chưa có màn nhận thông báo.
  - Dòng mẫu của nhật ký tính từ dữ liệu mẫu (HĐ-0182, HĐ-0183, HĐ-0184, hoàn cọc tự động, bắt buộc cọc của anh Phúc), không dùng HĐ-0179 của bảng vẽ.
- **Ghi chú cho ERD:**
  - `branches.phone`; `branch_prices` (chi nhánh, biến thể, giá).
  - `resource_outages` (tài nguyên, khoảng, lý do); `requeues.kind` (`shift`, `hours`, `outage`).
  - `appointments.terms` (cancel_before_hours, max_reschedules, mức hoàn theo ba mốc).
  - `package_products.selling`; `customer_packages.product_id`.
  - `tenant_settings` có mức hoàn cọc, phí hủy gói, phương thức quầy; `gateway_events`; `tenant_branding` (màu, slug, slug cũ, hạn chuyển hướng, tên tệp logo).
  - `audit_log`: giờ, người, vai trò, thao tác, đối tượng, đường dẫn, chi tiết.
- **Tiếp theo:** người dùng kiểm Bước 14 và review PR; phiên claude.ai vẽ đợt E (quản lý, báo cáo: MH-37, MH-41, MH-55, MH-56).

### 13/11/2026 (tối): chốt đợt D, cấu hình cơ sở

- **Đã làm:**
  - Vẽ và chốt đợt D (9 bảng):
    - MH-43 chi tiết chi nhánh;
    - MH-46 tài nguyên;
    - MH-49 chính sách;
    - MH-50 thương hiệu;
    - MH-51 gói liệu trình;
    - MH-52 thanh toán;
    - MH-53 thông báo;
    - MH-54 chatbot;
    - MH-57 nhật ký thao tác.

    MH-42 dùng mẫu danh sách, không vẽ riêng.

  - Quy tắc:
    - BR-02 thêm nhiều khung giờ, đổi giờ thì xếp lại, giá riêng chi nhánh.
    - BR-37 tạm ngưng tài nguyên.
    - BR-38 sửa cấu hình chỉ áp từ lúc lưu.
    - BR-63 phạm vi nhật ký.
    - BR-65 màu nhấn và đường dẫn.
    - BR-66 email bắt buộc.
    - BR-67 giới hạn chatbot.
- **Ghi chú cho ERD:**
  - `branch_hours` nhiều dòng mỗi ngày.
  - `branch_special_days`.
  - `branch_prices` (chi nhánh, biến thể, giá).
  - `resource_outages` (tài nguyên, khoảng, lý do).
  - `topup_bonus_tiers`.
  - `tenant_branding` (màu, slug, slug cũ và hạn chuyển hướng).
  - `notification_settings`.
  - `chatbot_settings` với hai giới hạn.
  - `audit_log` chỉ thêm.
- **Tiếp theo:**
  - Claude Code làm [Bước 14](../ky-thuat/ke-hoach-ui-mock.md#bước-14-đợt-d-cấu-hình-cơ-sở-mh-42-mh-43-mh-46-mh-49-đến-mh-54-mh-57).
  - Phiên claude.ai vẽ đợt E (quản lý, báo cáo: MH-37, MH-41, MH-55, MH-56).

### 13/11/2026 (tối): merge PR #8 (Bước 13)

- **Đã làm:**
  - Review PR #8. Sửa hai chỗ trên cùng nhánh rồi người dùng merge:
    - Cọc thừa vào ví thành tiền thật.
    - Buổi dùng gói ghi doanh thu theo BR-26 và có hoa hồng.
  - Quy tắc:
    - BR-22 thêm cọc thừa.
    - BR-25 thêm: chỉ quản lý hoặc chủ cơ sở rút tiền thật.
    - BR-26 thêm: hoa hồng trên doanh thu buổi gói.
- **Ghi chú cho ERD:** bút toán ví có loại `deposit_excess`; `invoice_lines.session_revenue_vnd` cho dòng dùng gói.
- **Tiếp theo:** phiên claude.ai vẽ đợt D (cấu hình cơ sở).

### 13/11/2026 (tối): mock tiền (Bước 13, đợt C)

- **Đã làm** (nhánh `feat/mock-money`, mỗi mục 13a–13f một commit):
  - 13a: `mock/money.ts` (hàm thuần, `bigint`): tổng hóa đơn theo BR-22, ví trừ tiền thật trước (BR-25), mức tặng khi nạp, hoàn khoản (BR-28), hoàn gói (BR-27), doanh thu theo buổi (BR-26), hoa hồng và thu hồi (BR-40, BR-42). Sổ ví chỉ thêm bút toán, số dư là tổng (BR-20). Chính sách của cơ sở nằm trong store; trang khách và email đọc từ đó, Cài đặt › Chính sách sửa được sáu tham số.
  - 13b: thu tiền ở `/checkout/[appointmentId]`: dòng bán lẻ, dùng buổi gói, giảm tay (chỉ quản lý), ví, tiền mặt có tiền thối, chuyển khoản có hộp QR và nút "Giả lập: tiền về", thẻ ghi tay. Bấm Thu hai lần chỉ ghi một khoản (BR-21).
  - 13c: bán gói, nạp ví ở `/sales/new`, thu qua MH-29.
  - 13d: danh sách và chi tiết hóa đơn có in; hộp yêu cầu hoàn tiền (khoản đã trả, số tiền tối đa, lý do; hoàn gói theo BR-27).
  - 13e: hồ sơ khách: lịch sử với link hóa đơn, sổ ví, ví và gói, rút tiền thật, ghi chú nội bộ, bắt buộc cọc (BR-10), đồng ý xử lý dữ liệu.
  - 13f: danh sách hoàn tiền với bảng duyệt: bút toán đảo, thu hồi hoa hồng vào kỳ đang mở, trả buổi gói, nhật ký (BR-63). Hoàn cọc tự động (BR-29) ghi từ trang trả cọc. Số trên thanh bên đếm yêu cầu chờ duyệt.
  - `pnpm check:money` (script mới): ca ví, hoàn gói, thu hai lần, duyệt hoàn, thu hồi hoa hồng, quét 4.000 bộ số.
- **Tự quyết:**
  - HĐ-0187, HĐ-0188, HĐ-0189 là hóa đơn nháp của chị Hà, anh Bảo An, anh Tuấn; bảng danh sách vẽ chúng đã thu lúc 10:48 và 10:52, sau giờ mock 10:20, và nếu đã thu thì không làm được các ca thu của hai khách này.
  - HĐ-0182 (anh Phúc mua gói) đặt ngày 30/10, để yêu cầu hoàn ngày 04/11 đến sau lần mua.
  - Ví chị Quyên dựng lại từ sổ bút toán (nạp 300.000 ₫, trả 150.000 ₫, nạp 1.000.000 ₫ tặng 100.000 ₫ ở HĐ-0185): số cũ không cộng ra đúng và có lần nạp 500.000 ₫ vẫn được tặng, trái mức tặng từ 1.000.000 ₫.
  - Hộp tạo yêu cầu hoàn chọn một khoản (radio): một yêu cầu gắn một `payment`. Bảng vẽ dùng ô tick.
  - "Rút tiền thật" chỉ quản lý và chủ cơ sở bấm được, vì tiền ra khỏi quầy; quy tắc nghiệp vụ chưa nói rõ.
  - Hoa hồng dùng một quy tắc phẳng 10% (khớp 80.000 ₫ → −8.000 ₫ trên bảng); màn quy tắc hoa hồng chưa làm.
  - Phí hủy gói 50.000 ₫ là hằng số trong `mock/money.ts`; mức tặng nạp nằm trong dữ liệu cơ sở, chưa có màn Cài đặt › Thanh toán.
  - Tên khách theo dữ liệu mẫu: "Trần Bảo An", "Bùi Hữu Phúc".
  - Dòng "dùng 1 buổi gói" bỏ khỏi lịch sử ví của chị Quyên vì không phải bút toán tiền.
- **Chưa làm:** `pnpm build` chưa chạy trên máy (chờ đồng ý); người dùng tự kiểm giao diện theo mục "Xong khi" của Bước 13.
- **Ghi chú cho ERD:**
  - `invoices.held`: các khoản chờ ghi cùng khoản chuyển khoản chưa về.
  - `refund_requests` có `line_id`, `package_id`, `fee_vnd`, `return_session`, `wallet_real_vnd`, `wallet_bonus_vnd`.
  - `customers.deposit_override` (bật hoặc tắt tay, kèm lý do, người, lúc).
  - `appointments.deposit_ref`, `deposit_paid_at`.
  - Một khách có nhiều gói; gói có `refunded`.
- **Tiếp theo:** người dùng kiểm Bước 13 và review PR; phiên claude.ai vẽ đợt D (cấu hình cơ sở).

### 13/11/2026: merge PR #7 (Bước 12), chốt đợt C, tiền

- **Đã làm:**
  - Review PR #7. Sửa trên cùng nhánh rồi người dùng merge:
    - BR-06 cho giờ trống phía khách;
    - "Chọn lại giờ" dời lịch ngay;
    - chỉ ghép khách theo email;
    - Pawpaw có chuỗi dịch vụ khi chỉ chọn một bé;
    - kiểm lại số lần đổi lúc xác nhận;
    - khách tự hủy thì đóng dòng hỏi ý.
  - `CLAUDE.md`: kiểm trên máy chỉ chạy script; không chạy Playwright hay axe. Người dùng tự kiểm giao diện.
  - Vẽ và chốt đợt C (9 bảng):
    - MH-29 thu tiền: ví cộng tiền mặt; gói cộng chuyển khoản QR;
    - MH-30 bán gói, nạp ví;
    - MH-31 danh sách và chi tiết hóa đơn;
    - MH-33 hồ sơ khách;
    - MH-34 danh sách hoàn tiền với bảng duyệt, và hộp tạo yêu cầu hoàn.
  - Quy tắc:
    - BR-22: thứ tự tính hóa đơn; chỉ giảm tay; bỏ khuyến mãi tự động và voucher; bán lẻ nhập tay, không kho.
    - BR-25: ví trừ tiền thật trước, có mức tặng khi nạp.
    - BR-28: hoàn về đúng phương thức đã trả.
    - BR-21: thu nhiều phương thức, QR, khóa hóa đơn sau khi thu.
- **Ghi chú cho ERD:**
  - Bỏ bảng `promotions`, `vouchers`.
  - `invoice_lines.kind` có `retail` nhập tay, không có `product_id`.
  - `invoices.discount_vnd` kèm lý do và người duyệt.
  - Bút toán ví tách tiền thật, tiền tặng.
  - `refund_requests` gắn với một `payment`, có `created_by` rỗng khi tự động (BR-29).
  - Bậc tặng khi nạp nằm trong cài đặt thanh toán.
- **Tiếp theo:**
  - Claude Code làm [Bước 13](../ky-thuat/ke-hoach-ui-mock.md#bước-13-đợt-c-tiền-mh-29-mh-30-mh-31-mh-33-mh-34).
  - Phiên claude.ai vẽ đợt D (cấu hình cơ sở: MH-42, MH-43, MH-46, MH-49 đến MH-54, MH-57).

### 12/11/2026: mock phía khách (Bước 12, đợt B)

- **Đã làm** (nhánh `feat/mock-customer`, mỗi mục 12a–12h một commit):
  - Trang cơ sở MH-11; nhiều dịch vụ MH-13 (`findChainSlots`); đặt nhóm MH-14 (`findGroupSlots`: cùng giờ, giờ lệch không quá 60 phút).
  - Trả cọc MH-15: đếm ngược giữ chỗ liền mạch, ba kết quả (kịp, muộn còn trống, muộn đã mất kèm hoàn đủ và ba giờ gần nhất).
  - Đăng nhập MH-16, lịch hẹn MH-17, chi tiết MH-18 (đồng ý đổi người, chọn lại giờ, đổi giờ, hủy theo BR-23); bé MH-19, gói và ví MH-20, thông tin MH-21; email MH-23 (tám mẫu).
  - Lịch của khách và lịch lễ tân dùng chung một store: khách đồng ý đổi người thì MH-40 hiện "Khách đã đồng ý".
  - `check:availability` thêm: chuỗi, nhóm (đều có đối chứng vét cạn), BR-29, BR-08, BR-23, BR-33, email.
  - axe 0 serious/critical trên 40 màn và trạng thái, hai theme, 390px và 1280px; không cuộn ngang ở 390px.
- **Sửa trên đường làm:** trang cơ sở thiếu `StaffStoreProvider` nên lỗi ở client; nút header của trang cơ sở tràn 9px ở 390px (Pawpaw).
- **Tự quyết:**
  - Pawpaw bỏ bước "Dịch vụ" riêng; bước "Cho bé nào?" chọn cả bé lẫn dịch vụ (theo bảng MH-14, 4 bước).
  - Trang trả cọc thêm một ô tick "có khách khác đặt giờ này" để có đủ ba kết quả với hai nút giả lập.
  - Lưu ý cho nhân viên của bé nằm ngoài schema ngành (`ServedSubject.note`); lỗi cân nặng lấy từ `checkSubject` ("lớn hơn 0"), chưa có khoảng 0,5–80 kg như bảng vẽ.
  - "Chọn lại giờ" dời lịch ngay, không tăng số lần tự đổi; dòng của lịch trong đơn nghỉ hoặc "Cần xếp lại" thành cách xử lý mới "khách đã chọn giờ mới" (đã xử lý, duyệt bỏ qua). Khách hủy lịch đang chờ trả lời thì dòng đó thành "khách đã hủy".
  - Giờ trống phía khách áp BR-06 theo chính sách của cơ sở; lễ tân không áp (BR-30).
  - Một bé có tối đa 4 dịch vụ làm lần lượt (BR-18); từ hai bé trở lên mỗi bé một dịch vụ (BR-19).
  - Khách ghép theo email đã xác thực (BR-16), cùng số điện thoại khác email là khách mới.
  - Pawpaw không có lịch mẫu có cọc nên thiếu mẫu email "đã hoàn cọc".
- **Ghi chú cho ERD:**
  - `appointments.self_changes`; `served_subjects.note`.
  - `customers.consent_at`, `customers.marketing_opt_in`.
  - Hoàn cọc tự động ghi mã hoàn riêng.
- **Tiếp theo:** phiên claude.ai vẽ đợt C (tiền: MH-29, MH-30, MH-31, MH-33, MH-34).

### 10/11/2026 (tối): chốt đợt B, phía khách

- **Đã làm:**
  - Vẽ và chốt đợt B (12 bảng):
    - MH-11 trang cơ sở, điện thoại và máy tính;
    - MH-13 nhiều dịch vụ;
    - MH-14 đặt nhóm;
    - MH-15 trả cọc;
    - MH-16 đăng nhập khách;
    - MH-17 lịch hẹn của khách;
    - MH-18 chi tiết lịch hẹn của khách;
    - MH-19 bé của tôi;
    - MH-20 gói và ví;
    - MH-21 thông tin;
    - MH-23 email.
  - Quy tắc mới:
    - BR-18 chuỗi dịch vụ;
    - BR-19 đặt nhóm;
    - BR-29 tiền cọc về sau khi hết giữ chỗ.
  - Quy tắc bổ sung:
    - BR-08: khách chỉ đổi, hủy cả lịch; "Chọn lại giờ" không tính lần đổi.
    - BR-16: đăng nhập khách bằng mã email, phiên theo cơ sở.
    - BR-17: không xóa đối tượng còn lịch.
    - BR-64: tin khuyến mãi mặc định tắt, đổi email cần mã.
  - Bỏ hai câu hỏi mở đã có lời: lễ tân không giữ chỗ (BR-30); đổi người lịch "Bất kỳ ai" không cần hỏi (BR-34).
- **Ghi chú cho ERD:**
  - `appointment_items` có thứ tự trong lịch (`position`) và cờ giờ bắt đầu riêng cho nhóm lệch giờ.
  - Người đi cùng là `served_subjects` loại `person` chỉ có tên, thuộc khách đặt.
  - `customer_sessions` theo từng tenant.
  - Hoàn cọc tự động (BR-29) là một loại hoàn tiền không cần người duyệt.
  - `customers.marketing_opt_in` mặc định false, kèm ngày đồng ý xử lý dữ liệu.
- **Tiếp theo:**
  - Claude Code làm [Bước 12](../ky-thuat/ke-hoach-ui-mock.md#bước-12-đợt-b-phía-khách-mh-11-mh-13-đến-mh-21-mh-23).
  - Phiên claude.ai vẽ đợt C (tiền: MH-29, MH-30, MH-31, MH-33, MH-34).

### 10/11/2026: review và merge PR #6 (Bước 11)

- **Đã làm:**
  - Review PR #6. Sửa trên cùng nhánh rồi người dùng merge:
    - Lúc duyệt nghỉ, kiểm lại từng cách xử lý; cách không còn hợp lệ thì lịch về "chưa xử lý".
    - Khách vãng lai có `customerId: null`, không sinh hồ sơ "Khách lẻ".
    - Bỏ tick gửi email thì không gắn dấu "Chưa xác nhận đổi người".
    - Lịch giờ lẻ kéo chưa đủ một ô thì giữ giờ.
  - Sapio:
    - `.sp-date` đang chọn giữ màu khi rê chuột.
    - Ô `ShiftGrid` đang sửa dùng `aria-current` và `data-selected`.
    - Nhóm chọn giá trị (Cả ngày / Vài giờ, thời hạn gói) là `role="group"` với nút `aria-pressed`, bỏ `role="radio"`.
  - Bảng vẽ sửa theo dữ liệu mẫu đã merge:
    - Chị Hà là "Bất kỳ ai".
    - Chị Ngọc giữ Ghế 1.
    - Chị Hằng 17:30.
    - Đơn của Hùng gửi 05/11 17:40.
    - Mã quy tắc trên hộp đổi người và ô "đích danh" là BR-32, BR-31.
  - Quy tắc:
    - BR-11: đơn chờ duyệt đã chặn đặt lịch mới với người đó.
    - BR-34: bỏ chỗ mâu thuẫn với BR-35 (bớt ca thì lưu ngay, lịch vào "Cần xếp lại"); lúc duyệt kiểm lại từng cách xử lý.
- **Ghi chú cho ERD** (thêm vào danh sách của 08/11):
  - `leave_requests` có khoảng ngày (`from_date`, `to_date`) và giờ; mock đang tách mỗi ngày một đơn.
  - Tiến độ làm ghi trên `appointment_items` (`started`, `resumed`, `done`); không cần trạng thái `in_service` ở lịch hẹn. Kỹ thuật viên bấm Bắt đầu thì lịch thành `checked_in` nếu chưa.
  - Lịch khách vãng lai có `customer_id` null.
- **Đưa vào bước mock sau:**
  - Gỡ `aria-pressed:hover:bg-(--accent)!` trong `components/sapio/date-strip.tsx`, vì CSS Sapio đã sửa.
  - Đổi chữ "(BR-11)" ở ô "Khách yêu cầu đích danh" thành BR-31, ở hộp đổi người thành BR-32, ở panel bớt ca thành BR-35.
  - Lưới ca dùng class `.sp-shiftgrid td[data-selected]` thay cho class Tailwind tự viết.
- **Tiếp theo:** phiên claude.ai vẽ đợt B (phía khách: MH-11, MH-13 đến MH-21, MH-23).

## Tuần 1 (02/11 – 08/11/2026)

### 08/11/2026 (khuya): mock Bước 11, nghiệp vụ lịch

- **Đã làm:** Bước 11 (11a–11g) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-11-đợt-a-nghiệp-vụ-lịch-mh-26-mh-27-mh-28-mh-35-mh-36-mh-38-mh-39-mh-40) trên nhánh `feat/mock-scheduling-ops`.
  - 11a: mỗi mục lịch ghi khách chọn đích danh hay "Bất kỳ ai" (BR-31); ca làm nhiều khung mỗi ngày; đơn nghỉ có trạng thái, giờ, lý do, cách xử lý từng lịch. `findSlots` đọc ca và đơn nghỉ thay cho giờ mở cửa. Cài đặt "Kỹ thuật viên thấy số điện thoại khách" ở Chính sách (BR-36). `ScheduleStore` giữ lịch, khách, ca, đơn nghỉ giữa các màn.
  - 11b MH-26: bấm ô trống hoặc "Tạo lịch hẹn" mở `SidePanel`, kiểm bằng `findSlots` từng phút (giờ lệch lưới được), gợi ý ba giờ gần nhất, khách vãng lai, khách mới, thêm bé.
  - 11c MH-27: kéo khối trên lịch nhân viên (chuột, cảm ứng bấm giữ), vùng thả được và không thả được tính bằng `findSlots` bỏ chính lịch đó; lịch "Bất kỳ ai" đổi ngay có Hoàn tác, lịch đích danh hỏi lại và mang dấu "Chưa xác nhận đổi người" (BR-32); "Dời giờ, đổi người" thay cho kéo.
  - 11d MH-28: trang chi tiết lịch hẹn cho điện thoại.
  - 11e MH-35, MH-36: Lịch của tôi (ngày, tuần, Bắt đầu phần tiếp, Xong) và Xin nghỉ cho kỹ thuật viên; số điện thoại khách ẩn theo cài đặt.
  - 11f MH-38, MH-39, MH-40: xếp ca, danh sách đơn nghỉ, xử lý lịch bị ảnh hưởng với gợi ý tính bằng `findSlots`, hạn trả lời BR-33, danh sách "Cần xếp lại" sau khi bớt ca (BR-35).
- **Kiểm:** `pnpm check:availability` (thêm lịch trong ca, ngày mẫu của màn tạo lịch, vùng thả); Playwright cho từng mục "Xong khi" của Bước 11; axe-core 124 lượt (31 màn và trạng thái, hai theme, 1440px và 390px), 0 lỗi serious hoặc critical; không cuộn ngang ở 390px, trừ lưới lịch; màu chọn trong quản trị là `brand`.
- **Vướng:**
  - Bản vẽ dùng `aria-selected` trên ô bảng, trên khối không có vai trò và `aria-pressed` trên `role="radio"`: axe báo lỗi critical, đổi sang `aria-current`, `data-selected` và nút bật tắt.
  - `.sp-date:hover` đè màu ngày đang chọn thành nền nhạt chữ trắng; `DateStrip` giữ màu khi rê chuột.
  - Giá lịch Chị Hà ở bản vẽ MH-28 (500.000 ₫ kèm "Mai do khách chọn đích danh") mâu thuẫn với BR-56; dữ liệu mẫu để Chị Hà là "Bất kỳ ai", giá 500.000 ₫.
  - 09/11 đóng cửa bảo trì nên lưới ca ngày đó là "Đóng cửa", tổng giờ tuần lệch với bản vẽ.
- **Tiếp theo:** review PR; phiên claude.ai vẽ đợt B (phía khách).

### 08/11/2026 (tối): chốt đợt A, nghiệp vụ lịch

- **Đã làm:**
  - Review và người dùng merge PR #5 (Bước 10). Sau review chỉ còn hai chỗ sửa: bảng vừa khung ở 1280–1600px, và trên điện thoại chỉ giữ nút quay lại.
  - Thống nhất lộ trình: vẽ đủ mọi màn theo đợt A–H (kể cả quản trị nền tảng) trước, người dùng rà một lượt rồi mới làm DB.
  - Vẽ và chốt đợt A (10 bảng):
    - MH-26 tạo lịch hẹn, cả hai cơ sở;
    - MH-27 kéo thả, hỏi lại khi khách chọn đích danh;
    - MH-28 chi tiết lịch hẹn trên điện thoại;
    - MH-35, MH-36 kỹ thuật viên;
    - MH-38 xếp ca;
    - MH-39, MH-40 nghỉ phép.
  - Sapio thêm `SidePanel`, `ShiftGrid`, `AffectedList`, kéo thả trên `ResourceCalendar`. Trong quản trị, màu chọn là `brand`; màu cơ sở chỉ ở ô chữ cái.
  - Quy tắc mới BR-30 đến BR-36; BR-11 trỏ sang BR-34.
- **Ghi chú cho ERD** (gom lại khi làm DB):
  - `appointment_items` cần cờ "chưa xác nhận đổi người" (BR-32).
  - Cần bảng hỏi ý khách (`customer_requests`: loại, lịch, hạn trả lời, kết quả) cho BR-33.
  - `booking_policies.staff_sees_customer_phone` (BR-36).
  - Danh sách "Cần xếp lại" sau khi bớt ca dùng chung cấu trúc với lịch bị ảnh hưởng của đơn nghỉ.
  - `leave_requests` có giờ bắt đầu và kết thúc (nghỉ vài giờ).
- **Tiếp theo:**
  - Claude Code làm [Bước 11](../ky-thuat/ke-hoach-ui-mock.md#bước-11-đợt-a-nghiệp-vụ-lịch-mh-26-mh-27-mh-28-mh-35-mh-36-mh-38-mh-39-mh-40).
  - Phiên claude.ai vẽ đợt B (phía khách: MH-11, MH-13 đến MH-21, MH-23).

### 08/11/2026 (đêm): mock Bước 10, cấu hình dịch vụ và gói cấu hình ngành

- **Đã làm:** Bước 10 (10a–10f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-10-cấu-hình-dịch-vụ-mh-44-mh-45-gói-cấu-hình-ngành-mh-59-và-thanh-cuộn) trên nhánh `feat/mock-services`.
  - Dữ liệu và hàm thuần: đoạn `prep`, `work`, `wait`, dọn dẹp theo từng loại tài nguyên, giá theo cấp, `variantSelection` theo dịch vụ. `mock/occupation.ts` (mẫu chiếm dụng, khoảng khách thấy, phút bận, giá, kiểm phủ đủ không trùng) và `mock/availability.ts` (phép vừa theo mục 3 của trang thuật toán) là mẫu để chép sang `scheduling-core`.
  - `pnpm check:availability`: 10 ví dụ ở mục 4 khớp, mỗi ví dụ còn khớp một bản vét cạn từng phút; lịch mẫu của hai cơ sở có 0 đoạn chồng nhau (BR-01) và nằm trong giờ mở cửa (BR-54). Không có ví dụ nào mâu thuẫn với thiết kế.
  - MH-44 `settings/services` và MH-45 `settings/services/[id]` (Tóc Mây, Pawpaw, điện thoại): trục thời gian, bảng đoạn kéo bằng chuột hoặc ↑/↓, dọn dẹp theo loại, điều kiện biến thể có kiểm tra phủ đủ không trùng, giá theo cấp, "Ai làm được" dùng chung với hồ sơ nhân viên, xem trước trên lịch lễ tân. Trang đặt lịch mở theo `?service=` và hiện giá của người đã chọn (BR-56).
  - Lịch lễ tân vẽ đoạn chuẩn bị và dọn dẹp bằng viền đứt.
  - MH-59 `/mock/admin/templates`: khung quản trị nền tảng, bốn gói ngành có bản nháp và xuất bản (BR-70); bước chọn ngành của `/mock/signup` đọc trạng thái từ gói.
  - Thanh cuộn: có sẵn trong `components.css`, mock không có style riêng; kiểm ở Chrome và Edge, hai theme.
- **Kiểm:** axe-core 68 lượt (17 trang và trạng thái, hai theme, hai bề rộng), 0 lỗi serious hoặc critical; Playwright cho từng mục "Xong khi" của Bước 10; MH-44, MH-45, MH-59 không cuộn ngang ở 390px; `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- **Vướng:**
  - Dữ liệu mẫu không có ca làm việc, nên nhân viên làm trong giờ mở cửa và đoạn chuẩn bị không đứng trước giờ mở cửa. Ví dụ VD4 (ca bắt đầu 07:45) được kiểm với ca khai trong script.
  - Một mục đứng sau một mục khác trong cùng lịch hẹn lùi giờ bắt đầu đúng bằng đoạn chuẩn bị của nó, vì cùng một thợ không pha thuốc lúc còn đang làm mục trước.
  - Trên `.sp-appt`, axe tính chữ bị cắt trong khối cao 16px: khối ngắn có đoạn dọn chỉ còn một dòng.
  - Thanh lưu và toast cùng nằm đáy trang, toast che nút "Bỏ thay đổi"; toast nâng lên khi trang có thanh lưu.
  - Dev server giữ bản server cũ của file đã sửa, báo lỗi hydration giả; khởi động lại thì hết.
- **Tiếp theo:** review PR; báo cô MH-45 và MH-59; phiên claude.ai chốt 5 câu hỏi của ERD.

### 08/11/2026 (chiều): chốt cấu hình dịch vụ, gói cấu hình ngành, thuật toán giờ trống

- **Đã làm:**
  - Review PR #4 (Bước 9), người dùng đã merge sau khi sửa ba điểm: một đồng hồ chung cho mock, giá trung bình mỗi tháng, ngày gia hạn trên trang khóa.
  - Vẽ và chốt MH-45 Chi tiết dịch vụ (Tóc Mây, Pawpaw, điện thoại) và MH-59 Gói cấu hình ngành (danh sách, chi tiết) trên canvas.
  - Sapio thêm `SegmentTimeline`, `DetailPage`, đoạn chuẩn bị, dọn dẹp trên khối lịch hẹn, thanh cuộn mảnh theo theme.
  - Viết [Thuật toán tính giờ trống](../ky-thuat/thuat-toan-gio-trong.md) (BT1): mô hình, mã giả, 10 ví dụ tính tay, đối chứng vét cạn cho E1. Cả 10 ví dụ đã kiểm lại bằng một bản vét cạn viết riêng; bản này bắt được bốn chỗ tính tay sai ở cận trên, đã sửa.
- **Chốt:**
  - Khách chỉ thấy phần làm; chuẩn bị trước giờ hẹn, dọn dẹp sau.
  - Dọn dẹp tính theo từng loại tài nguyên, bắt đầu ngay khi đoạn cuối dùng loại đó xong.
  - Đoạn chờ không giữ nhân viên.
  - Một mục giữ cùng một thợ, cùng một ghế.
  - Dọn dẹp phải xong trước giờ đóng cửa.
  - Lưới 15′.
  - "Bất kỳ ai" trả giá cấp thấp nhất và được xếp cho cấp thấp nhất trước.
  - Biến thể theo thuộc tính phải phủ đủ, không trùng.
  - Lịch đã đặt giữ thời gian và giá cũ.

  Các ý trên ghi thành BR-50 đến BR-59. BR-12, BR-14, BR-70 sửa theo; gói ngành có bản nháp và xuất bản.
  - [T-05](../ky-thuat/quyet-dinh-ky-thuat.md#t-05-packagesscheduling-core-thuật-toán-thuần) đổi sang phút từ mốc Unix (UTC).

- **Vướng:** dữ liệu mẫu Tóc Mây cho Hùng làm nhuộm, Lan thì không. Thiết kế giữ cả ba thợ làm được nhuộm (thêm kỹ năng cho Lan) để "Bất kỳ ai" có giá 500.000 ₫.
- **Sau đó:** viết bản 1 của [Mô hình dữ liệu](../thiet-ke/erd.md).
  - Gồm khoảng 50 bảng theo phân hệ, khóa ngoại kèm `tenant_id`, exclusion constraint, trigger chỉ thêm, bảng trạng thái lịch hẹn, và bảng "mỗi BR nằm ở đâu". Không có bảng riêng cho ngành nào.
  - Giữ chỗ là lịch hẹn trạng thái `held`, không có bảng `holds`.
  - Trạng thái lịch hẹn thêm `awaiting_deposit`, `in_service`, `expired` so với fixtures của mock; mock đổi theo khi làm tới thu tiền.
  - 5 câu hỏi mở có đề xuất ở mục 13 của ERD.
- **Tiếp theo:**
  - Claude Code làm [Bước 10](../ky-thuat/ke-hoach-ui-mock.md#bước-10-cấu-hình-dịch-vụ-mh-44-mh-45-gói-cấu-hình-ngành-mh-59-và-thanh-cuộn).
  - Chốt 5 câu hỏi của ERD.
  - Viết sequence cho đặt lịch có cọc, webhook thanh toán, hoàn thành lịch → outbox.

### 07/11/2026 (đêm khuya): mock Bước 8, khung ứng dụng, danh sách và form

- **Đã làm:** Bước 8 (8a–8f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-8-route-tiếng-anh-khung-ứng-dụng-mẫu-danh-sách-và-form), mỗi mục một commit trên nhánh `feat/mock-app-shell`.
  - Route theo [T-15](../ky-thuat/quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url): `/mock/[tenant]/book`, `/mock/app/[tenant]/…`; URL cũ chuyển hướng 308; trạng thái xem nằm trong query.
  - `AppShell` (MH-07): thanh bên 240px, dải icon 68px, thanh tab dưới 768px; menu đổi chi nhánh và cơ sở dùng bàn phím; thêm vai trò kỹ thuật viên và quản lý.
  - Mẫu danh sách (MH-08) với Khách hàng (MH-32, 130 và 60 khách có sáu tháng lịch sử sinh bằng seed) và Nhân sự (MH-47); mẫu form (MH-09) với Hồ sơ nhân viên (MH-48).
  - `IndustryTemplate`: từ ngữ và schema đối tượng được phục vụ của ngành nằm trong dữ liệu; luật chọn biến thể theo khoảng số (10 kg) nằm trong dịch vụ (BR-13, BR-71).
  - `/mock` liệt kê đủ 60 màn theo khu A–H, lọc theo đợt và trạng thái; màn chưa làm mở trang "Chưa làm" thay vì 404.
- **Kiểm:** Playwright trên các route mới ở 390, 1024 và 1440px (không cuộn ngang, bàn phím, lưu trong URL, rời trang khi còn thay đổi); axe-core với luật mặc định: 86 lượt (trang, menu mở, bảng trượt lên) ở 390 và 1440px, hai theme, 0 lỗi serious hoặc critical; `pnpm build`, `pnpm typecheck`, `prettier --check` xanh.
- **Vướng:**
  - Luật `label-content-name-mismatch` của axe bắt khối lịch hẹn, ô chọn ngày và ô đổi cơ sở: chữ nhìn thấy phải nằm trong tên truy cập, kể cả đoạn chờ và khoảng trắng giữa các dòng. Đã sửa `AppointmentBlock`, `DateStrip` và `AppShell`.
  - Trên Windows, `git mv` thư mục `[tenant]` báo `Permission denied` khi dev server đang chạy; chép rồi xóa thay cho đổi tên.
  - `next.config.mjs` (chuyển hướng) chỉ có hiệu lực sau khi khởi động lại dev server.
  - Sapio cần bổ sung: `.sp-shell__side` không dính trên trang dài (mock thêm `sticky top-0 h-screen`); `.sp-shell__content--fill` giữ chiều cao 100vh cả trên điện thoại (mock chỉ dùng từ 768px); thanh bên không nói tên cơ sở và chi nhánh nằm ở đâu khi dưới 768px (mock đặt ô đổi cơ sở ở đầu trang như `QuanTriDienThoai`).
- **Tiếp theo:** review PR; chốt hai màn MH-07, MH-08, MH-09 với cô; phiên claude.ai vẽ MH-02 Đăng ký cơ sở có chọn ngành.

### 08/11/2026 (tối): mock Bước 9, đăng ký cơ sở, dùng thử và gói Sapio

- **Đã làm:** Bước 9 (9a–9f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-9-đăng-ký-cơ-sở-dùng-thử-và-gói-sapio) trên nhánh `feat/mock-signup-plan`.
  - Component mới: `SignupLayout`, `ChoiceCards`, `QuantityInput`, `OtpField` (`InputOTP` của shadcn/ui, thư viện `input-otp@1.5.0`), `Banner`, `Checklist`, `PlanCards`, `LockIcon`; ô mã ở trang đặt lịch dùng `OtpField`.
  - MH-02 `/mock/signup?step=…`: 5 bước, mật khẩu theo BR-73 (331 mật khẩu phổ biến), mã `000000` cho trạng thái lỗi, địa chỉ `*.sapio.vn` theo BR-72, bảng xem trước đọc từ `IndustryTemplate`.
  - `mock/subscription.ts`: `plans`, `entitlements`, `can`, `canBook`, `periodPrice`, `upgradeCharge` (hàm thuần, để chép sang `datn-saas`). `?plan=trial|basic|pro|expired` giữ khi chuyển trang; dải báo, ổ khóa, màn dùng thử, màn hết hạn, trang tính năng bị khóa.
  - MH-61 `settings/plan`: chọn kỳ, hộp thanh toán QR giả lập, nâng và hạ gói (BR-85). Thêm MH-61, MH-62 vào danh sách màn.
- **Kiểm:** Playwright qua 5 bước ở 1280 và 390px (không cuộn ngang) và các kịch bản gói; axe-core 56 lượt (14 trang, hai theme, hai bề rộng), 0 lỗi serious hoặc critical.
- **Vướng:**
  - Phần gói dùng chung đồng hồ `MOCK_NOW` (07/11). Mốc mẫu: `?plan=trial` là cơ sở tạo ngày 07/11, dùng thử hết 23:59 ngày 13/11 (còn 7 ngày); `DEFAULT_PERIOD_END` là 28/11 (còn 22 ngày, nâng gói trả 147.000 ₫); `?plan=expired` hết hạn ngày 06/11.
  - Dữ liệu lịch hẹn chỉ tới 22/11, nên mốc hết hạn 30/11 sẽ làm bảng "lịch đã đặt sau hạn" trống; hết hạn ngày 06/11 thì bảng có dòng.
  - Sapio không có kiểu cho `role="radio"` trong `.sp-segmented` (chỉ `aria-pressed`, `aria-selected`, `aria-current`); chọn kỳ dùng nhóm nút bấm.
- **Tiếp theo:** review PR; báo cô phần dùng thử và gói Sapio (D-15); phiên claude.ai vẽ MH-45 và MH-59.

### 08/11/2026: chốt đăng ký cơ sở, tên miền con, dùng thử và gói Sapio

- **Đã làm:**
  - Review PR #3 (Bước 8). Người dùng đã merge sau khi Claude Code sửa 3 điểm: chữ cái của cơ sở, tìm theo đầu từ, bỏ `?tenant=` khi chuyển hướng.
  - Tiêu đề cột bảng viết hoa theo ý người dùng, đã đưa vào Sapio.
  - Vẽ và chốt MH-02 Đăng ký cơ sở (6 màn) và phần dùng thử, gói Sapio (4 màn) trên canvas.
- **Chốt:**
  - Trang khách trên tên miền con `toc-may.sapio.vn` ([T-16](../ky-thuat/quyet-dinh-ky-thuat.md#t-16-trang-khách-của-mỗi-cơ-sở-trên-tên-miền-con)). Mock giữ đường dẫn; tên miền riêng của tiệm để làm sau. BR-72 thêm luật DNS.
  - Mật khẩu theo NIST SP 800-63B-4 (BR-73).
  - Bỏ duyệt tay. Thay bằng **dùng thử 7 ngày** (chỉ cấu hình, không nhận lịch), rồi kích hoạt **gói Cơ bản 199.000 ₫ hoặc Chuyên nghiệp 399.000 ₫ mỗi tháng**: 3 tháng giảm 10%, 12 tháng giảm 20%. Nâng gói trả phần chênh theo ngày; hết hạn chỉ còn trang gói ([D-15](./quyet-dinh.md#d-15-dùng-thử-7-ngày-và-hai-gói-sapio-thay-cho-duyệt-tay), [T-17](../ky-thuat/quyet-dinh-ky-thuat.md#t-17-gói-sapio-gói-và-tính-năng-là-dữ-liệu-kiểm-qua-một-hàm), BR-74, BR-75, BR-80 đến BR-88).
  - Ô mã xác nhận 6 ô vuông (`OtpField`, dùng `InputOTP` của shadcn/ui với thư viện `input-otp`, đã báo người dùng).
  - Thêm MH-61 Gói Sapio, MH-62 Gói và giá: tổng cộng 62 màn.
  - Sapio thêm Banner, Checklist, OtpField, ChoiceCard, Plan, SignupFlow.
- **Cần báo cô:** phần dùng thử và gói Sapio giả lập là thêm so với đề cương (D-15).
- **Tiếp theo:**
  - Claude Code làm [Bước 9](../ky-thuat/ke-hoach-ui-mock.md#bước-9-đăng-ký-cơ-sở-dùng-thử-và-gói-sapio).
  - Phiên claude.ai vẽ MH-45 Chi tiết dịch vụ (các đoạn chiếm dụng) và MH-59 Gói cấu hình ngành.

### 07/11/2026 (đêm): chốt khung ứng dụng, mẫu danh sách và mẫu form

- **Đã làm:**
  - Review lại PR #2 (Bước 7): đạt. Người dùng đã merge.
  - Sửa hover của nút chính trong Sapio: đậm hơn thay vì mờ đi, tương phản từ 6,3:1 trở lên.
  - Viết [Danh sách màn hình](../thiet-ke/man-hinh.md): 60 màn, chia 3 đợt. Chốt route [T-15](../ky-thuat/quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url) và quy tắc slug BR-72.
  - Thiết kế và chốt khung ứng dụng (MH-07), mẫu danh sách (MH-08), mẫu form (MH-09) trên canvas, 5 màn `QuanTri*`.
- **Theo góp ý của người dùng:**
  - Thanh bên thu gọn được. Ô đổi cơ sở trông như ô chọn.
  - Phân trang có số trang. Chân bảng kiểu Ant Design: "Hiển thị 1–20 trong 1.284 khách" bên trái; số trang rồi ô "20 / trang" bên phải.
  - Bảng cuộn trong khung, dòng tiêu đề cột và chân bảng đứng yên.
  - Trên điện thoại không cuộn ngang: bộ lọc nằm trong bảng trượt lên.
  - Thêm vào Sapio: AppShell, DataTable, FormSection, menu, tooltip, bảng trượt lên, ô chọn nhỏ.
- **Cách làm từ nay:** phiên claude.ai chỉ sửa trên canvas cho đến khi người dùng nói chốt, rồi mới cập nhật hệ thống thiết kế, chép vào repo, commit và push.
- **Tiếp theo:**
  - Claude Code làm [Bước 8](../ky-thuat/ke-hoach-ui-mock.md#bước-8-route-tiếng-anh-khung-ứng-dụng-mẫu-danh-sách-và-form).
  - Phiên claude.ai vẽ MH-02 Đăng ký cơ sở có chọn ngành.

### 07/11/2026 (khuya): sửa mock theo review PR #2

- **Đã làm:** Bước 7 (7a–7f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-7-sửa-theo-review-pr-2), mỗi mục một commit trên PR #2. ConfirmDialog, Toast (có Hoàn tác), Segmented; giờ trống theo buổi; cột trái sticky có danh sách thợ ở máy tính; OTP qua email (BR-16); "Thêm bé" và `?khach=moi` (BR-17); thu tiền, không đến, hủy lịch qua hộp hỏi, check-in có Hoàn tác (D-14); dữ liệu 02/11–08/11 cho hai cơ sở sinh bằng seed (`mock/fixtures/generate.ts`); nút sáng/tối, vai trò theo route, thanh chọn gọn trên điện thoại. Kiểm bằng Playwright và axe-core: 28 trang và bước, hai theme, 0 lỗi serious/critical; `pnpm build` xanh.
- **Vướng:** `.sp-btn--accent:hover { opacity: 0.9 }` trong Sapio hạ tương phản nút cam của Pawpaw xuống 3,94:1 khi rê chuột; cần sửa trong Design System (bản chép `app/sapio/` không sửa tại chỗ).
- **Tiếp theo:** review lại PR #2; sửa hover của nút nhấn trong Sapio; chốt hai màn hình với cô.

### 07/11/2026 (tối, sau đó): review PR #2 của mock

- **Đã làm:** review [PR #2 của datn-docs](https://github.com/ngchinhdev/datn-docs/pull/2): đọc code và xem bản deploy trên trình duyệt ở 390px, 1024px, 1280px, 1440px, hai theme, đi hết luồng của cả hai cơ sở. Bản này sát canvas, code sạch (không màu viết cứng, không `Date.now()`). Cần sửa: OTP ghi "tin nhắn" trái với roadmap; Pawpaw thiếu "Thêm bé" nên khách mới bị kẹt; trang khách trên máy tính không có danh sách thợ ở cột trái và nút Tiếp tục bị đẩy khỏi màn hình; thu tiền chạy ngay không hỏi; bộ chọn vai trò không theo trang; `<div>` trong `<button>`, lưới ARIA thiếu dòng. Người dùng góp thêm: hộp xác nhận cho thao tác quan trọng, dữ liệu đa dạng hơn một ngày, nút sáng/tối.
- **Chốt:** OTP gửi qua email, khách vẫn nhập số điện thoại ([D-13](./quyet-dinh.md#d-13-otp-của-khách-gửi-qua-email-không-qua-sms), BR-16, BR-17); ba mức xác nhận và giờ trống hiện theo buổi ([D-14](./quyet-dinh.md#d-14-mẫu-xác-nhận-thao-tác-và-cách-hiện-giờ-trống)). Sapio Design System thêm ConfirmDialog, Toast, Segmented và token `fill-selected`; bản sao trong `design/sapio/` và `app/sapio/` đã cập nhật.
- **Ghi chú cho ERD:** ghép đối tượng được phục vụ của khách mới với hồ sơ cũ sau khi xác thực OTP (trùng email, trùng tên bé) chưa có quy tắc; quyết định khi thiết kế bảng `served_subjects`.
- **Tiếp theo:** Claude Code làm [Bước 7 của kế hoạch](../ky-thuat/ke-hoach-ui-mock.md#bước-7-sửa-theo-review-pr-2) trên cùng nhánh; review lại rồi mới merge.

### 07/11/2026 (tối): code giao diện mock

- **Đã làm:** 6 bước của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md) trên nhánh `feat/ui-mock`. Token Sapio và font Be Vietnam Pro cho cả `/docs` lẫn `/mock`; fixtures ngày 07/11 có đoạn chiếm dụng, `StaffProfile` hai lớp, `ServedSubject.kind` là `'self' | 'other'`; 11 component trong `components/sapio/` (ví dụ ở `/mock/components`); `/mock/dat-lich` cho hai cơ sở; `/mock/le-tan`, `/mock/le-tan/tai-nguyen`, `/mock/hom-nay`. Kiểm bằng Playwright headless: đi hết luồng khách chỉ bằng bàn phím ở 390px và 1280px; lịch lễ tân ở 1440px, 1024px, 390px không lỗi, không cuộn ngang.
- **Vướng:** `pnpm dev` (Turbopack) giữ bản cũ của module phía server khi file đổi export, gây lỗi `is not a function` và lỗi hydration; khởi động lại dev server là hết. Class trong `components.css` không nằm trong `@layer`, nên muốn utility Tailwind đè lên `.sp-btn` phải thêm `!`.
- **Tiếp theo:** review pull request; chốt hai màn hình với cô; ERD giai đoạn 1.

### 07/11/2026 (chiều): bàn giao giao diện cho Claude Code

- **Đã làm:** chốt UI hai màn hình đầu (D-12; BR-14, BR-15). Chép Design System và các màn hình đã vẽ vào `design/` để Claude Code đọc offline. Viết [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md) 6 bước.
- **Cách làm từ đây:** phiên claude.ai lo phân tích, thiết kế, review; Claude Code trên máy code theo kế hoạch trên nhánh `feat/ui-mock`, mở pull request để review.
- **Tiếp theo:** Claude Code làm kế hoạch UI mock; giai đoạn 0 còn: dùng thử SimplyBook.me và một phần mềm Việt Nam, sửa đề cương nếu cô góp ý.

### 07/11/2026 (trưa): tên sản phẩm và hệ thống thiết kế

- **Đã làm:** chốt tên **Sapio** và hướng thiết kế "ấm và chính xác" ([D-11](./quyet-dinh.md#d-11-tên-sản-phẩm-sapio-và-hệ-thống-thiết-kế)). Dựng "Sapio Design System" trên Claude Design: tokens sáng/tối (đã kiểm tương phản), font Be Vietnam Pro, màu trạng thái, màu hai cơ sở, 8 component có preview. Docs chạy cổng 3100 để không trùng web 3000. Phiên claude.ai đã liên kết với máy (thư mục `D:\UITProgress\DoAn\source`).
- **Sau đó:** làm mềm Design System (bỏ viền đậm, nền `fill-tonal`, bóng mềm, góc tròn hơn), đổi màu Pawpaw sang cam quýt. Vẽ canvas "Sapio · Màn hình đầu tiên": 3 hướng trang khách, 2 hướng lịch lễ tân, cùng bản máy tính, iPad, điện thoại; chốt hướng ([D-12](./quyet-dinh.md#d-12-hướng-giao-diện-hai-màn-hình-đầu)).
- **Tiếp theo:** đưa token Sapio vào `datn-docs` và `apps/web` (thay theme shadcn mặc định); code luồng đặt lịch của khách (A) và lịch lễ tân (A) vào `/mock` theo canvas; tách màn "Trang đặt lịch của khách" thành "Trang cơ sở" và "Luồng đặt lịch".

### 07/11/2026: review Phần B

- **Đã làm:** review app docs + mock. CI (thêm qua [PR #1 của datn-docs](https://github.com/ngchinhdev/datn-docs/pull/1)) xanh: Prettier, typecheck, build 16 trang (`/docs` tĩnh, `/mock` động, `/api/search`), lockfile 584 gói qua kiểm tra chuỗi cung ứng của pnpm. Không gói nào nằm trong danh sách bị chiếm quyền (Shai-Hulud, `keyv`/`cacheable`, `chalk`/`debug`, các gói độc tháng 10–11/2026). `pnpm audit`: 0 high/critical; 1 moderate (`minimatch`) + 1 low (`deepmerge`), cùng hai lỗ hổng đã biết từ `datn-saas`, đến từ CLI `shadcn`, không chạy khi xem trang.
- **Ghi chú cho ERD (giai đoạn 1):** `ServedSubject.kind` trong fixtures là `'self' | 'pet'`, tức là từ khóa ngành nằm trong kiểu dữ liệu. Khi thiết kế bảng thật, loại đối tượng được phục vụ nên do `industryTemplate` khai báo (dữ liệu), lõi chỉ phân biệt "chính khách hàng" hay "đối tượng khác" (quy tắc 5).
- **B3 xong:** deploy lên Vercel tại https://datn-docs.vercel.app (Hobby, biến môi trường `ENABLE_EXPERIMENTAL_COREPACK=1` để Vercel dùng pnpm 11 theo `packageManager`, Node 24). `/`, `/docs` (đủ 11 trang) và `/mock` mở được. PR #1 (CI) đã merge. Phần B của kế hoạch dựng base hoàn tất.
- **Tiếp theo:** giai đoạn 0 còn lại: dùng thử SimplyBook.me và một phần mềm Việt Nam, sửa đề cương nếu cô góp ý. Sau đó giai đoạn 1: ERD và hai màn hình mock đầu tiên (trang đặt lịch của khách, lịch lễ tân).

### 05/11/2026 (tối): app docs + mock `datn-docs`

- **Đã làm:** Phần B, bước B1 và B2 của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md). B1: Next.js 16.4.5 + Fumadocs 16.17 (cài thủ công, API `fumadocs-mdx/macro`), tài liệu ở `/docs`, tìm kiếm tiếng Việt chạy được, đọc thẳng file `.md`; pnpm 11.28.11 với `minimumReleaseAge` và `allowBuilds` giống `datn-saas` (`esbuild: false`). Link tải đề cương `.docx` ở trang Đề cương. B2: shadcn `base-nova` cùng `components.json` với `apps/web`, Fumadocs dùng preset `shadcn.css` nên tài liệu và mock chung một theme; `/mock` có bộ chọn tenant và vai trò trên query string (`/mock?tenant=pawpaw&role=receptionist`), danh sách 4 màn hình của roadmap, fixtures cho Salon Tóc Mây và Spa thú cưng Pawpaw.
- **Phát hiện:** Fumadocs chỉ đổi link sang URL khi link trỏ tới file có đuôi `.md`; link không đuôi làm gãy các link ở trang `/docs`. Đã đổi mọi link tương đối sang dạng `./trang.md` và ghi quy ước vào `CLAUDE.md`. Mục lục roadmap có một anchor sai (`#7-quy-tắc-nghiệp-vụ-ban-đầu`), đã sửa. `minimumReleaseAge` chặn bản Fumadocs vừa ra trong ngày, pnpm tự chọn bản trước đó.
- **Ghi chú cho sau:** fixtures dùng ID dễ đọc (`may-mai`) thay cho UUIDv7 để dễ đối chiếu. Trạng thái lịch hẹn trong fixtures (`confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`) là giả định, cần chốt khi thiết kế ERD. `assets/de-cuong-chi-tiet.docx` và `public/files/` là hai bản, sửa đề cương thì cập nhật cả hai.
- **Tiếp theo:** B3 (kết nối Vercel, kiểm `/docs` và `/mock` trên link deploy); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 05/11/2026: review base `datn-saas`

- **Đã làm:** review toàn bộ base. CI trên GitHub của `main` xanh (03/11), nên A7 xong. Mở [PR #1](https://github.com/ngchinhdev/datn-saas/pull/1), CI xanh đủ các bước: bật `erasableSyntaxOnly` cho `shared` và `scheduling-core`; thêm `createPool()` có `pool.on('error')` để API không chết khi Postgres khởi động lại (có unit test); `CLAUDE.md` nhắc đọc `apps/web/AGENTS.md` và commit nhỏ.
- **Ghi chú cho sau:** (1) khi thiết kế thuật toán giờ trống (BT1), chốt lõi tính trên mốc thời gian tuyệt đối, chỉ đổi sang giờ địa phương ở rìa (hiện `Interval` là phút từ đầu ngày địa phương); (2) khi làm xác thực, kiểm tra chống CSRF của Nest với request POST từ server Next (không có header `Origin`); (3) oxlint còn nhiều cảnh báo nhiễu `react-in-jsx-scope`, có thể tắt rule này.
- **Bổ sung:** PR #1 gộp còn một commit, thêm sửa lint (tắt `react-in-jsx-scope`, cho phép import CSS). CI xanh, 0 cảnh báo.
- **Kiểm tra bảo mật dependency (828 gói trong lockfile):** không gói nào nằm trong danh sách bị chiếm quyền của các đợt Shai-Hulud (gồm đợt `keyv`/`cacheable` tháng 8/2026, 446 gói) hay đợt `chalk`/`debug` 9/2025. `pnpm audit`: 0 high/critical; 3 moderate + 1 low (`glob`, `minimatch`, `deepmerge`), đều nằm trong công cụ dev (Testcontainers, Nest CLI, shadcn CLI), không chạy ở production, chờ bản vá upstream. Gói có script cài đặt: `@scarf/scarf` (thống kê lượt cài của swagger-ui), `ssh2`, `cpu-features`, `protobufjs` (đều qua Testcontainers); đều là gói thật.
- **pnpm 11:** [PR #2](https://github.com/ngchinhdev/datn-saas/pull/2) nâng pnpm 9.15 lên 11.28.11, đặt `minimumReleaseAge` và `allowBuilds` ([T-02](../ky-thuat/quyet-dinh-ky-thuat.md#t-02-monorepo-pnpm-workspaces--catalog-turborepo)). CI xanh, lockfile cũ dùng được nguyên, qua kiểm tra chuỗi cung ứng của pnpm.
- **Tiếp theo:** merge PR #1 và PR #2; trên máy chạy `pnpm install` (Corepack tự tải pnpm 11); xóa nhánh `claude/audit-tmp` trên GitHub; Phần B (app docs + mock); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 03/11/2026 (tối): dựng base `datn-saas`

- **Đã làm:** Phần A của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md), bước A1 đến A6 và A8: monorepo pnpm + Turborepo; Docker Compose (Postgres 18, Redis 8, Mailpit); `shared` (BR-61 `normalizePhone`); `scheduling-core` (phép toán khoảng, property test, coverage 100%); API NestJS 12 (config Zod, Drizzle 1.0.0-rc.5, `withTenant`, migration `btree_gist` và grant, Problem Details, Swagger, `/v1/health`); web Next.js 16.4 (shadcn, TanStack Query, trang `/` hiển thị health); script chặn từ khóa ngành; workflow CI. Mọi bước CI chạy xanh trên máy.
- **Phát hiện:** spike RLS cho thấy policy phải dùng `nullif(current_setting(...), '')` ([T-07](../ky-thuat/quyet-dinh-ky-thuat.md#t-07-cô-lập-dữ-liệu-rls-hai-lớp)); 20 transaction đồng thời chỉ 1 giữ được chỗ (bằng chứng sớm cho BT2). Chốt Node 24 thay cho 26 ([T-01](../ky-thuat/quyet-dinh-ky-thuat.md#t-01-runtime-nodejs-24-lts)), TypeScript 6.0, pnpm 9.15.
- **Vướng:** máy dev có sẵn PostgreSQL Windows chiếm cổng 5432; compose cho đổi cổng bằng `POSTGRES_PORT`.
- **Tiếp theo:** đẩy `datn-saas` lên GitHub và kiểm tra CI xanh (A7); Phần B (app docs + mock).

### 03/11/2026

- **Đã làm:** gửi đề cương cho cô Thùy Trâm. Tạo 2 repo `ngchinhdev/datn-docs` và `ngchinhdev/datn-saas`. Đưa đề cương, roadmap, nhật ký quyết định, quy tắc nghiệp vụ, thuật ngữ vào `datn-docs`. Nghiên cứu phiên bản và pattern hiện hành của Next.js, NestJS, Drizzle, Node.js; viết [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md), [Chiến lược kiểm thử](../ky-thuat/chien-luoc-kiem-thu.md), [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md).
- **Phát hiện:** payOS không có môi trường test → đổi sang provider giả lập ([D-09](./quyet-dinh.md#d-09-thanh-toán-payos-không-có-môi-trường-test)).
- **Tiếp theo:** dựng base source trên máy bằng Claude Code theo kế hoạch; song song dùng thử SimplyBook.me và một phần mềm Việt Nam (giai đoạn 0).

## Trước khi bắt đầu (26/10 – 02/11/2026)

- Khảo sát nhiều hướng đề tài (giáo dục, thuế, nhà trọ, HSK, hệ thống thi...), chốt đề tài đặt lịch đa tài nguyên ([D-01](./quyet-dinh.md#d-01-đề-tài-nền-tảng-đặt-lịch-đa-tài-nguyên-cho-cơ-sở-dịch-vụ-theo-lịch-hẹn)).
- Cắt phạm vi, viết roadmap 34 tuần, đề cương theo mẫu UIT.
