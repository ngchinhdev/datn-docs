---
title: Quy tắc nghiệp vụ
description: Bảng quy tắc nghiệp vụ BR-xx của phạm vi đồ án. Tài liệu sống; mỗi BR có test tương ứng.
---

**Cách dùng bảng này**

- Mỗi quy tắc có mã cố định. Không đánh lại mã khi xóa; quy tắc bỏ đi ghi "(đã bỏ, lý do...)".
- Test của một quy tắc đặt tên bắt đầu bằng mã, ví dụ `it('BR-05: đoạn chờ giải phóng nhân viên nhưng vẫn giữ ghế', ...)`.
- Các chữ cái X, Y, N, M, K trong quy tắc là tham số **cấu hình theo cơ sở**, có giá trị mặc định trong gói cấu hình ngành.
- Quy tắc lấy từ [Phân tích nghiệp vụ gốc](./phan-tich-goc), đã lọc theo phạm vi đồ án ([D-04](../du-an/quyet-dinh#d-04-cắt-phạm-vi-cho-một-người-làm)).

## Đặt lịch

| Mã | Quy tắc |
|---|---|
| BR-01 | Không có hai đoạn trạng thái `hold`/`active` chồng nhau trên cùng một tài nguyên |
| BR-02 | Giờ trống chỉ nằm trong giờ mở cửa của chi nhánh; ngày đặc biệt ưu tiên hơn giờ thường lệ |
| BR-03 | Nhân viên chỉ được xếp cho dịch vụ thuộc kỹ năng của mình |
| BR-04 | Thời gian chuẩn bị và dọn dẹp chiếm dụng tài nguyên như thời gian làm |
| BR-05 | Đoạn "chờ" giải phóng nhân viên nhưng vẫn chiếm phòng/ghế/lồng sấy theo cấu hình dịch vụ |
| BR-06 | Không cho đặt sớm hơn X giờ và xa hơn Y ngày so với hiện tại (cấu hình) |
| BR-07 | Giữ chỗ tồn tại tối đa 10 phút; hết hạn thì tự trả lại |
| BR-08 | Khách tự đổi/hủy phải trước tối thiểu X giờ; tự đổi tối đa N lần mỗi lịch |
| BR-09 | Quá giờ hẹn M phút mà chưa check-in thì đánh dấu "không đến" |
| BR-10 | Không đến K lần trong 6 tháng thì lần sau bắt buộc đặt cọc |
| BR-11 | Duyệt nghỉ phép phải xử lý xong mọi lịch bị ảnh hưởng; khách chọn đích danh phải được hỏi ý trước khi đổi người |
| BR-12 | Lịch đã đặt giữ giá tại thời điểm đặt dù sau đó giá dịch vụ thay đổi |
| BR-13 | Biến thể dịch vụ (giá, thời lượng) được chọn theo thuộc tính của đối tượng được phục vụ |

## Thanh toán, ví, gói

| Mã | Quy tắc |
|---|---|
| BR-20 | Mọi thay đổi số dư phải qua bút toán; không có thao tác sửa số dư |
| BR-21 | Mỗi khoản thanh toán chỉ được ghi nhận một lần theo `idempotency_key` |
| BR-22 | Thứ tự giảm giá: giá gốc → khuyến mãi tự động → voucher (tối đa 1) |
| BR-23 | Hoàn cọc mặc định: hủy trước 24h hoàn 100%, 4–24h hoàn 50%, dưới 4h hoặc không đến hoàn 0% (cấu hình được) |
| BR-24 | Cơ sở chủ động hủy thì luôn hoàn cọc 100% |
| BR-25 | Rút tiền ví chỉ hoàn phần tiền thật còn lại, không hoàn tiền tặng |
| BR-26 | Doanh thu gói ghi nhận theo từng buổi sử dụng |
| BR-27 | Hoàn gói = giá gói − (số buổi đã dùng × giá lẻ tại thời điểm mua) − phí hủy; âm thì bằng 0 |
| BR-28 | Hoàn tiền bắt buộc ghi lý do và cần quyền quản lý; kéo theo thu hồi hoa hồng và hoàn buổi gói |

## Hoa hồng

| Mã | Quy tắc |
|---|---|
| BR-40 | Hoa hồng tính trên giá trị thực thu sau giảm giá (mặc định) |
| BR-41 | Quy tắc mới chỉ áp cho dịch vụ hoàn thành từ ngày hiệu lực |
| BR-42 | Kỳ đã chốt không thay đổi; điều chỉnh phát sinh ghi vào kỳ mở kế tiếp |
| BR-43 | Nhiều nhân viên cùng làm thì chia theo tỉ lệ cấu hình của dịch vụ |

## Dữ liệu, bảo mật, cấu hình ngành

| Mã | Quy tắc |
|---|---|
| BR-60 | Cùng số điện thoại ở hai khách thuê là hai hồ sơ độc lập |
| BR-61 | Số điện thoại được chuẩn hóa (`0912...` và `+84912...` là một) |
| BR-62 | Ghi chú nội bộ không bao giờ hiển thị cho khách |
| BR-63 | Thao tác nhạy cảm (hoàn tiền, xuất danh sách khách, đổi giá) được ghi nhật ký |
| BR-64 | Khách đồng ý xử lý dữ liệu cá nhân khi đặt lịch lần đầu; đồng ý nhận quảng cáo là lựa chọn riêng |
| BR-70 | Gói cấu hình ngành chỉ được nạp khi tạo tenant; sau đó mọi chỉnh sửa thuộc về tenant, không ảnh hưởng gói gốc |
| BR-71 | Thuộc tính của đối tượng được phục vụ phải hợp lệ theo schema của ngành trước khi lưu |

---

## Tình huống đặc biệt phải có test

| Tình huống | Xử lý | BR liên quan |
|---|---|---|
| Hai khách cùng bấm đặt giờ cuối cùng trong một giây | Đúng 1 người thành công, người kia nhận lỗi kèm gợi ý giờ gần nhất | BR-01, BR-07 |
| Khách thanh toán xong nhưng giữ chỗ đã hết hạn | Giờ còn trống thì xác nhận; đã có người đặt thì tự tạo yêu cầu hoàn tiền | BR-07, BR-21 |
| Cổng thanh toán báo kết quả hai lần | Chỉ ghi nhận một lần | BR-21 |
| Dịch vụ kéo dài quá giờ, lấn sang lịch sau | Cảnh báo lễ tân, gợi ý chuyển lịch sau cho nhân viên khác | BR-01 |
| Đổi giá dịch vụ khi đã có lịch đặt trước | Lịch cũ giữ giá cũ | BR-12 |
| Đổi quy tắc hoa hồng giữa tháng | Quy tắc mới chỉ áp từ ngày hiệu lực | BR-41 |
| Hoàn tiền sau khi kỳ hoa hồng đã chốt | Bút toán âm vào kỳ mở kế tiếp | BR-42, BR-28 |
| Nhân viên nghỉ đột xuất, đã có lịch trong ngày | Liệt kê lịch bị ảnh hưởng; khách chọn đích danh được hỏi ý | BR-11 |
| Gói liệu trình hết hạn khi khách còn lịch đặt trước | Cảnh báo khi đặt; đến ngày, lễ tân chọn gia hạn hoặc tính giá lẻ | BR-26 |
| Cùng số điện thoại đặt ở hai cơ sở khác nhau | Hai hồ sơ độc lập, không cơ sở nào thấy của nhau | BR-60 |
| Một khách đặt cho hai thú cưng cùng lúc | Đặt nhóm, mỗi bé là một đối tượng được phục vụ | BR-13 |

## Câu hỏi nghiệp vụ còn mở

Ghi các điểm chưa rõ ở đây; chốt xong thì chuyển thành BR.

- Giữ chỗ 10 phút có áp dụng cho lễ tân đặt tại quầy không, hay chỉ cho trang công khai?
- Khi khách chọn "bất kỳ ai", có cho lễ tân đổi người sau khi đã xác nhận mà không báo khách không?
- Hoa hồng của dịch vụ trả bằng buổi trong gói tính trên giá một buổi của gói hay giá lẻ hiện hành? (Phân tích gốc: giá một buổi của gói.)
