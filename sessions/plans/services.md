# Kế hoạch: dịch vụ

Đặc tả chính thức:

- Nghiệp vụ và tiêu chí chấp nhận: `content/docs/features/services.md` (BR-94.1 đến BR-94.32, AC-103 đến AC-156)
- API: `content/docs/api/index.md` (mục "Quyền theo cơ sở và vai trò"), `content/docs/api/services.md`
- Màn hình: `content/docs/screens/services.md` (MH-44, MH-45)
- Bảng: `content/docs/architecture/erd.md` mục 5 và mục 10
- Thuật toán: `content/docs/architecture/availability-algorithm.md`
- Quyết định: T-07, T-17, D-16

Kế hoạch này chỉ chia việc. Trang nào ở trên nói khác kế hoạch thì làm theo trang đó, và báo lại.

## Chia PR

| Bước | Repo, nhánh | Nội dung |
|---|---|---|
| S0 | `datn-docs`, `docs/services` | Đặc tả, sửa ERD và mock hai màn |
| S1 | `datn-saas`, `feat/services-api` | Bảng mới, ràng buộc, 13 endpoint, dữ liệu mẫu, test |
| S2 | `datn-saas`, `feat/services-web` | Hai trang Cài đặt, e2e, axe |

## S0. Đặc tả và mock

- Viết `features/services.md`, `api/services.md`, `screens/services.md`; sửa `erd.md` (bỏ `commission_split` và câu hỏi mở số 4, ràng buộc duy nhất theo tên, `sort` theo nhóm, kiểm dãy đoạn), `business-rules.md` (BR-94, BR-50, BR-55), `screens/index.md` (MH-44, MH-45), `api/index.md`, thuật ngữ; `availability-algorithm.md` theo luật đoạn mới; ghi giới hạn của MH-43.
- Mock hai màn khớp đặc tả: hộp "Thêm dịch vụ", nhóm dịch vụ (thêm, đổi tên, xóa, Lên/Xuống), ngừng dùng và dùng lại, Lên/Xuống dịch vụ trong nhóm, kiểm đoạn theo BR-94.22 đến 94.27, giới hạn ký tự, giá 0 đến 100.000.000 bội của 1.000, giá riêng chi nhánh, cảnh báo chi nhánh thiếu loại tài nguyên. MH-44, MH-45 đổi thành "Đã chốt".

### Xong khi

- [ ] `pnpm typecheck`, `pnpm build`, `prettier --check` qua.
- [ ] `/mock/app/toc-may/settings/services`: "Thêm dịch vụ", điền, gửi thì mở trang chi tiết của dịch vụ mới, dịch vụ đó chưa nhận đặt online. "Nhóm dịch vụ": thêm, đổi tên, đổi thứ tự, xóa nhóm trống; nhóm còn dịch vụ đang dùng khóa nút "Xóa".
- [ ] Danh sách: "Lên", "Xuống" đổi thứ tự trong nhóm; "Ngừng dùng" đưa dòng sang bộ lọc "Đã ngừng dùng", "Dùng lại" đưa về; công tắc "Nhận đặt online" đổi ngay.
- [ ] `/mock/app/toc-may/settings/services/may-dye`: đặt Chờ ở cuối, hoặc Chuẩn bị không có Làm ngay sau, thì báo lỗi dưới dòng đó và khóa "Lưu"; giá 150.500 báo lỗi, giá 0 hợp lệ.
- [ ] Thêm chi nhánh ở `/mock/app/toc-may/settings/branches`: trang chi tiết dịch vụ hiện khối "Giá riêng chi nhánh" và cảnh báo "Chi nhánh X không có Y, biến thể Z không đặt được ở đó"; lưu vẫn được.
- [ ] Mỗi quy tắc BR-94.x của `features/services.md` có ít nhất một dòng AC.
- [ ] PR có mục "Tự quyết".

## S1. API dịch vụ

Đầu việc:

