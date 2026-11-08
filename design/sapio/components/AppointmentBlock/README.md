# AppointmentBlock

Một lịch hẹn trên lưới lịch, chia theo đoạn chiếm dụng: `.sp-appt` + trạng thái (`--confirmed`, `--checked-in`, `--completed`, `--no-show`, `--hold`), bên trong là các `.sp-appt__seg`, đoạn chờ thêm `--wait`.

- Người dùng component cung cấp: `top` và `height` tính từ giờ bắt đầu và thời lượng (16px mỗi 15 phút, token `slot-height`), chiều cao từng đoạn, tên khách, dịch vụ, giờ, tài nguyên.
- Cột **nhân viên**: vẽ đủ các đoạn; đoạn chờ vạch chéo. Lịch hẹn khác rơi vào đoạn chờ dùng `--inset`.
- Cột **ghế, phòng, lồng sấy**: một đoạn liền, vì tài nguyên bận suốt.
- Dòng 1 `appt-title` (khách · dịch vụ), dòng 2 `appt-meta` (giờ · tài nguyên). Một đoạn cao 32px (30 phút) chỉ chứa một dòng: khối có nhiều đoạn thì tên ở đoạn đầu, giờ ở đoạn cuối.
- Khối không viền; chấm trước tên mang màu trạng thái. Đang kéo: thêm `--dragging`. Đã hủy: không vẽ trên lịch.
- **Chuẩn bị, dọn dẹp:** `.sp-appt__seg--buffer`, viền đứt, chữ nhỏ mờ. Đoạn chuẩn bị nằm trước giờ hẹn, dọn dẹp sau giờ xong; lễ tân thấy để biết tài nguyên còn bận, khách không thấy (BR-51).
