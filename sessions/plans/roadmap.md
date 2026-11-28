# Lộ trình và kế hoạch làm việc

Phần làm việc tách từ roadmap cũ: lộ trình, khảo sát, rủi ro, câu hỏi hội đồng.

## 7. Quy tắc nghiệp vụ

Bảng quy tắc nghiệp vụ (BR-xx) là tài liệu sống, nằm ở trang [Quy tắc nghiệp vụ](../../content/docs/features/business-rules.md). Mỗi BR có test tương ứng; tên test bắt đầu bằng mã BR.

---

## 9. Tech stack

Tóm tắt; lý do, phiên bản và nguồn xem [Quyết định kỹ thuật](../../content/docs/decisions/index.md).

| Lớp | Công nghệ |
|---|---|
| Runtime, monorepo | Node.js 24 LTS, pnpm 11 workspaces (catalog), Turborepo |
| Frontend | Next.js 16.4 (App Router, Cache Components), React 19.3, Tailwind CSS 4, shadcn/ui, TanStack Query |
| Lịch lễ tân | Tự dựng timeline theo tài nguyên (CSS grid + dnd-kit); FullCalendar resource timeline là gói trả phí |
| Backend | NestJS 12 (ESM, Express), validation bằng Zod 4 qua Standard Schema, OpenAPI |
| Database | PostgreSQL 18, Drizzle ORM v1 (RC, ghim phiên bản), exclusion constraint, RLS |
| Hàng đợi, realtime | Redis, BullMQ, Socket.IO |
| Xác thực | Tự xây: session token trong cookie httpOnly, argon2id; OTP email cho khách |
| Thanh toán | `PaymentProvider` + `MockPaymentProvider` (webhook ký HMAC); provider thật tùy chọn (D-09) |
| Email, AI | Nodemailer + Mailpit; Claude API (tool use) cho chatbot |
| Kiểm thử | Vitest, fast-check, Testcontainers, Supertest, Testing Library, MSW, Playwright (+ axe), k6 |
| Lint, format | oxlint, Prettier, TypeScript strict |
| Triển khai | Docker Compose; web trên Vercel, api + Postgres + Redis trên VPS hoặc Railway |

---

## 10. Lộ trình 34 tuần

> Mỗi giai đoạn có **đầu ra** và **tiêu chí hoàn thành**. Không chuyển giai đoạn khi chưa đạt tiêu chí, trừ khi đã cắt phạm vi có chủ đích.

### Giai đoạn 0 — Chốt đề tài và khảo sát (Tuần 1–2: 02/11 – 15/11/2026)

