---
title: Chiến lược kiểm thử
description: Các tầng kiểm thử, công cụ, quy ước và cách các bài kiểm thử phục vụ thực nghiệm E1–E9 trong báo cáo.
---

Kiểm thử là **sản phẩm chính** của đồ án, không phải phần phụ: tám bài toán khó được chứng minh bằng số liệu từ các bài kiểm thử dưới đây (xem Roadmap mục 11, thực nghiệm E1–E9).

## Các tầng

| # | Tầng | Công cụ | Kiểm cái gì | Chạy khi |
|---|---|---|---|---|
| 1 | Unit | Vitest | Hàm thuần ở lớp domain: chính sách hoàn cọc, công thức hoàn gói, tính hoa hồng, thứ tự giảm giá, chuẩn hóa số điện thoại; `scheduling-core` | Mỗi lần lưu (watch), mỗi commit, CI |
| 2 | Property-based | fast-check + Vitest | Giờ trống so với thuật toán vét cạn (E1); bất biến sổ cái (E4); công thức tiền không bao giờ âm hoặc vượt số đã thu | CI; bản dài chạy thủ công để lấy số liệu |
| 3 | Integration (DB thật) | Vitest + Testcontainers (PostgreSQL 18, Redis) | Migration chạy sạch; exclusion constraint; RLS khi kết nối bằng `app_user` (E5); 100 request giữ chỗ đồng thời (E2); repository; trigger chặn sửa sổ cái | CI |
| 4 | API e2e | Vitest + Supertest + Testcontainers | Luồng đầy đủ qua HTTP: đăng ký cơ sở → cấu hình → đặt lịch → webhook → hoàn thành → hóa đơn, hoa hồng; webhook gửi lặp (E3); ma trận quyền vai trò × endpoint | CI |
| 5 | Component FE | Vitest + Testing Library + MSW | Luồng đặt lịch ở client, form dùng schema chung, lịch lễ tân (kéo thả, hiển thị đoạn chờ), trạng thái lỗi | CI |
| 6 | E2E giao diện | Playwright + `@axe-core/playwright` | 5 luồng chính trên toàn hệ thống (Docker Compose + seed), chạy cho cả tenant salon và spa thú cưng; kiểm tra khả năng truy cập | CI (nhánh chính, PR) |
| 7 | Tải | k6 | API tìm giờ trống và đặt lịch: p95, thông lượng, điểm suy giảm (E6) | Thủ công, trước khi viết chương 5 |
| 8 | Đánh giá chatbot | Script Vitest riêng + bộ 50–100 câu hỏi | Giá, giờ trống trong câu trả lời khớp API; chuyển lễ tân đúng lúc; 0 lịch tạo khi chưa OTP (E7) | Thủ công (tốn phí API) |
| 9 | Độ dễ dùng | Thang SUS | 5–8 người làm 5 nhiệm vụ (E8) | Giai đoạn 7 |
| 10 | Tổng quát theo ngành | Bộ test lõi chạy lại với tenant spa thú cưng | Số test qua, số dòng code lõi phải sửa = 0 (E9) | CI |

## Quy ước

- **Tên test bắt đầu bằng mã BR** khi kiểm một quy tắc nghiệp vụ: `it('BR-23: hủy trước 24 giờ hoàn 100% cọc', ...)`. Nhờ vậy lập được bảng "quy tắc → test" cho báo cáo.
- **Vị trí:** unit test nằm cạnh code (`*.spec.ts`); integration ở `apps/api/test/integration`; API e2e ở `apps/api/test/e2e`; e2e giao diện ở `apps/web/e2e`.
- **Thời gian:** không gọi `Date.now()` trực tiếp trong nghiệp vụ; dùng `Clock` để test cố định được giờ. Test chạy với `TZ=UTC`; dữ liệu mẫu có chi nhánh `Asia/Ho_Chi_Minh` để bắt lỗi múi giờ.
- **Dữ liệu test:** dùng factory (hàm tạo dữ liệu có giá trị mặc định hợp lệ), không dùng file dump lớn. Mỗi test tự tạo tenant riêng nên chạy song song không đụng nhau.
- **Testcontainers:** một container Postgres cho mỗi worker Vitest, chạy migration một lần; mỗi test dùng tenant mới hoặc transaction rollback.
- **Không mock database** trong integration và API e2e. Exclusion constraint, RLS, trigger chỉ kiểm được trên Postgres thật.
- **MSW** chỉ dùng cho test component ở FE. Handler MSW lấy kiểu dữ liệu từ `packages/shared` để không lệch với API thật.
- **Coverage:** ngưỡng 90% (lines, branches) cho `packages/scheduling-core` và lớp domain của `billing`, `ledger`, `commission`; phần còn lại không đặt ngưỡng cứng, ưu tiên test có ý nghĩa.

## Định nghĩa hoàn thành một tính năng

1. Có BR tương ứng trong [Quy tắc nghiệp vụ](../nghiep-vu/quy-tac) (hoặc đã thêm mới).
2. Có test cho mỗi BR, ở tầng thấp nhất kiểm được nó.
3. `pnpm lint && pnpm typecheck && pnpm test` xanh; integration và e2e liên quan xanh.
4. Cập nhật tài liệu nếu đổi API hoặc nghiệp vụ; ghi một dòng vào [Tiến độ](../du-an/tien-do).

## Lưu kết quả thực nghiệm

Kết quả các thực nghiệm E1–E9 lưu thành file JSON hoặc CSV trong `datn-saas/experiments/results/` (có ngày và commit), để vẽ bảng, biểu đồ cho chương 5. Không ghi số liệu bằng tay.
