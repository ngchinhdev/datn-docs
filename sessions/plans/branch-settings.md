# Kế hoạch: chi nhánh và tài nguyên

Đặc tả chính thức:

- Nghiệp vụ và tiêu chí chấp nhận: `content/docs/features/branch-settings.md` (BR-93.1 đến BR-93.27, AC-57 đến AC-102)
- API: `content/docs/api/index.md` (mục "Quyền theo cơ sở và vai trò"), `content/docs/api/branch-settings.md`
- Màn hình: `content/docs/screens/branch-settings.md` (MH-42, MH-43, MH-46)
- Bảng: `content/docs/architecture/erd.md` mục 2 đến 4 và mục 10
- Quyết định: T-07, T-17, D-16

Kế hoạch này chỉ chia việc. Trang nào ở trên nói khác kế hoạch thì làm theo trang đó, và báo lại.

## Chia PR

| Bước | Repo, nhánh | Nội dung |
|---|---|---|
| S0 | `datn-docs`, `docs/branch-settings` | Đặc tả, sửa ERD và mock ba màn |
| S1 | `datn-saas`, `feat/branch-settings-api` | Guard, bảng mới, 16 endpoint, dữ liệu mẫu, test |
| S2 | `datn-saas`, `feat/branch-settings-web` | Ba trang Cài đặt, e2e, axe |

## S0. Đặc tả và mock

- Viết `features/branch-settings.md`, `api/branch-settings.md`, `screens/branch-settings.md`; sửa `api/index.md` (guard theo cơ sở và vai trò, mã lỗi gói), `decisions/t17-plan-entitlements.md` và `business-rules.md` (BR-87, BR-93), `architecture/erd.md` (ngày đặc biệt, ngừng dùng, tạm ngưng, exclusion constraint), `screens/index.md` (MH-07, MH-42, MH-43, MH-46).
- Mock ba màn khớp đặc tả: bỏ "Giá riêng"; chi nhánh có trạng thái ngừng dùng và thêm được ở gói Chuyên nghiệp hoặc dùng thử, gói Cơ bản báo `PLAN_LIMIT_REACHED`; khung tối đa 4 mỗi ngày, ít nhất một ngày mở; tài nguyên có đổi thứ tự, ngừng dùng, loại tài nguyên (thêm, đổi tên, xóa); không ghi nhật ký thao tác (BR-63). MH-42, MH-43, MH-46 đổi thành "Đã chốt".
- Lộ trình giai đoạn 3 đến 8 theo D-16.

### Xong khi

- [ ] `pnpm typecheck`, `pnpm build`, `prettier --check` qua.
- [ ] `/mock/app/la-sen/settings/branches`: bấm "Thêm chi nhánh", điền, gửi thì hiện lỗi `PLAN_LIMIT_REACHED` trong hộp. Ở `toc-may` thì thêm được, chi nhánh mới hiện ở danh sách và ở bộ lọc của Tài nguyên.
- [ ] Màn chi tiết không còn khối "Giá riêng"; ngày nghỉ cả tuần báo "Chọn ít nhất một ngày mở cửa."; ngày có 4 khung thì ẩn "Thêm khung".
- [ ] Màn Tài nguyên: "Lên", "Xuống" đổi thứ tự trong nhóm; "Ngừng dùng" đưa dòng sang bộ lọc "Đã ngừng dùng"; "Loại tài nguyên" xóa được loại trống, không xóa được loại có tài nguyên.
- [ ] Mỗi quy tắc BR-93.x của `features/branch-settings.md` có ít nhất một dòng AC.
- [ ] PR có mục "Tự quyết".

## S1. API chi nhánh và tài nguyên

Đầu việc:

