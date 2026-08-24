# Frontend gọi Backend trên VPS

Tài liệu này giải thích vì sao Frontend (FE) gọi được Backend (BE) trên VPS,
cấu hình nằm ở đâu, và cách kiểm tra khi trình duyệt báo `connection refused`.

## 1. Hiểu đúng các thành phần

- **Frontend**: mã JavaScript chạy trong trình duyệt của người dùng.
- **Backend**: ứng dụng Spring Boot chạy trên VPS.
- **Port của ứng dụng**: cổng mà Spring Boot lắng nghe bên trong máy/container.
- **Public URL**: địa chỉ mà trình duyệt có thể truy cập, thường được mở qua Nginx.
- **CORS**: quy tắc Backend cho phép Frontend ở origin nào gọi API.

Luồng request thông thường:

```text
Trình duyệt người dùng
        |
        | https://app.example.com/api/...
        v
Nginx/reverse proxy trên VPS
        |
        | http://127.0.0.1:8080/api/...
        v
Spring Boot Backend
```

FE không gọi được `localhost` của VPS. Trong trình duyệt, `localhost` luôn là
máy đang mở trình duyệt.

## 2. Cấu hình hiện tại của project

### Cổng Backend

`Dockerfile` khai báo:

```dockerfile
EXPOSE 8080
```

`src/main/resources/application.properties` cũng không đặt
`server.port`, vì vậy Spring Boot dùng mặc định `8080`.

Do đó, backend hiện tại cần được kiểm tra bằng:

```bash
curl -i http://127.0.0.1:8080/api/v1/required-levels
```

Nếu Docker Compose map cổng khác, ví dụ `8081:8080`, thì:

- `8081` là cổng bên ngoài container trên VPS.
- `8080` là cổng bên trong container.
- FE hoặc Nginx phải gọi cổng public `8081` (nếu thực sự expose cổng này).

Kiểm tra port thật trên VPS:

```bash
docker compose ps
ss -ltnp | grep -E ':8080|:8081'
```

### CORS

Backend bật CORS trong:

```text
src/main/java/com/example/reviewshopbackend/config/SecurityConfig.java
```

Origin hiện được cho phép trực tiếp trong Java:

```text
http://localhost:5173
http://192.168.170.101:5173
https://*.ngrok-free.app
```

Lưu ý: `.env` có biến `CORS_ALLOWED_ORIGINS`, nhưng code hiện tại chưa inject
biến này vào `CorsConfigurationSource`. Vì vậy thay đổi biến trong `.env` chưa
làm thay đổi allowlist CORS. Muốn dùng production domain, phải cập nhật code
hoặc sửa cấu hình CORS để đọc biến môi trường, rồi build/restart backend.

## 3. FE đặt địa chỉ Backend ở đâu?

Việc này nằm trong project Frontend, không nằm trong backend này. Tìm các tên
thường gặp:

```text
VITE_API_URL
REACT_APP_API_URL
NEXT_PUBLIC_API_URL
baseURL
axios.create
fetch(
```

Ví dụ FE dùng Vite:

```env
VITE_API_URL=https://api.example.com
```

```javascript
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`
});
```

FE phải được build lại sau khi đổi biến môi trường. Biến môi trường của FE
thường được chèn vào JavaScript lúc build, không tự thay đổi sau khi đã build.

## 4. Ba cách FE gọi BE

### Cách A: Dùng domain/reverse proxy (khuyến nghị production)

FE gọi:

```text
https://api.example.com/api/v1/...
```

Nginx trên VPS chuyển request tới:

```text
http://127.0.0.1:8080/api/v1/...
```

Ví dụ Nginx tối thiểu:

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Trong cách này, chỉ Nginx cần public ra Internet; Spring Boot có thể chỉ bind
ở `127.0.0.1:8080`.

### Cách B: FE gọi trực tiếp IP và port VPS

FE có thể gọi:

```text
http://169.58.210.240:8080/api/v1/...
```

Điều kiện:

- Docker phải publish port ra ngoài, ví dụ `8080:8080`.
- Firewall VPS phải cho phép port đó.
- CORS phải cho phép origin của FE.
- Production nên dùng HTTPS; gọi HTTP từ một trang HTTPS có thể bị trình
  duyệt chặn vì mixed content.

Đây là cách dễ test nhưng không nên là kiến trúc production lâu dài.

### Cách C: SSH tunnel (chỉ để phát triển/test cá nhân)

Lệnh:

```bash
ssh -N -L 18081:127.0.0.1:8080 root@169.58.210.240
```

Ý nghĩa:

```text
localhost:18081 trên máy cá nhân
    -> SSH
