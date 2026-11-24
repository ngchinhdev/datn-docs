---
title: T-14. Repo `datn-docs`
---

- Next.js 16 + **Fumadocs** (hỗ trợ Next 16, Tailwind 4): nội dung Markdown trong `content/docs`, phục vụ ở `/docs`; prototype ở `/mock/*`.
- Mock dùng cùng Tailwind 4 + shadcn/ui với `apps/web`, dữ liệu giả là fixture TypeScript trong repo, có tenant salon tóc và spa.
- Fumadocs MDX là ESM-only: file cấu hình là `next.config.mjs`.
