import { defineTranslations } from 'fumadocs-core/i18n';
import { openapiTranslations } from 'fumadocs-openapi/i18n';
import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';

/** Interface text of Fumadocs and of the API reference pages. Playground and OAuth texts are not needed. */
const translations = defineTranslations()
  .extend(uiTranslations())
  .extend(openapiTranslations())
  .add({
    // fumadocs-ui
    'Back to Home(404 page)': 'Về trang chủ',
    'Close Search(search dialog)(aria-label)': 'Đóng tìm kiếm',
    'Close Sidebar(aria-label)': 'Đóng thanh bên',
    'Close Sidebar(sidebar)(aria-label)': 'Đóng thanh bên',
    'Collapse Sidebar(sidebar)(aria-label)': 'Thu gọn thanh bên',
    'Copied Anchor Link(heading anchor)(aria-label)': 'Đã chép link mục',
    'Copied Link(accordion)(aria-label)': 'Đã chép link',
    'Copied Text(code block)(aria-label)': 'Đã chép',
    'Copy Anchor Link(heading anchor)(aria-label)': 'Chép link mục',
    'Copy Link(accordion)(aria-label)': 'Chép link',
    'Copy Text(code block)(aria-label)': 'Chép',
    'Dark(theme switcher)(aria-label)': 'Tối',
    'Edit on GitHub(edit page)': 'Sửa trên GitHub',
    'Hide Sidebar(sidebar)': 'Ẩn thanh bên',
    'Last updated on(page footer)': 'Cập nhật lần cuối',
    'Light(theme switcher)(aria-label)': 'Sáng',
    'Next Page(pagination)': 'Trang sau',
    'No Headings(table of contents)': 'Không có mục nào',
    'No results found(search dialog)': 'Không tìm thấy kết quả',
    'On this page(table of contents)': 'Trong trang này',
    'Open Search(search trigger)(aria-label)': 'Mở tìm kiếm',
    'Open Sidebar(sidebar)(aria-label)': 'Mở thanh bên',
    'Page Not Found(404 page)': 'Không tìm thấy trang',
    'Previous Page(pagination)': 'Trang trước',
    'Search failed(search dialog)': 'Tìm kiếm lỗi',
    'Search failed, showing results for {query}(search dialog)':
      'Tìm kiếm lỗi, đang hiện kết quả cho {query}',
    'Search(search dialog)': 'Tìm kiếm',
    'Search(search trigger)': 'Tìm kiếm',
    'Show Sidebar(sidebar)': 'Hiện thanh bên',
    'System(theme switcher)(aria-label)': 'Theo hệ thống',
    'Table of Contents(inline table of contents)': 'Mục lục',
    'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)':
      'Trang bạn tìm có thể đã bị xóa, đổi tên hoặc tạm thời không dùng được.',
    'Toggle Menu(mobile menu)(aria-label)': 'Mở menu',
    'Toggle Theme(theme switcher)(aria-label)': 'Đổi giao diện',

    // fumadocs-openapi: the page of an endpoint
    'Authorization(operation page)': 'Xác thực',
    'Callbacks(operation page)': 'Callback',
    'Close(operation page)': 'Đóng',
    'Code language(operation page)': 'Ngôn ngữ mã',
    'Cookie Parameters(operation page)': 'Tham số cookie',
    'Default(operation page)': 'Mặc định',
    'Deprecated(operation page)': 'Đã lỗi thời',
    'Empty(operation page)': 'Trống',
    'Example Request(operation page)': 'Yêu cầu mẫu',
    'Example Requests(operation page)': 'Các yêu cầu mẫu',
    'Example Response(operation page)': 'Phản hồi mẫu',
    'Example request(operation page)': 'Yêu cầu mẫu',
    'Example(operation page)': 'Ví dụ',
    'Example {key}(operation page)': 'Ví dụ {key}',
    'Header Parameters(operation page)': 'Tham số header',
    'Media type(operation page)': 'Kiểu nội dung',
    'Path Parameters(operation page)': 'Tham số đường dẫn',
    'Query Parameters(operation page)': 'Tham số truy vấn',
    'Request Body(operation page)': 'Thân yêu cầu',
    'Response Body(operation page)': 'Thân phản hồi',
    'Response status(operation page)': 'Mã trạng thái',
    'Schema(operation page)': 'Schema',
    'Security scheme(operation page)': 'Cách xác thực',
    'Deprecated(security scheme)': 'Đã lỗi thời',
    'Scope(security scheme)': 'Phạm vi',

    // fumadocs-openapi: the table of properties
    'Copied Link(schema UI)(aria-label)': 'Đã chép link',
    'Copy Link(schema UI)(aria-label)': 'Chép link',
    'Default(schema UI)': 'Mặc định',
    'Deprecated(schema UI)': 'Đã lỗi thời',
    'Example(schema UI)': 'Ví dụ',
    'Filter Properties(schema UI)': 'Lọc thuộc tính',
    'Format(schema UI)': 'Định dạng',
    'Items(schema UI)': 'Phần tử',
    'Length(schema UI)': 'Độ dài',
    'Match(schema UI)': 'Khớp mẫu',
    'Multiple Of(schema UI)': 'Bội của',
    'No property matching(schema UI)': 'Không có thuộc tính khớp',
    'Properties(schema UI)': 'Thuộc tính',
    'Range(schema UI)': 'Khoảng giá trị',
    'Schema variant(schema UI)': 'Biến thể schema',
    'Show Path(schema UI)(aria-label)': 'Hiện đường dẫn',
    'Value in(schema UI)': 'Giá trị thuộc',
    'Use the {name} type in TypeScript.(TypeScript definitions)':
      'Dùng kiểu {name} trong TypeScript.',
  });

export const i18n = i18nProvider(translations);
