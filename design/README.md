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

Lý do các lựa chọn: `content/docs/du-an/quyet-dinh.md` mục D-11, D-12. Quy tắc nghiệp vụ liên quan: BR-03, BR-05, BR-07, BR-13, BR-14, BR-15, BR-50 đến BR-59, BR-70 trong `content/docs/nghiep-vu/quy-tac.md`.