- Migration: bảng `special_days` (U `(branch_id, date)`), `special_day_hours`, `resource_pauses` kèm `check`, RLS (ENABLE và FORCE) và khóa ngoại kèm `tenant_id` theo ERD mục 3, 4. Extension `btree_gist` (đã có cho `resource_bookings`) và ba exclusion constraint của ERD mục 10 cho `opening_hours`, `special_day_hours`, `resource_pauses`. Chỉ mục duy nhất theo `lower(name)`: chi nhánh đang dùng, loại, tài nguyên đang dùng theo chi nhánh. Cột `updated_at` cho `resource_types` nếu cần. Viết migration mới, không sửa migration cũ.
- Guard `TenantGuard` và decorator `@Roles(...)`, `@RequiresFeature(...)` theo `api/index.md`; hàm `entitlements(tenant, now)` của T-17 với `Clock`. Test thứ tự các bước của guard, kể cả slug không có và slug của cơ sở khác cùng trả 404.
- Domain (hàm thuần, thời gian từ `Clock`): kiểm khung giờ (4 khung, `opens` trước `closes`, không chồng, nối liền được, ít nhất một ngày mở), chuẩn hóa tên (khoảng trắng, so không phân biệt hoa thường), hàm kiểm đổi thứ tự (`ids` đúng bằng tập của nhóm), hàm phân loại khoảng tạm ngưng (đang diễn ra, chưa bắt đầu, đã kết thúc). Test thuộc tính cho khung giờ.
- Endpoint #1 đến #16 của `api/branch-settings.md` theo đúng thứ tự xử lý; dịch vụ ứng dụng khóa dòng `subscriptions` ở #2 và #5; vi phạm chỉ mục duy nhất hoặc exclusion constraint chuyển thành mã nghiệp vụ, không để lọt 500. Giới hạn theo phiên: 300 `GET`, 60 ghi mỗi phút.
- Mục "áp dụng khi có lịch hẹn" (AC-83, AC-84, AC-89, AC-100, các trường `requeued`, `moved`, `count`, `upcomingAppointments`): chưa có bảng lịch hẹn nên để trả 0 hoặc bỏ trường, ghi `TODO` kèm mã quy tắc; làm ở giai đoạn 3.
- Schema Zod (strict) và mã lỗi ở `packages/shared`.
- Scalar và dữ liệu mẫu theo mục "Thử trong Scalar" của `api/branch-settings.md`. Thêm cơ sở `la-sen` (gói `basic`, chủ `ha.le@lasen.vn`, chi nhánh "Lá Sen Quận 7") vào `scripts/seed.ts`, và loại tài nguyên, tài nguyên của `toc-may`, `la-sen` như mock; quản lý `hung@tocmay.vn` đã có.
- Xuất `openapi.json`, chạy `pnpm sync:openapi` ở `datn-docs`, thêm link "Tham chiếu" vào `api/branch-settings.md`.
- Test AC-57 đến AC-82, AC-85 đến AC-88, AC-90 đến AC-99, AC-101, AC-102. Các ca chạy đồng thời (AC-64, AC-70, AC-82, AC-93, AC-98) là integration test với Testcontainers, không mock DB; AC-75 chạy bằng role `app_user`.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration` qua.
- [ ] Scalar chạy được các ca trong mục "Thử trong Scalar" và cho đúng kết quả.
- [ ] Đăng nhập `ha.le@lasen.vn`, thêm chi nhánh: 403 `PLAN_LIMIT_REACHED`; đăng nhập `chinh@tocmay.vn`, thêm chi nhánh: 201, và `GET /v1/tenants/toc-may/branches` có hai dòng.
- [ ] Ghi thẳng hai khung giờ chồng nhau bằng SQL với role `app_user`: bị exclusion constraint chặn.
- [ ] PR có mục "Tự quyết".

## S2. Web chi nhánh và tài nguyên

Đầu việc:

- Ba trang theo `screens/branch-settings.md`: `/app/[slug]/settings/branches`, `.../branches/[id]`, `.../resources`. Chữ ở `apps/web/messages/*.json` (T-21); mã lỗi API xử lý theo các bảng "Xử lý".
- Mục menu Cài đặt của chủ cơ sở trỏ tới ba trang; vai trò khác không thấy mục và mở thẳng thì thấy trang 403 trong khung. Bộ chọn chi nhánh ở khung chỉ liệt kê chi nhánh đang dùng.
- Cột "Lịch 7 ngày tới", dải lịch ngoài giờ, danh sách lịch bị ảnh hưởng: chưa làm, để tới giai đoạn 3.
- e2e: thêm chi nhánh ở `toc-may` rồi chỉnh giờ nghỉ trưa và ngày Tết; thêm chi nhánh ở `la-sen` thấy lỗi gói; ngừng dùng chi nhánh cuối thấy lỗi; thêm loại, thêm tài nguyên, đảo thứ tự, tạm ngưng rồi mở lại, ngừng dùng; quản lý mở trang bị 403. axe cho ba trang, hai theme.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` qua.
- [ ] Đi hết ba trang ở 1440px và 390px, hai theme, hai ngôn ngữ.
- [ ] PR có mục "Tự quyết".

## Prompt S1

```
Làm trong datn-saas: git checkout main && git pull && git checkout -b feat/branch-settings-api.
Đọc CLAUDE.md, mục mới nhất trong datn-docs/sessions/progress/, rồi datn-docs/sessions/plans/branch-settings.md
(mục S1), features/branch-settings.md, api/branch-settings.md, api/index.md (mục "Quyền theo cơ sở
và vai trò"), architecture/erd.md mục 3, 4, 10, decisions t07 và t17.
Làm đúng các đầu việc S1 của kế hoạch. Lưu ý:
- Commit theo thứ tự: migration → TenantGuard (@Roles, @RequiresFeature, entitlements với Clock) kèm
  test → domain kèm test thuộc tính → endpoint chi nhánh → loại tài nguyên → tài nguyên và tạm ngưng →
  seed và Scalar.
- TenantGuard: trước khi bật luật "route có {slug} mà thiếu @Roles thì API không khởi động", liệt kê
  các route /v1/tenants/{slug}/... đang có. Có route nào không hợp luật này thì dừng lại hỏi mình.
- Lỗi do ràng buộc DB (chỉ mục duy nhất, exclusion, khóa ngoại) đổi sang mã nghiệp vụ ở repository,
  theo tên constraint, không theo câu báo lỗi. Có test cho từng ca chạy đồng thời.
- Tên đã chuẩn hóa (trim, gộp khoảng trắng) là tên được lưu, để chỉ mục lower(name) bắt được ca
  " tóc mây  quận 3 ".
- Các mục "áp dụng khi có lịch hẹn" trả 0 hoặc bỏ trường, ghi TODO kèm mã BR; không tạo bảng lịch hẹn.
- seed.ts: thêm la-sen và dữ liệu như mục "Thử trong Scalar"; dùng setTenant từ tenant-scope.ts.
- Xuất openapi.json, chạy pnpm sync:openapi ở datn-docs và thêm link "Tham chiếu" vào
  api/branch-settings.md. Mở PR docs riêng cho phần này.
Tài liệu là đặc tả; chỗ thiếu hoặc mâu thuẫn thì dừng lại hỏi mình, không tự đoán. Chạy pnpm lint,
pnpm typecheck, pnpm test, pnpm test:integration. Mở PR, ghi mục "Tự quyết", thêm mục tiến độ ở
datn-docs, không merge.
```

## Prompt S2

Viết sau khi review S0.
