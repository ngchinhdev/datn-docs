# DataTable

Mẫu trang danh sách cho mọi màn mức **DS** trong [Danh sách màn hình](https://datn-docs.vercel.app/docs/thiet-ke/man-hinh): `.sp-page-head` → `.sp-toolbar` → `.sp-table-card` > (`.sp-table-wrap` > `table.sp-table`) + `.sp-table-foot`.

- **Cuộn trong khung (từ 768px):** trang dùng `.sp-shell__content--fill`, thẻ bảng chiếm phần màn hình còn lại; chỉ thân bảng cuộn (`.sp-table-wrap`, `tabindex="0"`, `role="region"` có nhãn để cuộn được bằng bàn phím). Dòng tiêu đề cột dính trên, chân bảng dính dưới. Mỗi dòng cao 56px. Dưới 768px danh sách thẻ cuộn theo trang như bình thường.

- **Tiêu đề:** tên trang, dòng phụ có tổng số và phạm vi (chi nhánh); một nút chính bên phải ("Thêm khách").
- **Thanh công cụ:** ô tìm `.sp-search` (tìm ngay khi gõ, theo tên và số điện thoại chuẩn hóa), các bộ lọc nhanh `.sp-chip` (`aria-pressed`), bộ lọc có giá trị ghi `.sp-chip__value`. Bộ lọc nằm trong URL.
- **Bảng:** cột đầu là đối tượng chính (avatar + tên là link tới trang chi tiết + dòng phụ `.sp-table__secondary`). Cột số căn phải, số thẳng cột (`.sp-table__num`). Cột sắp xếp được có `aria-sort`. Tiêu đề cột viết hoa, 11px, đậm 600, giãn chữ 0,04em, màu `ink-muted`. Cột thao tác cuối cùng, tối đa một nút ghost; thao tác khác vào trang chi tiết. Rê chuột cả hàng tô `fill-tonal`.
- **Dưới 768px:** bảng đổi thành danh sách thẻ `.sp-cards` (tên, một dòng meta), bấm thẻ vào trang chi tiết. **Không cuộn ngang:** các bộ lọc gom vào nút "Bộ lọc" (`.sp-btn--secondary` + `.sp-count` số bộ lọc đang bật) mở `.sp-sheet`; bộ lọc đang bật hiện dưới ô tìm thành `.sp-chips` xuống dòng được, mỗi chip có nút ✕ (`.sp-chip__remove`, `aria-label="Bỏ lọc Đến trong 30 ngày"`).
- **Trống:** `.sp-empty` nói vì sao trống và làm gì tiếp ("Chưa có khách nào. Khách đặt lịch online sẽ hiện ở đây."); lọc không ra kết quả thì có nút "Bỏ lọc".
- **Phân trang:** `nav.sp-pagination` (`aria-label="Phân trang"`): nút trước, các số trang (`aria-current="page"` ở trang đang xem), dấu `…` khi quá 7 trang (luôn hiện trang đầu, trang cuối và hai trang quanh trang hiện tại), nút sau. Bên trái: "Hiển thị 1–20 trong 1.284 khách". Bên phải (`.sp-table-foot__right`, kiểu Ant Design): các nút số trang, rồi ô `.sp-select` "20 / trang" (50, 100; `aria-label="Số dòng mỗi trang"`). Đổi số dòng thì quay về trang 1. Trang và số dòng nằm trong URL (`?page=2&size=50`). Dưới 768px chỉ còn nút trước, "Trang 1/65", nút sau.
- Người dùng component cung cấp: các cột (nhãn, căn, sắp xếp), dòng dữ liệu, bộ lọc, nội dung trạng thái trống.
