---
title: Quyết định
description: Các quyết định đã chốt về sản phẩm (D-xx) và kỹ thuật (T-xx), kèm lý do.
---

Mỗi quyết định một trang: bối cảnh, lựa chọn, lý do, hệ quả. Quyết định bị thay thì giữ trang cũ và ghi "Thay bởi …".

## Sản phẩm

| Mã | Quyết định |
|---|---|
| [D-01](./d01-topic.md) | Đề tài: nền tảng đặt lịch đa tài nguyên cho cơ sở dịch vụ theo lịch hẹn |
| [D-02](./d02-target-industries.md) | Ngành chính salon, tóc, nail, spa; ngành chứng minh là spa thú cưng; bỏ nha khoa |
| [D-03](./d03-positioning.md) | Định vị so với đối thủ: không tuyên bố phát minh |
| [D-04](./d04-scope-for-one-person.md) | Cắt phạm vi cho một người làm |
| [D-05](./d05-chatbot-on-web-last.md) | Giữ chatbot, nhưng trên web và làm sau cùng |
| [D-06](./d06-remote-survey.md) | Khảo sát không cần gặp mặt |
| [D-07](./d07-two-repos.md) | Tổ chức repo: 2 repo |
| [D-09](./d09-mock-payment-provider.md) | Thanh toán: payOS không có môi trường test |
| [D-11](./d11-sapio-design-system.md) | Tên sản phẩm Sapio và hệ thống thiết kế |
| [D-12](./d12-first-screens-direction.md) | Hướng giao diện hai màn hình đầu |
| [D-13](./d13-customer-otp-by-email.md) | OTP của khách gửi qua email, không qua SMS |
| [D-14](./d14-confirm-and-free-slot-patterns.md) | Mẫu xác nhận thao tác và cách hiện giờ trống |
| [D-15](./d15-trial-and-two-plans.md) | Dùng thử 7 ngày và hai gói Sapio, thay cho duyệt tay |
| [D-16](./d16-beauty-only-scope.md) | Thu hẹp phạm vi: chỉ cơ sở làm đẹp, bỏ đa ngành và spa thú cưng |

## Kỹ thuật

| Mã | Quyết định |
|---|---|
| [T-01](./t01-nodejs-runtime.md) | Runtime: Node.js 24 LTS |
| [T-02](./t02-monorepo.md) | Monorepo: pnpm workspaces + catalog, Turborepo |
| [T-03](./t03-frontend-nextjs.md) | Frontend: Next.js 16.4 + React 19.3 |
| [T-04](./t04-backend-nestjs.md) | Backend: NestJS 12, ESM, Express |
| [T-05](./t05-scheduling-core.md) | `packages/scheduling-core`: thuật toán thuần |
| [T-06](./t06-postgres-drizzle.md) | Cơ sở dữ liệu: PostgreSQL 18 + Drizzle ORM v1 (RC) |
| [T-07](./t07-row-level-security.md) | Cô lập dữ liệu: RLS hai lớp |
| [T-08](./t08-staff-session-cookie.md) | Xác thực: tự xây bằng phiên trong cookie |
| [T-09](./t09-queue-outbox-realtime.md) | Hàng đợi, outbox, realtime |
| [T-10](./t10-payment-provider.md) | Thanh toán |
| [T-11](./t11-email-and-ai.md) | Email và AI |
| [T-12](./t12-code-quality.md) | Chất lượng code |
| [T-13](./t13-deploy-and-ci.md) | Triển khai và CI |
| [T-14](./t14-docs-repo.md) | Repo `datn-docs` |
| [T-15](./t15-web-routes.md) | Route của web: tiếng Anh, slug cơ sở trong URL |
| [T-16](./t16-tenant-subdomains.md) | Trang khách của mỗi cơ sở trên tên miền con |
| [T-17](./t17-plan-entitlements.md) | Gói Sapio: gói và tính năng là dữ liệu, kiểm qua một hàm |
| [T-18](./t18-admin-subdomain.md) | Quản trị nền tảng trên tên miền con riêng |
| [T-19](./t19-api-docs.md) | Tài liệu API sinh từ OpenAPI, xem bằng Scalar và fumadocs-openapi |
| [T-20](./t20-same-origin-api.md) | Trình duyệt gọi API cùng origin qua /api |

## Nguồn

- [Next.js 16.4](https://nextjs.org/blog/next-16-4) · [Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy) · [Upgrade to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [NestJS v12.0.0 release](https://github.com/nestjs/nest/releases/tag/v12.0.0) · [InfoQ: NestJS 12 roadmap](https://infoq.com/news/2026/04/nestjs-12-roadmap-esm) · [InfoQ: NestJS 12 observability](https://infoq.com/news/2026/10/nestjs-12-observability) · [NestJS migration guide](https://docs.nestjs.com/migration-guide) · [endoflife.date: NestJS](https://endoflife.date/nestjs)
- [endoflife.date: Node.js](https://endoflife.date/nodejs)
- [Drizzle latest releases](https://orm.drizzle.team/docs/latest-releases) · [Drizzle RLS](https://orm.drizzle.team/docs/rls) · [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) · [PostgreSQL Range Types](https://www.postgresql.org/docs/current/rangetypes.html)
- [Better Auth NestJS integration](https://better-auth.com/docs/integrations/nestjs)
- [payOS: Môi trường test](https://payos.vn/docs/moi-truong-test) · [VietQR Test Callback](https://api.vietqr.vn/en/v1/vietqr-apis/test-callback)
- [Fumadocs: Next.js manual installation](https://www.fumadocs.dev/docs/manual-installation/next)
- [PkgPulse: JS monorepos 2026 best practices](https://www.pkgpulse.com/guides/javascript-monorepos-2026-best-practices-pitfalls)
