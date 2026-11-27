---
title: "T-22. Đăng ký: để lộ email đã có tài khoản, và cho đăng ký lại tài khoản chưa xác thực"
---

Chốt ngày 27/11/2026 khi viết đặc tả [Đăng ký cơ sở](../features/signup.md).

## Bước 1 để lộ việc email đã có tài khoản

- **Quyết định:** email thuộc tài khoản đã xác thực thì bước 1 trả **409** `EMAIL_TAKEN` và giao diện báo "Email này đã có tài khoản Sapio" kèm link đăng nhập (BR-74.10).
- **Vì sao chấp nhận:**
  - Đăng ký phải báo ngay. Nếu im lặng, người dùng ngồi chờ một email mã không bao giờ tới.
  - Có giới hạn theo IP: 10 yêu cầu mỗi phút ở API tạo tài khoản và 30 mỗi phút ở API kiểm slug ([API đăng ký](../api/signup.md#giới-hạn-theo-ip)).
  - Đăng nhập vẫn giữ BR-76.1: sai email, sai mật khẩu hay sai cửa đều báo cùng một câu. Chỗ để lộ chỉ có bước đăng ký.
- **Hệ quả:** một IP dò được tối đa 10 email mỗi phút xem có tài khoản đã xác thực hay không. Tài khoản chưa xác thực không lộ, vì bước 1 xử lý nó như email mới (đăng ký lại).

## Tài khoản chưa xác thực được đăng ký lại

- **Quyết định:** email thuộc tài khoản chưa xác thực thì bước 1 thay tên và mật khẩu, thu hồi mọi phiên cũ, hủy mã cũ, gửi mã mới (BR-74.11).
- **Vì sao:** nếu email bị tài khoản chưa xác thực giữ chỗ vĩnh viễn, ai đăng ký bằng email của người khác cũng chặn được người đó dùng Sapio. Cho đăng ký lại thì chỉ người đọc được thư mới hoàn tất, và người đó lấy lại được email của mình bất cứ lúc nào.
- **Hệ quả:**
  - Người biết email của một người đang đăng ký dở có thể đăng ký đè, làm người đó mất phiên và mã. Chấp nhận vì tài khoản chưa xác thực chưa có dữ liệu nào; mỗi email chịu giới hạn 5 mã mỗi giờ (BR-74.6) nên lặp lại cũng không kéo dài.
  - Tài khoản chưa xác thực nằm lại ở bảng `users`; không có job dọn. Email của nó vẫn đăng ký lại được.
