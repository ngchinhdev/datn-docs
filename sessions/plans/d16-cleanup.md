# Kế hoạch: dọn code theo D-16 (chỉ cơ sở làm đẹp)

Tài liệu chính thức đã sửa theo D-16:

- `content/docs/overview/scope.md`
- `features/business-rules.md`: BR-13, BR-17, BR-19, BR-55; BR-70 và BR-71 đã bỏ
- `screens/index.md`: MH-19 và MH-59 đã bỏ, MH-02 còn 3 bước
- `architecture/erd.md` và `architecture/availability-algorithm.md`: ví dụ B nay là Spa Lá Sen

Bước này sửa code của mock (`datn-docs`) và lint của `datn-saas` cho khớp. Có khoảng 78 file mock nhắc Pawpaw, `industry` hoặc `subject`.

## D1. Dữ liệu mẫu: Pawpaw thành Spa Lá Sen

- Thêm tenant `la-sen` (Spa Lá Sen, slug `la-sen`) thay cho `pawpaw`.
- Token màu `tenant-la-sen` thay `tenant-pawpaw`, sửa ở cả hai bản `tokens.css`: `design/sapio/` và `app/sapio/`. Chọn một màu xanh lá dịu, đạt tương phản AA trên nền trắng.
- Tài nguyên: Kỹ thuật viên, Giường, Bồn ngâm, Phòng xông.
- Dịch vụ:
  - "Ngâm bùn, xông hơi", có các đoạn đúng như ví dụ ở mục 2.2 của `availability-algorithm.md`;
  - thêm 3 đến 5 dịch vụ spa thường gặp: massage body 60 và 90 phút (hai biến thể), chăm sóc da mặt, gội dưỡng sinh.
- Nhân sự: Thảo và Ngân (kỹ thuật viên), cùng chủ và quản lý lấy từ các tài khoản Pawpaw cũ, đổi email sang `@lasen.vn`. `linh.pham@email.vn` làm lễ tân ở `la-sen` thay cho `pawpaw`.
- Xóa `mock/fixtures/pawpaw-*.ts`. Sửa `generate.ts`, `index.ts`, `people.ts`, `bookings.ts`.
- Sửa `pnpm check:availability` cho chạy với dữ liệu mới. Ví dụ VD7 và VD8 phải cho đúng kết quả như trong tài liệu.

## D2. Bỏ "đối tượng được phục vụ"

- Xóa route `/mock/[tenant]/me/subjects` và mục của nó trong `me-shell`. Xóa component `components/sapio/subject-fields.tsx`.
- Luồng đặt lịch (`booking-flow.tsx`, `booking-draft.tsx`, `use-booking-commit.ts`): bỏ bước "Cho bé nào?". Đặt nhóm (BR-19) là người đặt cộng tối đa 3 người đi cùng, người đi cùng chỉ cần tên.
- Mỗi mục lịch hẹn có `guestName?` thay cho `servedSubjectId`, theo ERD.
- Lịch lễ tân (`create-panel.tsx`) và hồ sơ khách (`customer-profile.tsx`): bỏ phần đối tượng.
- Chi tiết dịch vụ (`settings/services/[id]/*`):
  - bỏ cách chọn biến thể "theo thuộc tính" và phần điều kiện `match`, biến thể luôn do khách tự chọn (BR-13);
  - khi lưu, kiểm tên biến thể không trùng (BR-55).
- Trợ lý (`assistant*.ts`): bỏ phần hỏi thông tin của bé. Dịch vụ có nhiều biến thể thì hỏi khách chọn.

## D3. Bỏ gói cấu hình ngành

- Xóa route `/mock/admin/templates` (cả danh sách và chi tiết), `template-store.tsx`, và mục "Gói cấu hình ngành" trong menu quản trị nền tảng.
- Đăng ký (`signup-flow.tsx`): bỏ bước `industry`, còn `account`, `verify`, `business`, `done`. Cơ sở mới nhận loại tài nguyên mặc định Nhân viên, Ghế, Giường, Phòng.
- Trang giới thiệu (`landing-screen.tsx`): bỏ khối chọn ngành.
- Quản trị nền tảng:
  - Khách thuê: bỏ cột Ngành, bộ lọc Ngành và tham số `industry` của `filterTenants`;
  - Tổng quan: bỏ khối "cơ sở theo ngành".
- Bỏ mọi kiểu, hàm và từ ngữ theo ngành (`industry`, `vocabulary`, "groomer", "bé"), kể cả trong email mẫu và `account-mail.ts`.

## D4. `datn-saas`

- Xóa `scripts/check-industry-keywords.mjs` và lệnh gọi nó trong script `lint` của `package.json` gốc (T-12 đã gạch).
- Sửa mọi chỗ nhắc lệnh kiểm từ khóa ngành trong `CLAUDE.md`, `README.md` và workflow CI (nếu có).

## Xong khi

- [ ] `grep -riE "pawpaw|industry|servedSubject|subject|pet_spa|thú cưng|groomer" app mock components scripts` không còn kết quả. Có ngoại lệ chính đáng thì ghi vào mục "Tự quyết" của PR.
- [ ] `pnpm check:availability`, `pnpm typecheck`, `pnpm build`, `prettier --check` đều qua.
- [ ] Đã chụp `pnpm shot` cho các màn: `/mock/la-sen/book`, `/mock/app/la-sen/calendar`, `/mock/app/la-sen/settings/services/<ngâm bùn>`, `/mock/signup`, `/mock/admin/tenants`.
- [ ] `datn-saas`: `pnpm lint` qua sau khi bỏ script.

## Prompt D-16

```
Làm trong datn-docs: git checkout main && git pull && git checkout -b chore/d16-beauty-only.
Đọc CLAUDE.md, mục mới nhất trong sessions/progress/, decisions/d16-beauty-only-scope.md,
overview/scope.md, features/business-rules.md (BR-13, BR-17, BR-19, BR-55), screens/index.md,
architecture/erd.md, architecture/availability-algorithm.md. Làm sessions/plans/d16-cleanup.md,
mục D1 đến D3, mỗi mục một hoặc vài commit. Tài liệu là đặc tả, chỗ nào code khác tài liệu thì
làm theo tài liệu; tài liệu thiếu thì dừng lại hỏi mình. Chỉ dùng biến trong tokens.css và class
trong components.css. Chỉ chạy các lệnh kiểm trong CLAUDE.md và mục "Xong khi". Mở PR, ghi mục
"Tự quyết", không merge.
Sau đó làm mục D4 trong datn-saas, nhánh chore/drop-industry-lint, PR riêng.
```
