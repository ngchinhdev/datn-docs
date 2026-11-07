# datn-docs

Tài liệu và mock giao diện cho đồ án tốt nghiệp **"Xây dựng nền tảng SaaS đặt lịch đa tài nguyên và quản lý vận hành cho các cơ sở dịch vụ theo lịch hẹn"**. Sinh viên: Nguyễn Ngọc Chính, UIT. GVHD: ThS. Nguyễn Thị Thùy Trâm.

Code nằm ở repo riêng: [datn-saas](https://github.com/ngchinhdev/datn-saas).

## Nội dung

```
content/docs/
├── index.md
├── du-an/        # đề cương, roadmap, quyết định, tiến độ
├── nghiep-vu/    # quy tắc nghiệp vụ (BR), thuật ngữ, phân tích gốc
└── ky-thuat/     # quyết định kỹ thuật (T), chiến lược kiểm thử, kế hoạch dựng base
assets/           # file gốc (đề cương .docx)
app/              # Next.js: /docs (Fumadocs) và /mock
mock/             # dữ liệu giả (fixtures) và danh sách màn hình mock
components/ui/    # shadcn/ui, cùng cấu hình với datn-saas/apps/web
CLAUDE.md         # trí nhớ dự án cho Claude Code
```

Bản online: **https://datn-docs.vercel.app** (tài liệu ở [`/docs`](https://datn-docs.vercel.app/docs), mock ở [`/mock`](https://datn-docs.vercel.app/mock)); Vercel tự deploy mỗi lần push lên `main`.

App xem tài liệu (Next.js + Fumadocs) phục vụ `/docs`, mock giao diện ở `/mock`. Chạy bằng `pnpm install` rồi `pnpm dev`, mở http://localhost:3100/docs (cổng 3100 để không trùng `datn-saas`: web 3000, API 4000).

## Cài đặt môi trường làm việc (một lần)

1. Cài **Git**, **Node.js 24 LTS**, bật pnpm bằng `corepack enable` (Corepack tự tải pnpm 11 theo `packageManager` của từng repo), cài **Docker Desktop**, **VS Code** và extension **Claude Code**.
2. Tạo thư mục cha và clone hai repo:

   ```bash
   mkdir datn && cd datn
   git clone https://github.com/ngchinhdev/datn-docs.git
   git clone https://github.com/ngchinhdev/datn-saas.git
   ```

3. Tạo file `datn/CLAUDE.md` (không thuộc repo nào) với đúng một dòng:

   ```
   @datn-docs/CLAUDE.md
   ```

4. Mở VS Code tại thư mục `datn/`, mở Claude Code. Lần đầu Claude Code hỏi có cho phép nạp file được import không: chọn đồng ý.
5. Kiểm tra: gõ `/memory` trong Claude Code, phải thấy `datn/CLAUDE.md` và `datn-docs/CLAUDE.md` được nạp.

## Giữ "trí nhớ" giữa các phiên

Claude Code không nhớ nội dung chat cũ. Thứ được giữ lại là **các file trong repo này**:

- `CLAUDE.md`: bối cảnh và quy tắc, nạp tự động mỗi phiên.
- `content/docs/du-an/tien-do.md`: cuối mỗi phiên, Claude ghi lại đã làm gì, vướng gì, việc tiếp theo.
- `content/docs/du-an/quyet-dinh.md` và `ky-thuat/quyet-dinh-ky-thuat.md`: lý do của mọi lựa chọn.

Câu mở đầu gợi ý cho mỗi phiên: *"Đọc tiến độ mới nhất rồi làm tiếp."*
