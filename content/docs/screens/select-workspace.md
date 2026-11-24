---
title: Chọn cơ sở (MH-06)
description: Đặc tả màn chọn cơ sở sau khi đăng nhập, và những phần chưa có.
---

| | |
|---|---|
| Mã | MH-06 |
| Route | `sapio.vn/select-workspace` |
| Người dùng | Chủ cơ sở, quản lý, lễ tân, kỹ thuật viên |
| Mock | `/mock/select-workspace` |
| Bản vẽ | `design/screens/` (bộ màn tài khoản, `TaiKhoanChonCoSo`) |
| Nghiệp vụ | [Vào cơ sở sau khi đăng nhập](../features/auth.md#vào-cơ-sở-sau-khi-đăng-nhập-một-phần-của-br-79) |
| API | [#2 Đăng xuất](../api/auth.md#2-đăng-xuất), [#3 Phiên hiện tại](../api/auth.md#3-phiên-hiện-tại), [#4 Danh sách cơ sở](../api/auth.md#4-danh-sách-cơ-sở), [#5 Vào một cơ sở](../api/auth.md#5-vào-một-cơ-sở) |

## Danh sách mục

Bố cục `AuthPage` như [Đăng nhập](./login.md): khối giới thiệu bên trái, nội dung bên phải, rộng tối đa 480px.

| # | Mục | Loại | Mặc định | Ghi chú |
|---|---|---|---|---|
| 1 | Khối giới thiệu | Khối `AuthAside`, kiểu `workspace` | | Chỉ để trang trí |
| 2 | Tài khoản | Chữ, góc trên phải | | Ký hiệu hai chữ cái của tên và tên người dùng, không bấm được |
| 3 | Tiêu đề | Chữ | "Chọn cơ sở" | `h1` |
| 4 | Dòng dẫn | Chữ | | "Tài khoản {email} làm ở {n} cơ sở. Mỗi cơ sở mở ở tab riêng cũng được." Chưa có cơ sở: "Tài khoản {email} chưa thuộc cơ sở nào." |
| 5 | Danh sách cơ sở | `ul`, tên "Cơ sở của bạn" | | Theo thứ tự tên mà API trả về. Ẩn khi chưa có cơ sở |
| 6 | Một cơ sở | Nút trong `li` | | Ký hiệu hai chữ cái của tên cơ sở, tên, vai trò (Chủ cơ sở, Quản lý, Lễ tân, Kỹ thuật viên), mũi tên |
| 7 | Dùng gần nhất | Nhãn cạnh tên của mục 6 | | Chỉ ở cơ sở có `lastUsed` |
| 8 | Bị khóa | Chữ cạnh mũi tên của mục 6 | | "Bị Sapio khóa", ở cơ sở có `status` là `locked` |
| 9 | Chưa có cơ sở | Chữ | | "Chưa có cơ sở nào. Đăng ký cơ sở của riêng bạn để bắt đầu dùng thử." Thay cho mục 5 |
| 10 | Lỗi | Chữ báo lỗi, `role="alert"` | Ẩn | Dưới danh sách |
| 11 | Đăng ký cơ sở của riêng bạn | Link | | Tới `/signup` |
| 12 | Đăng xuất | Nút chữ, cạnh mục 11 | | |
| 13 | Ngôn ngữ, giao diện | Hai nút ở thanh trên | | Như mục 15 và 16 của [Đăng nhập](./login.md) |

## Xử lý

| Khi | Xử lý |
|---|---|
| Mở trang | Máy chủ gọi API #3 và #4. Chưa có phiên hoặc phiên hết hạn thì chuyển tới `/login` |
| Bấm mục 6 | Gọi API #5 với `slug` của cơ sở. Trong lúc chờ, dòng đó hiện vòng xoay thay mũi tên và mọi dòng không bấm được |
| API trả 200 | Chuyển tới `redirectTo` |
| API trả 401 | Chuyển tới `/login` |
| Lỗi khác, kể cả lỗi mạng | Mục 10: "Chưa vào được cơ sở này, thử lại sau." Có `requestId` thì thêm "Mã lỗi: {requestId}" (BR-79) |
| Bấm mục 6 của cơ sở bị khóa | Vẫn gọi API #5. Khung ứng dụng của cơ sở hiện trang báo khóa thay cho trang đích (BR-75) |
| Bấm mục 12 | Gọi API #2, rồi chuyển tới `/login` |

## Trang đích của bản này

| Route | Nội dung |
|---|---|
| `/app/{slug}/calendar`, `/app/{slug}/my/schedule` | Tên cơ sở, tên người dùng, vai trò, nút "Đăng xuất" |
| `/app/{slug}/...` của cơ sở bị khóa | Trang báo khóa: tiêu đề "Cơ sở đang bị khóa", khách đã đặt vẫn xem và hủy được lịch của mình, địa chỉ liên hệ, nút "Chọn cơ sở khác" |
| `/app/{slug}/...` mà tài khoản không có thành viên ở đó | 404, giống slug không tồn tại |

Layout của `/app` gọi API #3; trả 401 thì chuyển tới `/login?next={đường dẫn}`.

## Chưa có

| Phần | Lý do |
|---|---|
| Chi nhánh ở dòng cơ sở | `branch` của API luôn là `null` cho tới khi thành viên gắn với chi nhánh |
| Lời mời đang chờ (nhận, từ chối) | Thuộc MH-05 (BR-78) |
| Trạng thái "Tạm dừng" và ghi chú gói hết hạn | Thuộc bảng gói (BR-82). Hiện mọi cơ sở là `active` hoặc `locked` |
| Trang báo khóa đầy đủ (lý do, thời điểm khóa) | Thuộc MH-10 |