- [x] Viết đề cương theo mẫu UIT, gửi giảng viên hướng dẫn (03/11)
- [ ] Sửa đề cương theo góp ý của cô (nếu có)
- [ ] **Tự dùng thử** SimplyBook.me và ít nhất một phần mềm Việt Nam (MySpa, NanoSpa hoặc SalonHero); chụp màn hình, ghi lại họ làm gì, thiếu gì
- [ ] Đọc tài liệu processing time của Mangomint, related resources của SimplyBook.me (nguồn cho chương 2)
- [ ] Đọc 50–100 đánh giá 1–3 sao của các đối thủ trên App Store, Google Play, Capterra; tổng hợp nỗi đau (mục 12)
- [ ] Đăng Google Form vào nhóm Facebook chủ salon, spa, nail, pet shop
- [x] Tạo 2 repo `datn-saas`, `datn-docs`; đưa đề cương, roadmap, quyết định vào `datn-docs` (03/11)
- [x] Dựng base source `datn-saas` theo [Kế hoạch dựng base source](./base-setup.md), Phần A (03/11, review 05/11)
- [x] Dựng app docs + mock `datn-docs` theo [Kế hoạch dựng base source](./base-setup.md), Phần B (05/11, deploy 07/11: https://datn-docs.vercel.app)

**Đầu ra:** đề cương được duyệt, bảng so sánh đối thủ có bằng chứng, tổng hợp đánh giá, repo chạy được.

### Giai đoạn 1 — Phân tích và thiết kế (Tuần 3–5: 16/11 – 06/12)

- [ ] Use case theo 6 vai trò; đặc tả các luồng chính
- [ ] Hoàn thiện danh sách BR (mục 7)
- [ ] ERD đầy đủ; sơ đồ trạng thái; sequence cho: đặt lịch online có cọc, webhook thanh toán, hoàn thành lịch → outbox. Bản 1 của ERD và bảng trạng thái: 08/11, [ERD](../../content/docs/architecture/erd.md); còn sequence
- [ ] Mock UI và prototype click được: trang đặt lịch của khách (Salon Tóc Mây và Spa Lá Sen), lịch lễ tân, cấu hình dịch vụ, thu tiền
- [x] Thiết kế thuật toán tính giờ trống bằng mã giả, kèm 10 ví dụ tính tay (có ví dụ Spa Lá Sen) (08/11, [trang thuật toán](../../content/docs/architecture/availability-algorithm.md))

**Tiêu chí:** đi hết luồng đặt lịch → thanh toán → hoàn thành trên prototype; mọi BR có chỗ đứng trong ERD.

### Giai đoạn 2 — Nền tảng (Tuần 6–8: 07/12 – 27/12)

- [x] Đăng ký khách thuê, xác thực email, slug (MH-02; 28/11, [kế hoạch](./signup.md))
- [x] Đăng nhập bằng session token trong cookie httpOnly ([T-08](../../content/docs/decisions/t08-staff-session-cookie.md)), `memberships`, chọn cơ sở (24/11 đến 26/11, A1 đến A4 của [kế hoạch](./auth.md))
- [ ] Guard theo (tenant, role)
- [ ] **RLS** trên mọi bảng nghiệp vụ + bộ test truy cập chéo tenant (BT6)
- [ ] CRUD chi nhánh, giờ mở cửa, ngày đặc biệt, loại tài nguyên, tài nguyên, dịch vụ (biến thể, đoạn, yêu cầu tài nguyên), nhân sự, kỹ năng, ca làm
- [ ] Nhật ký thao tác nhạy cảm

**Tiêu chí:** một tenant salon tóc (Tóc Mây) và một tenant spa (Spa Lá Sen) seed chạy song song; test cô lập xanh 100%.

### Giai đoạn 3 — Lõi đặt lịch (Tuần 9–14: 28/12/2026 – 07/02/2027)

- [ ] Thuật toán tính giờ trống (BT1) viết theo TDD; thuật toán vét cạn làm đối chứng; property-based test
- [ ] `resource_bookings` + exclusion constraint + giữ chỗ 10 phút + job dọn (BT2); test 100 request đồng thời
- [ ] Trang đặt lịch công khai: chọn chi nhánh, đối tượng (nếu ngành yêu cầu), dịch vụ, nhân viên/"bất kỳ ai", giờ; OTP qua email
- [ ] Phân công "bất kỳ ai" theo quy tắc cấu hình
- [ ] Chuỗi dịch vụ nối tiếp; đặt theo nhóm (nhiều người hoặc nhiều thú cưng)
- [ ] Lịch lễ tân realtime: xem theo nhân viên/tài nguyên, kéo thả có kiểm tra ràng buộc, khách vãng lai, check-in
- [ ] Đổi/hủy theo chính sách; đánh dấu không đến; nghỉ phép kèm xử lý lịch bị ảnh hưởng

**Tiêu chí:** demo được cảnh 100 người bấm cùng một giờ; property test 10.000 kịch bản không lỗi, chạy với dịch vụ của cả hai ngành.

### Đệm Tết Nguyên Đán (Tuần 15–16: 08/02 – 21/02/2027)

- [ ] Nghỉ Tết; nếu còn sức: sửa lỗi tồn đọng, viết nháp chương 1–2

### Giai đoạn 4 — Tiền: thanh toán, ví, gói (Tuần 17–20: 22/02 – 21/03)

- [ ] Hóa đơn tự tạo khi hoàn thành (outbox + BullMQ)
- [ ] Đặt cọc; QR + webhook idempotent (BT3); xử lý thanh toán sau khi giữ chỗ hết hạn
- [ ] Chính sách hoàn cọc; hoàn tiền có lý do và phê duyệt
- [ ] Sổ cái chỉ ghi thêm (BT4); ví tiền thật/tiền tặng; nạp ví
- [ ] Gói liệu trình: bán, trừ buổi, ghi doanh thu thực hiện, hết hạn, hoàn gói
- [ ] Thanh toán kết hợp nhiều phương thức
- [ ] Gói Sapio: dùng thử 7 ngày, hai gói, kích hoạt và gia hạn bằng QR giả lập, nâng gói tính phần chênh, hạ gói kỳ sau, hết hạn chỉ còn trang gói (D-15, T-17, BR-80 đến BR-88)

**Tiêu chí:** test webhook lặp 10 lần; test bất biến sổ cái sau 5.000 thao tác ngẫu nhiên.

### Giai đoạn 5 — Hoa hồng, thông báo, báo cáo (Tuần 21–23: 22/03 – 11/04)

- [ ] Quy tắc hoa hồng (%, cố định, bán gói, khách chỉ định), ngày hiệu lực, chia nhiều thợ (BT5)
- [ ] Chốt kỳ, thu hồi vào kỳ kế tiếp; nhân viên xem hoa hồng tạm tính
- [ ] Email xác nhận, nhắc lịch 24h và 2h bằng BullMQ delayed job
- [ ] Báo cáo: doanh thu, tiền trả trước vs doanh thu thực hiện, tỉ lệ lấp đầy, tỉ lệ không đến
- [ ] *(Nâng cao, nếu kịp)* Danh sách chờ

**Mốc quan trọng 11/04:** toàn bộ lõi chạy đầu–cuối cho ngành salon. Nếu trễ, cắt danh sách chờ và báo cáo nâng cao, **không cắt kiểm thử**.

### Giai đoạn 6 — Chatbot và chứng minh tổng quát (Tuần 24–26: 12/04 – 02/05)

- [ ] Chatbot: định nghĩa tool, prompt theo tenant và từ ngữ ngành; khung chat trên trang đặt lịch; luồng hỏi → tìm giờ → giữ chỗ → OTP (BT7)
- [ ] Guardrail: không tự xác nhận, chuyển lễ tân, giới hạn lượt
- [ ] Bộ đánh giá 50–100 câu hỏi cho cả hai ngành
- [ ] **Hoàn thiện gói cấu hình spa thú cưng** và bộ test BT8: tạo tenant từ gói, chạy lại toàn bộ test lõi
- [ ] *(Nâng cao)* Gợi ý giờ tránh khoảng trống lẻ

### Giai đoạn 7 — Hoàn thiện và thực nghiệm (Tuần 27–28: 03/05 – 16/05)

- [ ] Playwright e2e cho 5 luồng chính (chạy trên cả hai ngành)
- [ ] Load test k6 API tìm giờ trống và đặt lịch
- [ ] Rà soát bảo mật: rate limit OTP, validation, phân quyền từng endpoint
- [ ] Seed dữ liệu đẹp: một salon tóc, một spa, một spa thú cưng
- [ ] Thử nghiệm độ dễ dùng với 5–8 người (bạn bè đóng vai lễ tân, khách), đo SUS
- [ ] Triển khai bản demo online

**16/05/2027: ĐÓNG BĂNG TÍNH NĂNG.** Sau mốc này chỉ sửa lỗi.

### Giai đoạn 8 — Báo cáo và bảo vệ (Tuần 29–34: 17/05 – 27/06)

- [ ] Viết báo cáo theo cấu trúc mục 13
- [ ] Video demo 5–7 phút: 100 request đồng thời, webhook lặp, chatbot, **cùng mã nguồn chạy salon và spa thú cưng**
- [ ] Slide bảo vệ 15–20 trang
- [ ] Kịch bản demo cố định + video dự phòng
- [ ] Luyện trả lời câu hỏi ở mục 15

### Tổng hợp mốc

| Mốc | Ngày | Tiêu chí |
|---|---|---|
| M0 | 15/11/2026 | Đề cương được duyệt, đã dùng thử đối thủ |
| M1 | 06/12/2026 | Thiết kế + prototype |
| M2 | 27/12/2026 | Nền tảng, cô lập tenant đã kiểm chứng |
| M3 | 07/02/2027 | Lõi đặt lịch chống trùng tuyệt đối |
| M4 | 21/03/2027 | Tiền: thanh toán, ví, gói |
| M5 | 11/04/2027 | Lõi hoàn chỉnh đầu–cuối |
| M6 | 02/05/2027 | Chatbot + chứng minh tổng quát (BT8) |
| M7 | 16/05/2027 | Đóng băng tính năng, có số liệu thực nghiệm |
| M8 | Cuối 6/2027 | Bảo vệ |

---

## 12. Khảo sát không cần gặp mặt

### 12.1. Dùng thử và đọc đánh giá đối thủ

- **Dùng thử:** SimplyBook.me + một phần mềm Việt Nam. Ghi theo mẫu: *Tính năng — Có/Không — Cách làm — Ảnh chụp.*
- **Đọc đánh giá:** App Store, Google Play, Capterra của MySpa, NanoSpa, SalonHero, SimplyBook.me, MoeGo.
- Lập bảng: *Nỗi đau — Số lần xuất hiện — Trích dẫn ngắn — Đồ án giải quyết bằng tính năng/BR nào.*

### 12.2. Google Form (dưới 3 phút)

1. Cơ sở của anh/chị thuộc loại nào? (Salon tóc / Nail / Spa / Spa thú cưng / Khác)
2. Có bao nhiêu nhân viên kỹ thuật?
3. Hiện nhận lịch hẹn bằng cách nào? (Sổ tay / Zalo, Messenger / Excel / Phần mềm: ___)
4. Trong 1 tháng, khoảng bao nhiêu lần bị trùng lịch hoặc quên lịch?
5. Có dịch vụ nào mà trong lúc chờ (ủ thuốc, sấy...) thợ làm được việc khác không? Hiện xếp lịch các dịch vụ đó thế nào?
6. Tỉ lệ khách đặt rồi không đến ước chừng bao nhiêu? Có thu cọc không?
7. Có bán gói liệu trình, thẻ trả trước không? Theo dõi số buổi còn lại bằng cách nào?
8. Hoa hồng cho thợ tính theo cách nào, mất bao lâu mỗi tháng?
9. Nếu có công cụ miễn phí giúp nhận lịch online, chống trùng, tính hoa hồng, anh/chị có muốn dùng thử không? (để lại liên hệ nếu có)

---

## 13. Cấu trúc báo cáo đề xuất

1. **Tổng quan:** bối cảnh, khảo sát hiện trạng (mục 12), bảng so sánh đối thủ có bằng chứng, **phạm vi áp dụng** (mục 2), mục tiêu, phạm vi đồ án
2. **Cơ sở lý thuyết và các hệ thống liên quan:** mô hình đặt lịch của SimplyBook.me, Mangomint, Timely; SaaS multi-tenant, RLS, exclusion constraint, idempotency, sổ cái kế toán, outbox pattern, cấu hình theo ngành bằng dữ liệu, tool calling của LLM
3. **Phân tích và thiết kế:** vai trò, use case, bảng BR, kiến trúc lõi + gói cấu hình, ERD, sơ đồ trạng thái, sequence
4. **Giải quyết các bài toán khó:** BT1 → BT8, mỗi bài theo khung *vấn đề → hệ thống khác làm thế nào → phương án → lựa chọn → hiện thực*
5. **Cài đặt và thực nghiệm:** giao diện chính của cả hai ngành, kết quả E1 → E9 kèm phân tích
6. **Kết luận và hướng phát triển:** kết quả, hạn chế (nói thẳng), các phân hệ ở mục 3.3, ngành thứ ba trở đi

---

## 14. Rủi ro và cách giảm thiểu

| Rủi ro | Dấu hiệu sớm | Cách xử lý |
|---|---|---|
| Thuật toán giờ trống phức tạp hơn dự kiến | Tuần 11 chưa qua property test | Tạm bỏ đặt nhóm, giữ chuỗi dịch vụ; ghi rõ trong phần hạn chế |
| Thiết kế bị viết cứng theo ngành salon | Gói thú cưng ở giai đoạn 1 cần thêm bảng riêng | Sửa mô hình ngay ở giai đoạn 1, khi còn rẻ |
| Phình phạm vi | Muốn thêm kho, nha khoa, ngành thứ ba, app di động | Chỉ thêm khi M5 đã đạt; còn lại vào "Hướng phát triển" |
| Cổng thanh toán không có môi trường thử | Không lấy được tài khoản thử | Giả lập webhook có chữ ký HMAC; vẫn chứng minh idempotency |
| Chi phí AI | Chi phí API tăng khi test | Cache, giới hạn lượt, model nhỏ cho bộ đánh giá |
| Không có người dùng thật | Google Form không ai trả lời | Thực nghiệm E1–E9 + SUS với bạn bè; nêu trung thực trong báo cáo |
| Trễ tiến độ | Trễ quá 1 tuần ở bất kỳ mốc nào | Cắt mục "Nâng cao" trước, rồi đơn giản hóa chatbot; **không cắt E1–E5 và E9** |
| Code AI sinh ra sai nghiệp vụ | Test BR thất bại | Viết test BR trước, code sau; tự review mọi phần phân quyền và tiền |

---

## 15. Câu hỏi hội đồng dự kiến

| Câu hỏi | Hướng trả lời |
|---|---|
| SimplyBook.me, Mangomint đã có tài nguyên và processing time, em làm lại để làm gì? | Không tuyên bố phát minh; đóng góp là kết hợp đầy đủ + chứng minh đúng đắn (E1, E2) + chống trùng ở tầng DB + nghiệp vụ tiền kiểu Việt Nam + tổng quát bằng cấu hình (E9). Dẫn bảng so sánh có ảnh chụp ở chương 1 |
| Thị trường Việt Nam đã có MySpa, NanoSpa? | Như trên; thêm kết quả dùng thử ở giai đoạn 0 |
| "Dùng cho mọi dịch vụ" có quá tham không? | Không phải mọi dịch vụ; chỉ dịch vụ theo lịch hẹn có ba đặc điểm (mục 2), kèm danh sách ngành không phù hợp và lý do |
| Thêm ngành mới tốn bao nhiêu công? | Chỉ viết gói cấu hình; E9 cho thấy 0 dòng code lõi phải sửa |
| Hai người bấm đặt cùng lúc thì sao? | Exclusion constraint; demo E2 |
| Thợ đang ủ thuốc thì nhận khách khác được không? | Mô hình đoạn chiếm dụng, BR-05 |
| Webhook về hai lần? | idempotency_key + transaction; E3 |
| Gói 10 buổi dùng 4 buổi rồi hoàn, giá lẻ đã tăng? | BR-27: dùng giá lẻ tại thời điểm mua gói |
| Kỳ hoa hồng đã chốt mà khách được hoàn tiền? | BR-42: bút toán âm vào kỳ của ngày duyệt hoàn |
| Tiệm A có xem được dữ liệu tiệm B không? | Hai lớp, có RLS; E5 |
| AI đặt sai lịch thì sao? | AI chỉ gọi tool, không xác nhận; mọi lịch qua OTP và exclusion constraint; E7 |
| Em đã thử với người dùng thật chưa? | Trình bày dùng thử đối thủ, khảo sát gián tiếp, SUS; nêu rõ hạn chế |
| Vì sao tách NestJS khỏi Next.js? | Backend độc lập phục vụ nhiều client (web, chatbot, sau này app); module rõ; WebSocket; hàng đợi |

---

## 16. Nguyên tắc làm việc

1. **Lõi trước, phụ sau.** Không đụng chatbot trước M5.
2. **Không viết cứng theo ngành.** Mỗi khi muốn viết `if (industry === ...)` trong code lõi, dừng lại và đưa nó vào gói cấu hình.
3. **Viết test BR trước khi code** phần đặt lịch, tiền, hoa hồng.
4. **Mỗi tuần một dòng nhật ký tiến độ** trong `docs/progress.md`; cuối đồ án dùng làm phụ lục.
5. **Dùng AI để sinh code nhưng tự review** mọi phần phân quyền, cô lập tenant và tiền.
6. **Cuối mỗi giai đoạn, tự hỏi:** "Nếu bảo vệ ngay hôm nay, mình demo được gì và chứng minh được gì?"
7. **Tài liệu này là tài liệu sống:** cập nhật sau mỗi mốc, nhưng chỉ *thu hẹp* phạm vi, không mở rộng.
