# Review Shop FE

Frontend React dùng Vite.

UI framework mặc định: [Ant Design](https://ant.design/), được cấu hình tập trung qua `ConfigProvider` và `src/app/theme/antdTheme.js`.

## Yêu cầu

- Node.js 20.19 trở lên (khuyến nghị bản LTS mới nhất)
- npm 10 trở lên

## Chạy project

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Các lệnh

- `npm run dev`: chạy môi trường phát triển
- `npm run build`: build production vào thư mục `dist`
- `npm run lint`: kiểm tra code
- `npm run preview`: xem thử bản production

Copy `.env.example` thành `.env` để cấu hình địa chỉ backend. Biến môi trường phía client phải bắt đầu bằng `VITE_`.

## Kiến trúc source

```text
src/
├── app/                 # Bootstrap, router, global styles, providers
├── pages/               # Các màn hình gắn với route
├── features/            # Nghiệp vụ người dùng (login, search, checkout...)
├── entities/            # Domain model (product, review, user...)
├── shared/
│   ├── api/             # HTTP client và hạ tầng gọi API
│   ├── config/          # Runtime config và environment
│   ├── lib/             # Hàm tiện ích thuần, dùng chung
│   └── ui/              # UI component/layout không chứa nghiệp vụ
└── main.jsx             # Entry point duy nhất
```

Quy tắc dependency: `app → pages → features → entities → shared`. Tầng thấp không import ngược lên tầng cao. Chỉ tạo feature/entity khi có nghiệp vụ thực tế; không tạo folder rỗng để giữ cấu trúc hình thức.

## Quy chuẩn phát triển UI

Mọi giao diện phải tuân thủ [Frontend UI Engineering Guidelines](docs/UI_GUIDELINES.md), bao gồm responsive mobile-first, accessibility, design system, UI states, performance và Definition of Done.
