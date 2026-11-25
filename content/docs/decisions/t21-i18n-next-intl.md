---
title: T-21. Hai ngôn ngữ Việt và Anh bằng next-intl
---

- **Ngày:** 24/11/2026.
- **Quyết định:** giao diện của `apps/web` có tiếng Việt và tiếng Anh, chọn bằng nút VI/EN ở thanh trên của các trang tài khoản. Chữ nằm ở `apps/web/messages/vi.json` và `en.json`, đọc bằng [next-intl](https://next-intl.dev) 4 (không đổi địa chỉ theo ngôn ngữ).
- **Cách chọn ngôn ngữ:** cookie `lang` (`vi` hoặc `en`, mặc định `vi`). Nút đổi ghi cookie rồi gọi `router.refresh()`, nên máy chủ vẽ lại đúng ngôn ngữ và địa chỉ giữ nguyên. Cookie không mang dữ liệu nhạy cảm, nên không `HttpOnly`.
- **Quy ước file chữ:**
  - Hai file có cùng khóa. Giá trị chèn viết `{tên}`, số nhiều viết theo ICU (`{count, plural, one {# business} other {# businesses}}`); tiếng Việt không chia số nhiều nên chỉ viết `{count}`.
  - Khóa của `t()` được kiểm theo `vi.json` (khai báo `AppConfig` của next-intl). Test `messages.test.ts` giữ `en.json` cùng khóa và cùng giá trị chèn với `vi.json`.
  - Câu báo lỗi dưới ô nhập (`FieldError`) khớp từng chữ với `fieldErrorMessage` của `packages/shared`, để kiểm trên máy và lỗi 400 của API ra cùng một câu.
- **Với Cache Components:** đọc cookie là dữ liệu của request, nên `NextIntlClientProvider` nằm trong `Suspense` của từng trang (`LangScope`), không nằm ở layout gốc.
- **Phạm vi hiện có:** các trang MH-03, MH-63, MH-06, trang báo khóa và trang đích tạm. Màn hình khác thêm khóa vào cùng hai file.
- **Vì sao dùng thư viện:** chữ có giá trị chèn và số nhiều, có cả Server Component lẫn Client Component. Tự viết hàm thay `{tên}` thì phải tự viết luôn phần số nhiều và phần đọc ngôn ngữ ở máy chủ.
