---
title: D-14. Mẫu xác nhận thao tác và cách hiện giờ trống
---

Chốt ngày 07/11/2026 sau review pull request đầu tiên của mock giao diện. Ghi trong Sapio Design System (README mục "Xác nhận và hoàn tác", component ConfirmDialog, Toast, Segmented).

- **Ba mức xác nhận:** (1) thao tác về tiền, không đảo lại được hoặc ảnh hưởng người khác (thu tiền, hoàn tiền, hủy lịch, không đến, xóa) hỏi lại bằng hộp xác nhận nêu rõ đối tượng và số tiền; (2) thao tác hay làm và đảo lại được (check-in, kéo đổi giờ, đổi thợ) chạy ngay và có "Hoàn tác" 5 giây; (3) thao tác không đổi dữ liệu thì không hỏi.
- **Vì sao không hỏi lại mọi nút:** lễ tân bấm hàng trăm lần mỗi ngày; nút nào cũng hỏi thì sẽ bấm đồng ý theo phản xạ và hộp hỏi mất tác dụng. Thu tiền thì luôn hỏi vì sổ cái chỉ sửa được bằng bút toán đảo (quy tắc 6).
- **Trang khách không có hộp hỏi:** bước Xác nhận đã là màn kiểm lại, nút cuối "Xác nhận đặt lịch".
- **Giờ trống hiện theo buổi:** thanh Sáng / Chiều / Tối, mỗi lần một buổi, mặc định buổi sớm nhất còn giờ, kèm số giờ trống mỗi buổi. Bản đầu hiện đủ khoảng 35 ô giờ 15 phút trên một trang, khách phải cuộn dài và nút Tiếp tục trên máy tính bị đẩy khỏi màn hình.
- **Thêm vào hệ thống thiết kế:** component ConfirmDialog, Toast, Segmented; token `fill-selected` (mục đang chọn của Segmented, sáng hơn `fill-tonal` ở cả hai theme để không thành khối tối).
