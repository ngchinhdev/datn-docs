---
title: T-12. Chất lượng code
---

- **TypeScript 6.0** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; `tsconfig.base.json` ở gốc. Chưa dùng TypeScript 7 (compiler viết lại bằng Go) vì `@nestjs/cli` 12 còn phụ thuộc `typescript ~6.0`.
- **oxlint** cho cả repo (mặc định của Nest 12; Next 16 đã bỏ lệnh `next lint`), bật plugin typescript, react, nextjs, import, vitest. **Prettier** để format.
- Script CI chặn từ khóa ngành (`hair`, `nail`, `pet`, `tóc`, `thú cưng`...) trong `packages/scheduling-core` và các module lõi (BT8).
- Commit theo Conventional Commits (`feat(scheduling): ...`), mỗi commit chạy được test.
- Pre-commit hook bằng **husky + lint-staged**: Prettier và oxlint trên file đã stage, kiểm từ khóa ngành, `typecheck`, unit test. Integration và e2e để CI chạy.
