---
title: "T-05. `packages/scheduling-core`: thuật toán thuần"
---

- Không phụ thuộc Nest, DB, ngày giờ hệ thống. Đầu vào là dữ liệu thuần (khung giờ mở cửa, ca làm, đoạn chiếm dụng đã có, yêu cầu dịch vụ), đầu ra là danh sách giờ trống và phương án gán tài nguyên.
- Thời gian bên trong biểu diễn bằng **số phút tính từ mốc Unix (UTC)**, số nguyên. Đổi sang giờ địa phương chỉ ở rìa: dựng giờ mở cửa, ca, lưới giờ, và trả kết quả. Tránh lỗi múi giờ và DST, tính được ca qua nửa đêm và yêu cầu nhiều ngày. *(Đổi ngày 08/11/2026; trước đó là phút từ đầu ngày địa phương. Kiểu `Interval` giữ nguyên, chỉ đổi ý nghĩa số.)*
- Thuật toán và ví dụ: [Thuật toán tính giờ trống](../architecture/availability-algorithm.md).
- Đây là chỗ đặt property-based test (E1).
