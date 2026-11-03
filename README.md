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
CLAUDE.md         # trí nhớ dự án cho Claude Code
```

App xem tài liệu (Next.js + Fumadocs, `/docs`) và mock giao diện (`/mock`) sẽ được dựng theo Phần B của [kế hoạch dựng base source](content/docs/ky-thuat/ke-hoach-dung-base.md). Trước khi dựng app, đọc thẳng file markdown trên GitHub.

## Cài đặt môi trường làm việc (một lần)

1. Cài **Git**, **Node.js 26 LTS**, bật pnpm bằng `corepack enable`, cài **Docker Desktop**, **VS Code** và extension **Claude Code**.
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
