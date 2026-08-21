# Review Shop Frontend Rules

Mọi thay đổi giao diện trong repository này phải tuân thủ `docs/UI_GUIDELINES.md`.

Trước khi hoàn tất một UI task:

1. Kiểm tra tối thiểu ở viewport 320px, 768px, 1024px và 1440px.
2. Kiểm tra điều hướng chỉ bằng bàn phím, focus state và semantic HTML.
3. Bao phủ loading, empty, error, disabled và success state phù hợp với luồng.
4. Không hard-code màu, spacing hoặc breakpoint lặp lại nếu đã có design token.
5. Chạy `npm run lint` và `npm run build`.

## Ant Design

Ant Design là UI framework mặc định và bắt buộc của project.

1. Ưu tiên component từ `antd` và icon từ `@ant-design/icons`; không tự dựng lại Button, Input, Select, Form, Modal, Drawer, Table, Pagination, Alert, Tooltip hoặc component tương đương nếu Ant Design đã hỗ trợ.
2. Mọi tùy biến giao diện phải đi qua `ConfigProvider`, theme token trong `src/app/theme/antdTheme.js`, CSS Modules hoặc wrapper component có chủ đích. Không sửa trực tiếp CSS nội bộ dựa trên class hash của Ant Design.
3. Không hard-code màu, radius, spacing dùng chung hoặc z-index. Bổ sung token ở theme/design token trước khi sử dụng.
4. Dùng Ant Design Grid hoặc CSS Grid/Flex mobile-first tùy bài toán; sử dụng Ant Design không thay thế yêu cầu responsive và accessibility.
5. Import theo ESM từ `antd`; không import stylesheet/component theo đường dẫn nội bộ không được công khai.
6. Trước khi thêm thư viện UI khác, phải chứng minh Ant Design không đáp ứng được và được người dùng chấp thuận.
