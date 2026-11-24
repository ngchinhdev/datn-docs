---
title: T-13. Triển khai và CI
---

- `docker-compose.yml` ở gốc `datn-saas`: `postgres:18`, `redis`, `mailpit`. Chạy app bằng `pnpm dev` trên máy.
- GitHub Actions: cài đặt → lint → typecheck → unit → integration (Testcontainers chạy được trên runner Ubuntu có Docker) → e2e Playwright (theo nhánh `main` và PR). Lưu trace Playwright khi lỗi.
- Demo: web trên Vercel; api, Postgres, Redis bằng Docker trên một VPS hoặc Railway.