- Migration: bảng `service_groups`, `services`, `service_variants`, `service_segments`, `segment_resource_types`, `variant_cleanups`, `service_prices` (chưa có trong `datn-saas`), kèm `check`, RLS (ENABLE và FORCE) và khóa ngoại kèm `tenant_id` theo ERD mục 5. Chỉ mục duy nhất theo `lower(name)`: nhóm, dịch vụ đang dùng, biến thể đang dùng theo dịch vụ. Constraint trigger hoãn cho dãy đoạn và loại tài nguyên của đoạn theo ERD mục 10. Viết migration mới, không sửa migration cũ.
- Endpoint #9 của Chi nhánh và tài nguyên (xóa loại tài nguyên): thêm kiểm `segment_resource_types` và `variant_cleanups`, trả `RESOURCE_TYPE_IN_USE` (BR-94.32, AC-155, AC-89).
- Domain (hàm thuần): chuẩn hóa tên, kiểm dãy đoạn (BR-94.22 đến 94.27, kể cả phần khách thấy), kiểm dọn dẹp, kiểm luật giá, phân loại thay đổi biến thể (giữ, mới, ẩn), `priceAt(variant, branch)`, hàm kiểm đổi thứ tự (`ids` đúng bằng tập). Test thuộc tính cho kiểm dãy đoạn: sinh dãy ngẫu nhiên, đối chiếu với một bản kiểm viết thẳng từng luật.
- Endpoint #1 đến #13 của `api/services.md` theo đúng thứ tự xử lý; `PUT /services/order` khai báo trước `PUT /services/{serviceId}`. Khóa dòng dịch vụ ở #9; khóa dòng nhóm ở #4 và #5; vi phạm chỉ mục duy nhất, khóa ngoại hoặc trigger chuyển thành mã nghiệp vụ theo tên constraint, không để lọt 500. Giới hạn theo phiên dùng chung với nhóm Chi nhánh và tài nguyên.
- Mục "áp dụng khi có lịch hẹn" (`upcomingAppointments`, AC-154): trả 0 hoặc bỏ trường, ghi `TODO` kèm mã quy tắc; làm ở giai đoạn 3. `deposit_vnd` có cột, không trả, không nhận.
- Schema Zod (strict) và mã lỗi ở `packages/shared`; kiểm dãy đoạn dùng chung với web.
- Scalar và dữ liệu mẫu theo mục "Thử trong Scalar" của `api/services.md`: dịch vụ của `toc-may` và `la-sen` theo `mock/fixtures`, dùng loại tài nguyên mà seed chi nhánh đã có; thêm vào `scripts/seed.ts` với id cố định.
- Xuất `openapi.json`, chạy `pnpm sync:openapi` ở `datn-docs`, thêm link "Tham chiếu" vào `api/services.md`.
- Test AC-103 đến AC-153 và AC-155, AC-156. Các ca chạy đồng thời (AC-111, AC-116, AC-122, AC-132) là integration test với Testcontainers, không mock DB; AC-151 là unit test.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration` qua.
- [ ] Scalar chạy được các ca trong mục "Thử trong Scalar" và cho đúng kết quả.
- [ ] Đăng nhập `chinh@tocmay.vn`, `GET /v1/tenants/toc-may/services` có ba dịch vụ; đăng nhập `hung@tocmay.vn`, cùng lời gọi: 403.
- [ ] Ghi thẳng một biến thể có đoạn Chờ ở cuối bằng SQL với role `app_user`: bị constraint trigger chặn lúc commit.
- [ ] PR có mục "Tự quyết".

## S2. Web dịch vụ

Đầu việc:

- Hai trang theo `screens/services.md`: `/app/[slug]/settings/services`, `.../services/[id]`. Chữ ở `apps/web/messages/*.json` (T-21); mã lỗi API xử lý theo các bảng "Xử lý".
- Mục menu Cài đặt của chủ cơ sở trỏ tới hai trang; vai trò khác không thấy mục và mở thẳng thì thấy trang 403 trong khung.
- Chưa làm: giá theo cấp, "Ai làm được", cột "Người làm được", "Đặt cọc khi đặt online", "Xem như khách", số lịch đã đặt giữ thời gian và giá cũ. Không hiện chỗ trống.
- Việc nhỏ còn lại từ review S2 của chi nhánh, làm cùng bước này:
  - Chữ viết tắt trên avatar cơ sở: đang là "S" cho mọi cơ sở; lấy `monogram` của cơ sở.
  - Tắt "Thêm khung" ở MH-43 khi khung cuối của ngày đóng từ 23:00, vì không còn chỗ cho khung sau.
  - MH-46 ở 390px: bỏ nút quay lại trùng với breadcrumb.
  - Dòng phụ của thẻ tài nguyên ở MH-46 không xuống hàng sau dấu "·".
  - Thanh tab dưới không che nội dung cuối trang; chừa chỗ ở cuối nội dung.
- e2e: thêm nhóm, đổi thứ tự nhóm, xóa nhóm trống; thêm dịch vụ qua hộp rồi mở trang chi tiết; sửa biến thể, đoạn (lỗi dãy đoạn hiện đúng dòng), dọn dẹp, lưu; thêm chi nhánh rồi đặt giá riêng và thấy cảnh báo thiếu tài nguyên; ngừng dùng rồi dùng lại; Lên/Xuống dịch vụ; quản lý mở trang bị 403. axe cho hai trang và hộp, bảng bên, hai theme.

### Xong khi

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` qua.
- [ ] Đi hết hai trang ở 1440px và 390px, hai theme, hai ngôn ngữ.
- [ ] Năm việc nhỏ ở trên xong.
- [ ] PR có mục "Tự quyết".

## Prompt S1

```
Làm trong datn-saas: git checkout main && git pull && git checkout -b feat/services-api.
Repo datn-docs: git checkout main && git pull (PR #30 đã merge).

Đọc: datn-docs/CLAUDE.md, datn-saas/CLAUDE.md, mục mới nhất của sessions/progress/,
sessions/plans/services.md (mục S1 là danh sách việc), features/services.md, api/services.md,
erd.md mục 5 và 10, api/branch-settings.md #9, features/branch-settings.md (BR-93.19, AC-89).
Làm theo khuôn đã có của branch-settings: apps/api/src/branch-settings/* (controller → service →
domain + repository), database/constraint-violation.ts, tenant-scope.ts, openapi/examples/*,
test/support/{branch-world,tenant-client,test-app,fake-clock}.ts, packages/shared/src/branch-settings.ts,
hai migration 20261128071539/071551 (bảng trước, ràng buộc/RLS/trigger sau).

Việc:
1. Migration mới (không sửa migration cũ): service_groups, services, service_variants, service_segments,
   segment_resource_types, variant_cleanups, service_prices theo ERD mục 5. Mọi bảng có tenant_id,
   RLS ENABLE + FORCE, khóa ngoại kép (tenant_id, id). Chỉ mục duy nhất theo lower(name): nhóm; dịch
   vụ với archived_at is null; biến thể theo service_id với archived_at is null. service_prices U
   (variant_id, branch_id, level) nulls not distinct. Các check theo ERD (giá 0..100000000 bội 1000,
   phút đoạn 5..480 bội 5, position 1..8, dọn dẹp 5..120 bội 5). Constraint trigger DEFERRABLE INITIALLY
   DEFERRED kiểm cả dãy đoạn của biến thể lúc commit: BR-94.22 đến 94.27 (kể cả phần khách thấy ≤ 480)
   và luật loại tài nguyên của BR-94.26; dọn dẹp không phải loại is_staff. Tên constraint, trigger rõ
   ràng để constraint-violation.ts dịch sang mã nghiệp vụ; trigger raise với mã/constraint name để
   chuyển thành 400 VALIDATION_FAILED, không lọt 500. Trigger bỏ qua biến thể đã archived.
2. Tìm không phân biệt dấu (BR-94.15, AC-118 "q=nhuom"): đề xuất cách trong PR (extension unaccent
   bọc trong hàm immutable, hoặc cột tên đã bỏ dấu sinh ở ứng dụng). Chọn cách nhẹ hơn, ghi "Tự quyết";
   không thêm thư viện mới. Đ thường thì chuẩn hóa cả "đ" → "d".
3. packages/shared/src/services.ts: schema Zod strict cho mọi body/response của 13 endpoint, giới hạn
   (LIMITS) và hàm kiểm dãy đoạn thuần dùng chung với web (trả lỗi theo đường dẫn field như
   variants.{i}.segments.{j}.kind). Mã lỗi mới thêm vào errors.ts.
4. apps/api/src/services/: module, controller, service, repository, domain (chuẩn hóa tên, kiểm đoạn,
   kiểm dọn dẹp, phân loại biến thể giữ/mới/ẩn, priceAt(variant, branch), kiểm order). Endpoint #1–#13
   đúng thứ tự xử lý của api/services.md; PUT /services/order khai trước /services/{serviceId}.
   @Roles('owner') cho mọi endpoint, guard gói/khóa như branch-settings. #9 khóa dòng dịch vụ
   (SELECT … FOR UPDATE) trong withTenant; #4, #5 khóa nhóm; đổi nhóm của dịch vụ khóa nhóm đích để
   AC-116 đúng. Giới hạn theo phiên dùng chung với branch-settings.
5. Sửa endpoint #9 của branch-settings (xóa loại tài nguyên): còn segment_resource_types hoặc
   variant_cleanups chiếm (kể cả biến thể ẩn, dịch vụ ngừng dùng) thì 409 RESOURCE_TYPE_IN_USE (AC-89,
   AC-155). Trả kèm tên một dịch vụ để giao diện hiện "Dịch vụ {tên} đang dùng loại này." nếu api
   doc đã có trường đó; không có thì không thêm.
6. upcomingAppointments luôn 0, ghi TODO(BR-94.31). deposit_vnd có cột, không nhận, không trả.
7. Seed (scripts/seed.ts, id cố định): nhóm và dịch vụ của toc-may và la-sen theo
   datn-docs/mock/fixtures/{salon,la-sen}-services.ts, dùng loại tài nguyên mà seed chi nhánh đã có;
   bỏ phần giá theo cấp và người làm. Ví dụ OpenAPI ở openapi/examples/services.ts và các ca
   "Thử trong Scalar" của api/services.md chạy đúng trên seed.
8. Test: AC-103 đến AC-153, AC-155, AC-156; tên test bắt đầu bằng mã BR. Đồng thời (AC-111, 116, 122,
   132) là integration với Testcontainers, không mock DB. Unit cho domain (AC-151, kiểm dãy đoạn) có
   test thuộc tính fast-check: sinh dãy ngẫu nhiên, đối chiếu với bản kiểm viết thẳng từng luật;
   đối chiếu luôn cả trigger DB với hàm shared trên một mẫu dãy (một int-spec). Test ghi thẳng SQL bằng
   app_user một biến thể có Chờ ở cuối: bị chặn lúc commit. RLS: id của la-sen trả 404.

Xong datn-saas: pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration qua. Mở PR
feat/services-api, mục "Tự quyết", không merge.

Sau đó trong datn-docs, nhánh docs/services-s1: pnpm sync:openapi với openapi.json mới; thêm link
"Tham chiếu" vào api/services.md như api/branch-settings.md; ghi prompt này vào mục "Prompt S1" của
sessions/plans/services.md; chỗ code buộc phải khác đặc tả thì sửa đặc tả và ghi lý do trong PR; thêm
mục tiến độ. Chạy pnpm build, prettier --check. Mở PR, không merge.
Chỗ đặc tả mâu thuẫn hoặc không làm được thì dừng lại hỏi mình.
```

## Prompt S2

```

```
