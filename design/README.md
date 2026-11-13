# Thiết kế Sapio (bản sao để code)

Thư mục này là **bản sao** của hai trang thiết kế trên Claude Design, để Claude Code đọc được mà không cần mở claude.ai. Khi thiết kế đổi, cập nhật lại bản sao này (nhờ phiên claude.ai làm) và ghi vào `content/docs/du-an/tien-do.md`.

| Bản gốc trên claude.ai | Bản sao ở đây |
|---|---|
| Sapio Design System: https://claude.ai/artifact/32PaNz4wzR7NcWXqxj5JzN | `design/sapio/` |
| Canvas "Sapio · Màn hình đầu tiên": https://claude.ai/artifact/3uD469w5cf2gKYR7v4XQwd | `design/screens/` |

Hai link trên là trang riêng tư của chủ repo; người khác chỉ mở được khi được chia sẻ.

## `design/sapio/`: hệ thống thiết kế

- `README.md`: **đọc trước khi viết bất kỳ giao diện nào.** Quy tắc màu, chữ, góc, bóng, lịch, giọng văn.
- `tokens.json`: nguồn sự thật của mọi token (màu sáng/tối, chữ, khoảng cách, góc, bóng, lưới lịch).
- `tokens.css`: biến CSS sinh từ `tokens.json` (`--surface`, `--primary`, `--tenant-may`...). Theme tối bằng `[data-theme="dark"]`.
- `components.css`: style của các component (`.sp-btn`, `.sp-appt`, `.sp-cal`, `.sp-slot`...), chỉ dùng biến trong `tokens.css`.
- `components/<Tên>/README.md` và `preview.html`: hướng dẫn và bản xem mẫu từng component.

## `design/screens/`: các màn hình đã vẽ

File `.dc.html` là định dạng của canvas (thẻ `<x-dc>`, `{{...}}`, `<sc-for>`). **Không chạy được trực tiếp**: dùng làm bản tham chiếu bố cục, nội dung chữ và kích thước. Phần trong `<x-dc>` là HTML bình thường dùng class của `components.css`.

