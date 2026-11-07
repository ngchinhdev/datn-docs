---
title: Tiến độ
description: Nhật ký tiến độ theo tuần. Mỗi phiên làm việc kết thúc bằng một dòng ở đây.
---

**Quy ước:** mới nhất ở trên. Mỗi mục ghi: đã làm gì, vướng gì, việc tiếp theo. Cuối đồ án, trang này dùng làm phụ lục báo cáo.

## Tuần 1 (02/11 – 08/11/2026)

### 07/11/2026 (đêm): chốt khung ứng dụng, mẫu danh sách và mẫu form
- **Đã làm:**
  - Review lại PR #2 (Bước 7): đạt. Người dùng đã merge.
  - Sửa hover của nút chính trong Sapio: đậm hơn thay vì mờ đi, tương phản từ 6,3:1 trở lên.
  - Viết [Danh sách màn hình](../thiet-ke/man-hinh.md): 60 màn, chia 3 đợt. Chốt route [T-15](../ky-thuat/quyet-dinh-ky-thuat.md#t-15-route-của-web-tiếng-anh-slug-cơ-sở-trong-url) và quy tắc slug BR-72.
  - Thiết kế và chốt khung ứng dụng (MH-07), mẫu danh sách (MH-08), mẫu form (MH-09) trên canvas, 5 màn `QuanTri*`.
- **Theo góp ý của người dùng:**
  - Thanh bên thu gọn được. Ô đổi cơ sở trông như ô chọn.
  - Phân trang có số trang. Chân bảng kiểu Ant Design: "Hiển thị 1–20 trong 1.284 khách" bên trái; số trang rồi ô "20 / trang" bên phải.
  - Bảng cuộn trong khung, dòng tiêu đề cột và chân bảng đứng yên.
  - Trên điện thoại không cuộn ngang: bộ lọc nằm trong bảng trượt lên.
  - Thêm vào Sapio: AppShell, DataTable, FormSection, menu, tooltip, bảng trượt lên, ô chọn nhỏ.
- **Cách làm từ nay:** phiên claude.ai chỉ sửa trên canvas cho đến khi người dùng nói chốt, rồi mới cập nhật hệ thống thiết kế, chép vào repo, commit và push.
- **Tiếp theo:**
  - Claude Code làm [Bước 8](../ky-thuat/ke-hoach-ui-mock.md#bước-8-route-tiếng-anh-khung-ứng-dụng-mẫu-danh-sách-và-form).
  - Phiên claude.ai vẽ MH-02 Đăng ký cơ sở có chọn ngành.

### 07/11/2026 (khuya): sửa mock theo review PR #2
- **Đã làm:** Bước 7 (7a–7f) của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md#bước-7-sửa-theo-review-pr-2), mỗi mục một commit trên PR #2. ConfirmDialog, Toast (có Hoàn tác), Segmented; giờ trống theo buổi; cột trái sticky có danh sách thợ ở máy tính; OTP qua email (BR-16); "Thêm bé" và `?khach=moi` (BR-17); thu tiền, không đến, hủy lịch qua hộp hỏi, check-in có Hoàn tác (D-14); dữ liệu 02/11–08/11 cho hai cơ sở sinh bằng seed (`mock/fixtures/generate.ts`); nút sáng/tối, vai trò theo route, thanh chọn gọn trên điện thoại. Kiểm bằng Playwright và axe-core: 28 trang và bước, hai theme, 0 lỗi serious/critical; `pnpm build` xanh.
- **Vướng:** `.sp-btn--accent:hover { opacity: 0.9 }` trong Sapio hạ tương phản nút cam của Pawpaw xuống 3,94:1 khi rê chuột; cần sửa trong Design System (bản chép `app/sapio/` không sửa tại chỗ).
- **Tiếp theo:** review lại PR #2; sửa hover của nút nhấn trong Sapio; chốt hai màn hình với cô.

### 07/11/2026 (tối, sau đó): review PR #2 của mock
- **Đã làm:** review [PR #2 của datn-docs](https://github.com/ngchinhdev/datn-docs/pull/2): đọc code và xem bản deploy trên trình duyệt ở 390px, 1024px, 1280px, 1440px, hai theme, đi hết luồng của cả hai cơ sở. Bản này sát canvas, code sạch (không màu viết cứng, không `Date.now()`). Cần sửa: OTP ghi "tin nhắn" trái với roadmap; Pawpaw thiếu "Thêm bé" nên khách mới bị kẹt; trang khách trên máy tính không có danh sách thợ ở cột trái và nút Tiếp tục bị đẩy khỏi màn hình; thu tiền chạy ngay không hỏi; bộ chọn vai trò không theo trang; `<div>` trong `<button>`, lưới ARIA thiếu dòng. Người dùng góp thêm: hộp xác nhận cho thao tác quan trọng, dữ liệu đa dạng hơn một ngày, nút sáng/tối.
- **Chốt:** OTP gửi qua email, khách vẫn nhập số điện thoại ([D-13](./quyet-dinh.md#d-13-otp-của-khách-gửi-qua-email-không-qua-sms), BR-16, BR-17); ba mức xác nhận và giờ trống hiện theo buổi ([D-14](./quyet-dinh.md#d-14-mẫu-xác-nhận-thao-tác-và-cách-hiện-giờ-trống)). Sapio Design System thêm ConfirmDialog, Toast, Segmented và token `fill-selected`; bản sao trong `design/sapio/` và `app/sapio/` đã cập nhật.
- **Ghi chú cho ERD:** ghép đối tượng được phục vụ của khách mới với hồ sơ cũ sau khi xác thực OTP (trùng email, trùng tên bé) chưa có quy tắc; quyết định khi thiết kế bảng `served_subjects`.
- **Tiếp theo:** Claude Code làm [Bước 7 của kế hoạch](../ky-thuat/ke-hoach-ui-mock.md#bước-7-sửa-theo-review-pr-2) trên cùng nhánh; review lại rồi mới merge.

### 07/11/2026 (tối): code giao diện mock
- **Đã làm:** 6 bước của [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md) trên nhánh `feat/ui-mock`. Token Sapio và font Be Vietnam Pro cho cả `/docs` lẫn `/mock`; fixtures ngày 07/11 có đoạn chiếm dụng, `StaffProfile` hai lớp, `ServedSubject.kind` là `'self' | 'other'`; 11 component trong `components/sapio/` (ví dụ ở `/mock/components`); `/mock/dat-lich` cho hai cơ sở; `/mock/le-tan`, `/mock/le-tan/tai-nguyen`, `/mock/hom-nay`. Kiểm bằng Playwright headless: đi hết luồng khách chỉ bằng bàn phím ở 390px và 1280px; lịch lễ tân ở 1440px, 1024px, 390px không lỗi, không cuộn ngang.
- **Vướng:** `pnpm dev` (Turbopack) giữ bản cũ của module phía server khi file đổi export, gây lỗi `is not a function` và lỗi hydration; khởi động lại dev server là hết. Class trong `components.css` không nằm trong `@layer`, nên muốn utility Tailwind đè lên `.sp-btn` phải thêm `!`.
- **Tiếp theo:** review pull request; chốt hai màn hình với cô; ERD giai đoạn 1.

### 07/11/2026 (chiều): bàn giao giao diện cho Claude Code
- **Đã làm:** chốt UI hai màn hình đầu (D-12; BR-14, BR-15). Chép Design System và các màn hình đã vẽ vào `design/` để Claude Code đọc offline. Viết [Kế hoạch code giao diện mock](../ky-thuat/ke-hoach-ui-mock.md) 6 bước.
- **Cách làm từ đây:** phiên claude.ai lo phân tích, thiết kế, review; Claude Code trên máy code theo kế hoạch trên nhánh `feat/ui-mock`, mở pull request để review.
- **Tiếp theo:** Claude Code làm kế hoạch UI mock; giai đoạn 0 còn: dùng thử SimplyBook.me và một phần mềm Việt Nam, sửa đề cương nếu cô góp ý.

### 07/11/2026 (trưa): tên sản phẩm và hệ thống thiết kế
- **Đã làm:** chốt tên **Sapio** và hướng thiết kế "ấm và chính xác" ([D-11](./quyet-dinh.md#d-11-tên-sản-phẩm-sapio-và-hệ-thống-thiết-kế)). Dựng "Sapio Design System" trên Claude Design: tokens sáng/tối (đã kiểm tương phản), font Be Vietnam Pro, màu trạng thái, màu hai cơ sở, 8 component có preview. Docs chạy cổng 3100 để không trùng web 3000. Phiên claude.ai đã liên kết với máy (thư mục `D:\UITProgress\DoAn\source`).
- **Sau đó:** làm mềm Design System (bỏ viền đậm, nền `fill-tonal`, bóng mềm, góc tròn hơn), đổi màu Pawpaw sang cam quýt. Vẽ canvas "Sapio · Màn hình đầu tiên": 3 hướng trang khách, 2 hướng lịch lễ tân, cùng bản máy tính, iPad, điện thoại; chốt hướng ([D-12](./quyet-dinh.md#d-12-hướng-giao-diện-hai-màn-hình-đầu)).
- **Tiếp theo:** đưa token Sapio vào `datn-docs` và `apps/web` (thay theme shadcn mặc định); code luồng đặt lịch của khách (A) và lịch lễ tân (A) vào `/mock` theo canvas; tách màn "Trang đặt lịch của khách" thành "Trang cơ sở" và "Luồng đặt lịch".

### 07/11/2026: review Phần B
- **Đã làm:** review app docs + mock. CI (thêm qua [PR #1 của datn-docs](https://github.com/ngchinhdev/datn-docs/pull/1)) xanh: Prettier, typecheck, build 16 trang (`/docs` tĩnh, `/mock` động, `/api/search`), lockfile 584 gói qua kiểm tra chuỗi cung ứng của pnpm. Không gói nào nằm trong danh sách bị chiếm quyền (Shai-Hulud, `keyv`/`cacheable`, `chalk`/`debug`, các gói độc tháng 10–11/2026). `pnpm audit`: 0 high/critical; 1 moderate (`minimatch`) + 1 low (`deepmerge`), cùng hai lỗ hổng đã biết từ `datn-saas`, đến từ CLI `shadcn`, không chạy khi xem trang.
- **Ghi chú cho ERD (giai đoạn 1):** `ServedSubject.kind` trong fixtures là `'self' | 'pet'`, tức là từ khóa ngành nằm trong kiểu dữ liệu. Khi thiết kế bảng thật, loại đối tượng được phục vụ nên do `industryTemplate` khai báo (dữ liệu), lõi chỉ phân biệt "chính khách hàng" hay "đối tượng khác" (quy tắc 5).
- **B3 xong:** deploy lên Vercel tại https://datn-docs.vercel.app (Hobby, biến môi trường `ENABLE_EXPERIMENTAL_COREPACK=1` để Vercel dùng pnpm 11 theo `packageManager`, Node 24). `/`, `/docs` (đủ 11 trang) và `/mock` mở được. PR #1 (CI) đã merge. Phần B của kế hoạch dựng base hoàn tất.
- **Tiếp theo:** giai đoạn 0 còn lại: dùng thử SimplyBook.me và một phần mềm Việt Nam, sửa đề cương nếu cô góp ý. Sau đó giai đoạn 1: ERD và hai màn hình mock đầu tiên (trang đặt lịch của khách, lịch lễ tân).

### 05/11/2026 (tối): app docs + mock `datn-docs`
- **Đã làm:** Phần B, bước B1 và B2 của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md). B1: Next.js 16.4.5 + Fumadocs 16.17 (cài thủ công, API `fumadocs-mdx/macro`), tài liệu ở `/docs`, tìm kiếm tiếng Việt chạy được, đọc thẳng file `.md`; pnpm 11.28.11 với `minimumReleaseAge` và `allowBuilds` giống `datn-saas` (`esbuild: false`). Link tải đề cương `.docx` ở trang Đề cương. B2: shadcn `base-nova` cùng `components.json` với `apps/web`, Fumadocs dùng preset `shadcn.css` nên tài liệu và mock chung một theme; `/mock` có bộ chọn tenant và vai trò trên query string (`/mock?tenant=pawpaw&role=receptionist`), danh sách 4 màn hình của roadmap, fixtures cho Salon Tóc Mây và Spa thú cưng Pawpaw.
- **Phát hiện:** Fumadocs chỉ đổi link sang URL khi link trỏ tới file có đuôi `.md`; link không đuôi làm gãy các link ở trang `/docs`. Đã đổi mọi link tương đối sang dạng `./trang.md` và ghi quy ước vào `CLAUDE.md`. Mục lục roadmap có một anchor sai (`#7-quy-tắc-nghiệp-vụ-ban-đầu`), đã sửa. `minimumReleaseAge` chặn bản Fumadocs vừa ra trong ngày, pnpm tự chọn bản trước đó.
- **Ghi chú cho sau:** fixtures dùng ID dễ đọc (`may-mai`) thay cho UUIDv7 để dễ đối chiếu. Trạng thái lịch hẹn trong fixtures (`confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`) là giả định, cần chốt khi thiết kế ERD. `assets/de-cuong-chi-tiet.docx` và `public/files/` là hai bản, sửa đề cương thì cập nhật cả hai.
- **Tiếp theo:** B3 (kết nối Vercel, kiểm `/docs` và `/mock` trên link deploy); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 05/11/2026: review base `datn-saas`
- **Đã làm:** review toàn bộ base. CI trên GitHub của `main` xanh (03/11), nên A7 xong. Mở [PR #1](https://github.com/ngchinhdev/datn-saas/pull/1), CI xanh đủ các bước: bật `erasableSyntaxOnly` cho `shared` và `scheduling-core`; thêm `createPool()` có `pool.on('error')` để API không chết khi Postgres khởi động lại (có unit test); `CLAUDE.md` nhắc đọc `apps/web/AGENTS.md` và commit nhỏ.
- **Ghi chú cho sau:** (1) khi thiết kế thuật toán giờ trống (BT1), chốt lõi tính trên mốc thời gian tuyệt đối, chỉ đổi sang giờ địa phương ở rìa (hiện `Interval` là phút từ đầu ngày địa phương); (2) khi làm xác thực, kiểm tra chống CSRF của Nest với request POST từ server Next (không có header `Origin`); (3) oxlint còn nhiều cảnh báo nhiễu `react-in-jsx-scope`, có thể tắt rule này.
- **Bổ sung:** PR #1 gộp còn một commit, thêm sửa lint (tắt `react-in-jsx-scope`, cho phép import CSS). CI xanh, 0 cảnh báo.
- **Kiểm tra bảo mật dependency (828 gói trong lockfile):** không gói nào nằm trong danh sách bị chiếm quyền của các đợt Shai-Hulud (gồm đợt `keyv`/`cacheable` tháng 8/2026, 446 gói) hay đợt `chalk`/`debug` 9/2025. `pnpm audit`: 0 high/critical; 3 moderate + 1 low (`glob`, `minimatch`, `deepmerge`), đều nằm trong công cụ dev (Testcontainers, Nest CLI, shadcn CLI), không chạy ở production, chờ bản vá upstream. Gói có script cài đặt: `@scarf/scarf` (thống kê lượt cài của swagger-ui), `ssh2`, `cpu-features`, `protobufjs` (đều qua Testcontainers); đều là gói thật.
- **pnpm 11:** [PR #2](https://github.com/ngchinhdev/datn-saas/pull/2) nâng pnpm 9.15 lên 11.28.11, đặt `minimumReleaseAge` và `allowBuilds` ([T-02](../ky-thuat/quyet-dinh-ky-thuat.md#t-02-monorepo-pnpm-workspaces--catalog-turborepo)). CI xanh, lockfile cũ dùng được nguyên, qua kiểm tra chuỗi cung ứng của pnpm.
- **Tiếp theo:** merge PR #1 và PR #2; trên máy chạy `pnpm install` (Corepack tự tải pnpm 11); xóa nhánh `claude/audit-tmp` trên GitHub; Phần B (app docs + mock); giai đoạn 0: dùng thử SimplyBook.me và một phần mềm Việt Nam.

### 03/11/2026 (tối): dựng base `datn-saas`
- **Đã làm:** Phần A của [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md), bước A1 đến A6 và A8: monorepo pnpm + Turborepo; Docker Compose (Postgres 18, Redis 8, Mailpit); `shared` (BR-61 `normalizePhone`); `scheduling-core` (phép toán khoảng, property test, coverage 100%); API NestJS 12 (config Zod, Drizzle 1.0.0-rc.5, `withTenant`, migration `btree_gist` và grant, Problem Details, Swagger, `/v1/health`); web Next.js 16.4 (shadcn, TanStack Query, trang `/` hiển thị health); script chặn từ khóa ngành; workflow CI. Mọi bước CI chạy xanh trên máy.
- **Phát hiện:** spike RLS cho thấy policy phải dùng `nullif(current_setting(...), '')` ([T-07](../ky-thuat/quyet-dinh-ky-thuat.md#t-07-cô-lập-dữ-liệu-rls-hai-lớp)); 20 transaction đồng thời chỉ 1 giữ được chỗ (bằng chứng sớm cho BT2). Chốt Node 24 thay cho 26 ([T-01](../ky-thuat/quyet-dinh-ky-thuat.md#t-01-runtime-nodejs-24-lts)), TypeScript 6.0, pnpm 9.15.
- **Vướng:** máy dev có sẵn PostgreSQL Windows chiếm cổng 5432; compose cho đổi cổng bằng `POSTGRES_PORT`.
- **Tiếp theo:** đẩy `datn-saas` lên GitHub và kiểm tra CI xanh (A7); Phần B (app docs + mock).

### 03/11/2026
- **Đã làm:** gửi đề cương cho cô Thùy Trâm. Tạo 2 repo `ngchinhdev/datn-docs` và `ngchinhdev/datn-saas`. Đưa đề cương, roadmap, nhật ký quyết định, quy tắc nghiệp vụ, thuật ngữ vào `datn-docs`. Nghiên cứu phiên bản và pattern hiện hành của Next.js, NestJS, Drizzle, Node.js; viết [Quyết định kỹ thuật](../ky-thuat/quyet-dinh-ky-thuat.md), [Chiến lược kiểm thử](../ky-thuat/chien-luoc-kiem-thu.md), [Kế hoạch dựng base source](../ky-thuat/ke-hoach-dung-base.md).
- **Phát hiện:** payOS không có môi trường test → đổi sang provider giả lập ([D-09](./quyet-dinh.md#d-09-thanh-toán-payos-không-có-môi-trường-test)).
- **Tiếp theo:** dựng base source trên máy bằng Claude Code theo kế hoạch; song song dùng thử SimplyBook.me và một phần mềm Việt Nam (giai đoạn 0).

## Trước khi bắt đầu (26/10 – 02/11/2026)

- Khảo sát nhiều hướng đề tài (giáo dục, thuế, nhà trọ, HSK, hệ thống thi...), chốt đề tài đặt lịch đa tài nguyên ([D-01](./quyet-dinh.md#d-01-đề-tài-nền-tảng-đặt-lịch-đa-tài-nguyên-cho-cơ-sở-dịch-vụ-theo-lịch-hẹn)).
- Cắt phạm vi, viết roadmap 34 tuần, đề cương theo mẫu UIT.