127.0.0.1:8080 trên VPS
```

Sau đó mở:

```text
http://127.0.0.1:18081
```

Lệnh phải được chạy trên máy cá nhân, là máy có trình duyệt. Nếu chạy lệnh
trong terminal của VPS rồi mở trình duyệt trên máy cá nhân, tunnel chỉ tồn tại
trên VPS nên trình duyệt cá nhân không thấy cổng `18081`.

Lệnh trước đó của bạn là:

```bash
ssh -L 18081:127.0.0.1:8081 root@169.58.210.240
```

Nó chuyển tới port `8081`, trong khi backend của project mặc định là `8080`.
Chỉ dùng `8081` nếu VPS/Docker Compose thực sự đang publish backend ở port đó.

## 5. Cách chẩn đoán theo từng lớp

### Bước 1: Kiểm tra Backend trong VPS

```bash
docker compose ps
docker compose logs --tail=200 backend
curl -i http://127.0.0.1:8080/api/v1/required-levels
```

Nếu nhận `401`, backend đã nhận request; endpoint chỉ yêu cầu đăng nhập.
Nếu nhận `connection refused`, backend chưa chạy hoặc port bị sai.

### Bước 2: Kiểm tra tunnel

Chạy trên máy cá nhân:

```bash
ssh -N -L 18081:127.0.0.1:8080 root@169.58.210.240
```

Mở terminal thứ hai trên máy cá nhân:

```bash
curl -i http://127.0.0.1:18081/api/v1/required-levels
```

### Bước 3: Kiểm tra FE

Trong DevTools của trình duyệt, mở tab **Network** và xem URL request.

- URL là `localhost:8080` hoặc `localhost:8081`: FE đang gọi máy cá nhân.
- URL là `169.58.210.240:...`: FE đang gọi trực tiếp VPS.
- URL là domain API: request đi qua Nginx/reverse proxy.
- `CORS error`: backend nhận request nhưng không cho phép origin FE.
- `ERR_CONNECTION_REFUSED`: không có service lắng nghe đúng host/port.

## 6. Checklist cấu hình production

- [ ] Backend chạy ổn định và kiểm tra được từ bên trong VPS.
- [ ] Xác định chính xác port: `8080` hay `8081`.
- [ ] FE dùng đúng `VITE_API_URL`/biến tương ứng.
- [ ] FE được build lại sau khi đổi API URL.
- [ ] Nginx proxy tới đúng port backend.
- [ ] DNS của API domain trỏ tới IP VPS.
- [ ] HTTPS đã bật.
- [ ] CORS cho phép đúng domain FE, không dùng `*` khi có credentials.
- [ ] Không dùng SSH tunnel cho người dùng production.

## 7. Kết luận cho trường hợp hiện tại

Trước tiên trên VPS chạy:

```bash
curl -i http://127.0.0.1:8080/api/v1/required-levels
```

Nếu backend trả response, từ máy cá nhân dùng tunnel đúng port:

```bash
ssh -N -L 18081:127.0.0.1:8080 root@169.58.210.240
```

Sau đó FE local phải cấu hình API URL là:

```text
http://127.0.0.1:18081
```

và gọi endpoint với prefix:

```text
/api/v1/...
```

Nếu mục tiêu là cho người dùng truy cập thật, cần dùng domain/Nginx và cấu hình
FE trỏ tới domain đó; không dùng `localhost` hoặc SSH tunnel.