| File | Màn hình | Trạng thái | Route trong `/mock` |
|---|---|---|---|
| `Main.dc.html` | Khách · bước chọn ngày giờ, điện thoại | **Đã chọn** (phương án A) | `/mock/[tenant]/book` bước "Ngày giờ" |
| `KhachChonTho.dc.html` | Khách · bảng chọn thợ trượt lên | **Đã chọn** | `/mock/[tenant]/book`, mở từ dòng "Thợ" |
| `KhachDesktop.dc.html` | Khách · chọn ngày giờ, máy tính | **Đã chọn** | `/mock/[tenant]/book` ở màn hình ≥ 900px |
| `KhachMotTrang.dc.html` | Khách · một trang (Pawpaw) | Lấy một phần: bước chọn thú cưng, giá theo cân nặng | `/mock/pawpaw/book` bước "Cho bé nào?" |
| `KhachLichThang.dc.html` | Khách · lịch tháng | Không chọn | không làm |
| `LeTanChiTiet.dc.html` | Lễ tân · lịch theo nhân viên + bảng chi tiết, máy tính | **Đã chọn** | `/mock/app/[tenant]/calendar` |
| `LeTanTaiNguyen.dc.html` | Lễ tân · lịch theo tài nguyên | **Đã chọn** | `/mock/app/[tenant]/calendar?view=resources` |
| `LeTanTablet.dc.html` | Lễ tân · iPad ngang, bảng chi tiết dạng ngăn trượt | **Đã chọn** | `/mock/app/[tenant]/calendar` ở 768–1199px |
| `LeTanDienThoai.dc.html` | Lễ tân · điện thoại, lịch từng thợ | **Đã chọn** | `/mock/app/[tenant]/calendar` ở < 768px |
| `LeTanHangCho.dc.html` | Lễ tân · "Hôm nay" (hàng chờ) | **Đã chọn**, trang riêng | `/mock/app/[tenant]/today` |
| `QuanTriKhachHang.dc.html` | MH-07 khung ứng dụng + MH-08 mẫu danh sách (Khách hàng), máy tính | **Đã chọn** | `/mock/app/[tenant]/customers` |
| `QuanTriThuGon.dc.html` | MH-07 thanh bên thu gọn, menu đổi cơ sở đang mở | **Đã chọn** | như trên, trạng thái thu gọn |
| `QuanTriNhanVien.dc.html` | MH-09 mẫu form (Cài đặt › Nhân sự › Mai) | **Đã chọn** | `/mock/app/[tenant]/settings/staff/[id]` |
| `QuanTriDienThoai.dc.html` | MH-07 + MH-08 trên điện thoại | **Đã chọn** | `/mock/app/[tenant]/customers` dưới 768px |
| `QuanTriDienThoaiLoc.dc.html` | MH-08 bảng Bộ lọc trên điện thoại | **Đã chọn** | như trên, bộ lọc mở |
| `DangKyTaiKhoan.dc.html` | MH-02 bước 1, tài khoản (điện thoại) | **Đã chọn** | `/mock/signup?step=account` (Bước 9) |
| `DangKyXacThuc.dc.html` | MH-02 bước 2, mã 6 số qua email | **Đã chọn** | `/mock/signup?step=verify` |
| `DangKyNganh.dc.html` | MH-02 bước 3, chọn ngành, xem trước gói ngành | **Đã chọn** | `/mock/signup?step=industry` |
| `DangKyNganhDienThoai.dc.html` | MH-02 bước 3 trên điện thoại (Spa thú cưng) | **Đã chọn** | như trên, dưới 768px |
| `DangKyCoSo.dc.html` | MH-02 bước 4, thông tin cơ sở, địa chỉ `toc-may.sapio.vn` | **Đã chọn** | `/mock/signup?step=business` |
| `DangKyXong.dc.html` | MH-02 bước 5, đã tạo, dùng thử 7 ngày | **Đã chọn** | `/mock/signup?step=done` |
| `GoiDungThu.dc.html` | Lịch khi đang dùng thử: dải báo, việc cần chuẩn bị | **Đã chọn** | `/mock/app/toc-may/calendar?plan=trial` |
| `GoiSapio.dc.html` | MH-61 Cài đặt › Gói Sapio, hai gói | **Đã chọn** | `/mock/app/toc-may/settings/plan` |
| `GoiHetHan.dc.html` | MH-61 khi hết hạn: chỉ còn trang gia hạn | **Đã chọn** | `/mock/app/toc-may/...?plan=expired` |
| `GoiKhoaTinhNang.dc.html` | Gói Cơ bản: tính năng bị khóa, nâng gói giữa kỳ | **Đã chọn** | `/mock/app/pawpaw/settings/chatbot` |
| `DichVuChiTiet.dc.html` | MH-45 Chi tiết dịch vụ (Tóc Mây, Nhuộm tóc): biến thể khách tự chọn, trục đoạn, giá theo cấp, ai làm được, xem trước | **Đã chọn** | `/mock/app/toc-may/settings/services/may-dye` (Bước 10) |
| `DichVuThuCung.dc.html` | MH-45 (Pawpaw, Tắm sấy): biến thể theo loài và cân nặng, sửa điều kiện, rửa bồn song song | **Đã chọn** | `/mock/app/pawpaw/settings/services/paw-bath` |
| `DichVuDienThoai.dc.html` | MH-45 trên điện thoại: trục thu nhỏ, sửa đoạn trong bảng trượt | **Đã chọn** | như trên, dưới 768px |
| `GoiNganhDanhSach.dc.html` | MH-59 danh sách gói cấu hình ngành, khung quản trị nền tảng | **Đã chọn** | `/mock/admin/templates` |
| `GoiNganhChiTiet.dc.html` | MH-59 Spa thú cưng: từ ngữ, thông tin của bé, tài nguyên, dịch vụ mẫu, chính sách, phiên bản | **Đã chọn** | `/mock/admin/templates/pet_spa` |
| `LichTaoMoi.dc.html` | MH-26 Tạo lịch từ ô trống (Tóc Mây): tìm khách, giờ và thợ điền sẵn, kiểm ngay | **Đã chọn** | `/mock/app/toc-may/calendar` (Bước 11) |
| `LichTaoPawpaw.dc.html` | MH-26 (Pawpaw): chọn bé, biến thể theo cân nặng, giờ không đặt được kèm 3 giờ gần nhất | **Đã chọn** | `/mock/app/pawpaw/calendar` |
| `LichKeoTha.dc.html` | MH-27 Đang kéo: vùng thả được, không thả được, nhãn giờ mới | **Đã chọn** | `/mock/app/toc-may/calendar` |
| `LichDoiNguoi.dc.html` | MH-27 Thả lịch khách chọn đích danh sang người khác: hỏi lại | **Đã chọn** | như trên |
| `LichChiTietDienThoai.dc.html` | MH-28 Chi tiết lịch hẹn trên điện thoại | **Đã chọn** | `/mock/app/toc-may/appointments/[id]` |
| `KtvLich.dc.html` | MH-35 Lịch của kỹ thuật viên | **Đã chọn** | `/mock/app/toc-may/my/schedule` |
| `KtvXinNghi.dc.html` | MH-36 Kỹ thuật viên xin nghỉ | **Đã chọn** | `/mock/app/toc-may/my/time-off` |
| `XepCa.dc.html` | MH-38 Xếp ca tuần | **Đã chọn** | `/mock/app/toc-may/shifts` |
| `NghiPhepDanhSach.dc.html` | MH-39 Đơn nghỉ phép | **Đã chọn** | `/mock/app/toc-may/time-off` |
| `NghiPhepXuLy.dc.html` | MH-40 Xử lý lịch bị ảnh hưởng | **Đã chọn** | `/mock/app/toc-may/time-off/[id]` |
| `KhachTrangCoSo.dc.html` | MH-11 Trang cơ sở, điện thoại: dịch vụ và giá, thợ với giờ trống sớm nhất, giờ mở cửa, chính sách | **Đã chọn** | `/mock/[tenant]` (Bước 12) |
| `KhachTrangCoSoDesktop.dc.html` | MH-11 trên máy tính, cột phải cố định có nút Đặt lịch | **Đã chọn** | như trên, từ 900px |
| `KhachNhieuDichVu.dc.html` | MH-13 Nhiều dịch vụ: giỏ có thứ tự, giờ trống cho cả chuỗi, chọn thợ từng dịch vụ | **Đã chọn** | `/mock/toc-may/book` |
| `KhachDatNhom.dc.html` | MH-14 Đặt nhóm: nhiều bé (Pawpaw), giờ cùng lúc hoặc lệch nhau; bạn và người đi cùng (Tóc Mây) | **Đã chọn** | `/mock/[tenant]/book` |
| `KhachTraCoc.dc.html` | MH-15 Trả cọc: QR, đếm ngược giữ chỗ; đã nhận cọc; tiền về sau khi mất chỗ | **Đã chọn** | `/mock/[tenant]/book/pay` |
| `KhachDangNhap.dc.html` | MH-16 Đăng nhập khách: email, mã 6 số, email chưa có lịch | **Đã chọn** | `/mock/[tenant]/login` |
| `KhachLichCuaToi.dc.html` | MH-17 Lịch hẹn của khách: sắp tới, đã qua, đặt lại | **Đã chọn** | `/mock/[tenant]/me` |
| `KhachChiTietLich.dc.html` | MH-18 Chi tiết lịch hẹn: trả lời đề nghị đổi thợ, hủy xem trước tiền hoàn, quá hạn tự đổi | **Đã chọn** | `/mock/[tenant]/me/appointments/[id]` |
| `KhachBeCuaToi.dc.html` | MH-19 Bé của tôi: danh sách, sửa theo schema ngành | **Đã chọn** | `/mock/pawpaw/me/subjects` |
| `KhachGoiVaVi.dc.html` | MH-20 Gói và ví | **Đã chọn** | `/mock/[tenant]/me/wallet` |
| `KhachThongTin.dc.html` | MH-21 Thông tin cá nhân, tin khuyến mãi | **Đã chọn** | `/mock/[tenant]/me/profile` |
| `KhachEmail.dc.html` | MH-23 Email: mã xác nhận, đã đặt lịch, hỏi ý đổi thợ | **Đã chọn** | `/mock/[tenant]/emails` (chỉ có trong mock) |
| `ThuTien.dc.html` | MH-29 Thu tiền: dòng dịch vụ và bán lẻ, giảm tay, trừ cọc, ví cộng tiền mặt | **Đã chọn** | `/mock/app/toc-may/checkout/[appointmentId]` (Bước 13) |
| `ThuTienQR.dc.html` | MH-29 Thu tiền: dùng buổi gói, chuyển khoản QR chờ cổng báo | **Đã chọn** | như trên |
| `BanGoi.dc.html` | MH-30 Bán gói | **Đã chọn** | `/mock/app/[tenant]/sales/new?type=package` |
| `NapVi.dc.html` | MH-30 Nạp ví, mức tặng | **Đã chọn** | `/mock/app/[tenant]/sales/new?type=wallet` |
| `HoaDonDanhSach.dc.html` | MH-31 Hóa đơn | **Đã chọn** | `/mock/app/[tenant]/invoices` |
| `HoaDonChiTiet.dc.html` | MH-31 Chi tiết hóa đơn: dòng, khoản thanh toán, lịch sử | **Đã chọn** | `/mock/app/[tenant]/invoices/[id]` |
| `HoSoKhach.dc.html` | MH-33 Hồ sơ khách: lịch sử, sổ ví, ghi chú nội bộ, bắt buộc cọc | **Đã chọn** | `/mock/app/[tenant]/customers/[id]` |
| `HoanTien.dc.html` | MH-34 Hoàn tiền: danh sách, bảng duyệt | **Đã chọn** | `/mock/app/[tenant]/refunds` |
| `HoanTienTao.dc.html` | MH-34 Tạo yêu cầu hoàn tiền từ hóa đơn | **Đã chọn** | `/mock/app/[tenant]/invoices/[id]` |

Lý do các lựa chọn: `content/docs/du-an/quyet-dinh.md` mục D-11, D-12. Quy tắc nghiệp vụ liên quan: BR-03, BR-05, BR-07, BR-08, BR-13 đến BR-36, BR-50 đến BR-59, BR-70 trong `content/docs/nghiep-vu/quy-tac.md`.
