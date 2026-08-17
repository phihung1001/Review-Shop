# Tài liệu Authentication và Authorization

## 1. Mục đích và phạm vi

Tài liệu này mô tả đầy đủ luồng xác thực (authentication), phân quyền (authorization), vòng đời access token, refresh token, CSRF token và khôi phục mật khẩu của `review-shop-backend`.

Hệ thống sử dụng:

- Spring Security OAuth2 Resource Server để xác thực Bearer JWT.
- JWT ký bằng HMAC-SHA256 (`HS256`) làm access token.
- Refresh token ngẫu nhiên, lưu trong cookie `HttpOnly`.
- Signed double-submit cookie để chống CSRF tại API refresh và logout.
- BCrypt để băm mật khẩu.
- Phân quyền theo role: `CLIENT`, `FREELANCER`, `ADMIN`.
- `authVersion` để vô hiệu hóa ngay các access token cũ khi đổi mật khẩu.
- Refresh-token rotation và phát hiện tái sử dụng token cũ.

API không sử dụng HTTP Session, form login hoặc HTTP Basic. Mỗi request được xác thực độc lập.

## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Authentication | Xác minh người gọi API là ai. |
| Authorization | Kiểm tra người gọi có quyền thực hiện hành động hay không. |
| Access token | JWT có thời hạn ngắn, gửi trong header `Authorization`. |
| Refresh token | Chuỗi ngẫu nhiên dùng để cấp access token mới, lưu trong cookie `HttpOnly`. |
| CSRF token | Giá trị HMAC gắn với refresh token, frontend gửi lại qua header. |
| Principal | Danh tính đã được Spring Security xác thực; `principal.getName()` chính là claim `sub` của JWT, hiện là email. |
| Token family | Nhóm refresh token sinh ra từ cùng một phiên đăng nhập qua các lần rotation. |
| `authVersion` | Phiên bản xác thực của user, dùng để thu hồi access token đã phát hành. |

## 3. Kiến trúc tổng quan

```text
Frontend
   |
   | 1. Login/Register bằng email và password
   v
AuthController -> AuthService -> UserRepository
   |                              |
   |                              +-- BCrypt password hash
   |
   +-- response body: access token JWT
   +-- HttpOnly cookie: refresh_token
   +-- readable cookie: csrf_token

Frontend gọi API nghiệp vụ
   |
   | Authorization: Bearer <access-token>
   v
Spring Security JWT Decoder
   |
   +-- kiểm tra chữ ký HS256
   +-- kiểm tra exp, iss, aud
   +-- kiểm tra user tồn tại và authVersion còn đúng
   +-- chuyển claim roles thành ROLE_<ROLE>
   v
URL authorization + @PreAuthorize -> Controller -> Service
```

## 4. Thành phần bảo mật

### 4.1. `SecurityConfig`

`SecurityConfig` chịu trách nhiệm:

- Tắt form login và HTTP Basic.
- Không tạo server-side session: `SessionCreationPolicy.STATELESS`.
- Cấu hình OAuth2 Resource Server nhận JWT Bearer token.
- Cấu hình URL authorization.
- Bật method security để sử dụng `@PreAuthorize`.
- Cấu hình CORS theo allowlist.
- Cấu hình `JwtEncoder`, `JwtDecoder` và `BCryptPasswordEncoder`.

Spring CSRF filter được tắt vì API nghiệp vụ dùng Bearer token trong header, trình duyệt không tự động gắn Bearer token. Riêng hai thao tác dựa vào refresh-token cookie là refresh và logout được bảo vệ bằng `RefreshCsrfService`.

### 4.2. Access token JWT

Access token có các claim:

| Claim | Nội dung |
|---|---|
| `iss` | Issuer được cấu hình bởi `JWT_ISSUER`. |
| `aud` | Audience được cấu hình bởi `JWT_AUDIENCE`. |
| `iat` | Thời điểm phát hành. |
| `exp` | Thời điểm hết hạn. |
| `sub` | Email đã chuẩn hóa của user. Đây là giá trị của `Principal.getName()`. |
| `userId` | ID user trong database. |
| `roles` | Danh sách role, hiện tại mỗi user có một role. |
| `authVersion` | Phiên bản xác thực tại thời điểm token được phát hành. |

JWT được ký bằng `HS256`. Secret phải có ít nhất 32 byte. Access token mặc định có thời hạn 15 phút.

Khi nhận JWT, backend kiểm tra:

1. Cấu trúc và chữ ký JWT hợp lệ.
2. Token chưa hết hạn.
3. `iss` đúng issuer của hệ thống.
4. `aud` chứa audience của API.
5. `sub` tồn tại.
6. User có email bằng `sub` vẫn còn tồn tại.
7. `authVersion` trong token bằng `authVersion` hiện tại trong database.

Nếu bất kỳ điều kiện nào không đạt, request không được xác thực và trả về `401 Unauthorized`.

### 4.3. Principal được tạo như thế nào

Frontend không truyền `Principal`, email hay password vào tham số controller được bảo vệ.

Frontend chỉ gửi:

```http
Authorization: Bearer eyJ...
```

Spring Security thực hiện:

```text
Authorization header
    -> BearerTokenAuthenticationFilter
    -> JwtDecoder xác minh token
    -> JwtAuthenticationToken được đặt vào SecurityContext
    -> Spring inject Principal vào controller
```

Vì claim `sub` của token là email nên:

```java
principal.getName()
```

trả về email của user đã được xác thực. Ví dụ trong API tạo Job, service dùng email này để xác định chủ sở hữu Job; không tin email do client tự gửi trong JSON.

### 4.4. Refresh token

Refresh token không phải JWT. Nó là 32 byte ngẫu nhiên sinh bằng `SecureRandom`, sau đó encode Base64 URL-safe.

Backend chỉ lưu SHA-256 hash của refresh token trong database. Raw token chỉ được trả về trình duyệt trong cookie:

```text
refresh_token=<raw-token>;
HttpOnly;
Secure;
SameSite=Strict;
Path=/api/v1/auth;
Max-Age=<ttl>
```

Ý nghĩa các thuộc tính:

- `HttpOnly`: JavaScript không đọc được refresh token.
- `Secure`: cookie chỉ được gửi qua HTTPS trong production.
- `SameSite=Strict`: giảm nguy cơ request cross-site.
- `Path=/api/v1/auth`: cookie không được gửi tới API nghiệp vụ khác.

Mỗi phiên đăng nhập tạo một token family có thời hạn tuyệt đối mặc định 30 ngày. Rotation không kéo dài family quá thời hạn này.

### 4.5. CSRF token cho refresh và logout

Sau login, register hoặc refresh, backend tạo:

```text
csrf_token = Base64Url(HMAC-SHA256(jwtSecret, refreshToken))
```

Cookie CSRF không có `HttpOnly` để frontend có thể đọc:

```text
csrf_token=<signed-value>;
Secure;
SameSite=Strict;
Path=/api/v1/auth
```

Khi gọi refresh hoặc logout, frontend phải gửi đồng thời:

- Cookie `refresh_token` do trình duyệt tự gắn.
- Cookie `csrf_token` do trình duyệt tự gắn.
- Header `X-CSRF-Token` có giá trị đọc từ cookie `csrf_token`.

Backend tự tính lại HMAC từ refresh token và so sánh constant-time với cả cookie lẫn header. Thiếu hoặc sai một trong ba giá trị sẽ trả `403 Forbidden`.

## 5. Các role

| Role | Mục đích |
|---|---|
| `CLIENT` | Khách hàng tạo và quản lý công việc đánh giá. |
| `FREELANCER` | Người thực hiện công việc đánh giá. |
| `ADMIN` | Quản trị cấu hình và dữ liệu quản trị hệ thống. |

Role trong JWT được đọc từ claim `roles` và chuyển thành Spring Authority:

```text
CLIENT     -> ROLE_CLIENT
FREELANCER -> ROLE_FREELANCER
ADMIN      -> ROLE_ADMIN
```

Không cho phép tạo tài khoản `ADMIN` qua API register công khai. Admin được bootstrap bằng cấu hình môi trường.

## 6. Ma trận phân quyền API hiện tại

| API | Public | CLIENT | FREELANCER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| `POST /api/v1/auth/register` | Có | Có | Có | Có |
| `POST /api/v1/auth/login` | Có | Có | Có | Có |
| `POST /api/v1/auth/refresh` | Có, nhưng cần refresh + CSRF cookie/header | Có | Có | Có |
| `POST /api/v1/auth/logout` | Có, nhưng phiên có token phải qua CSRF validation | Có | Có | Có |
| `POST /api/v1/auth/forgot-password` | Có | Có | Có | Có |
| `POST /api/v1/auth/reset-password` | Có | Có | Có | Có |
| `GET /api/v1/required-levels/**` | Không | Có | Có | Có |
| `POST/PUT/DELETE /api/v1/required-levels/**` | Không | Không | Không | Có |
| `POST /api/v1/jobs` | Không | Có | Không | Không |
| `GET /api/v1/jobs/**` | Không | Có | Không | Không |
| `/api/v1/admin/**` | Không | Không | Không | Có |
| API khác không khai báo riêng | Không | Có nếu đã xác thực | Có nếu đã xác thực | Có nếu đã xác thực |

Các endpoint quan trọng được bảo vệ hai lớp:

- Rule URL trong `SecurityFilterChain`.
- `@PreAuthorize` tại controller.

## 7. Hợp đồng API authentication

Base path: `/api/v1/auth`.

### 7.1. Đăng ký

```http
POST /api/v1/auth/register
Content-Type: application/json
```

Request:

```json
{
  "fullName": "Nguyen Van A",
  "email": "client@example.com",
  "password": "mat-khau-toi-thieu-12-ky-tu",
  "role": "CLIENT"
}
```

Role được chấp nhận qua API công khai: `CLIENT`, `FREELANCER`. Giá trị nhập sai cũ `FRELANCER` cũng được chuẩn hóa thành `FREELANCER`. `ADMIN` bị từ chối.

Kết quả thành công:

- HTTP `201 Created`.
- Response body chứa access token.
- Response headers tạo `refresh_token` và `csrf_token` cookie.

Response mẫu:

```json
{
  "message": "Register successfully",
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "email": "client@example.com"
  }
}
```

### 7.2. Đăng nhập

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "client@example.com",
  "password": "mat-khau-toi-thieu-12-ky-tu"
}
```

Thành công trả access token trong body và hai cookie giống luồng register.

Email được trim và chuyển về chữ thường. Nếu email không tồn tại hoặc password sai, backend cùng trả:

```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

Backend vẫn thực hiện BCrypt với dummy hash khi email không tồn tại để giảm chênh lệch thời gian phản hồi và hạn chế dò tài khoản.

### 7.3. Gọi API cần đăng nhập

```http
POST /api/v1/jobs
Authorization: Bearer <access-token>
Content-Type: application/json
```

Không gửi password, refresh token hoặc email chủ sở hữu trong request nghiệp vụ. Danh tính được lấy từ JWT đã xác thực.

### 7.4. Refresh access token

```http
POST /api/v1/auth/refresh
Cookie: refresh_token=<raw-token>; csrf_token=<signed-token>
X-CSRF-Token: <signed-token>
```

Request không cần body.

Khi thành công:

1. Backend khóa và tìm hash của refresh token trong database.
2. Kiểm tra token chưa dùng, chưa bị thu hồi, chưa hết hạn và family chưa hết hạn.
3. Đánh dấu token hiện tại đã dùng và đã thu hồi.
4. Tạo refresh token thay thế trong cùng family.
5. Tạo access token mới.
6. Ghi đè cả refresh cookie và CSRF cookie.

Frontend bắt buộc cập nhật trạng thái theo response/cookie mới và không được tái sử dụng refresh token cũ.

Nếu một refresh token đã dùng hoặc đã thu hồi bị gửi lại, backend thu hồi toàn bộ family. Đây là cơ chế phát hiện token bị sao chép. Token mới nhất trong family đó cũng không dùng được nữa và người dùng phải đăng nhập lại.

### 7.5. Logout

```http
POST /api/v1/auth/logout
Cookie: refresh_token=<raw-token>; csrf_token=<signed-token>
X-CSRF-Token: <signed-token>
```

Backend:

- Thu hồi toàn bộ family của refresh token hiện tại.
- Xóa cookie refresh và CSRF bằng `Max-Age=0`.
- Trả thông báo `Logout successfully`.

Access token đã phát hành không được lưu blacklist và có thể còn hợp lệ đến khi hết hạn, tối đa mặc định 15 phút. Frontend phải xóa access token khỏi bộ nhớ ngay sau logout.

### 7.6. Quên mật khẩu

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "client@example.com"
}
```

Backend luôn trả cùng một nội dung dù email có tồn tại hay không:

```json
{
  "message": "If the email exists, a password reset OTP has been sent"
}
```

Nếu user tồn tại:

1. Token reset cũ của user bị xóa.
2. Backend tạo OTP 6 chữ số bằng `SecureRandom`.
3. Database chỉ lưu `HMAC-SHA256(pepper, normalizedEmail + ':' + otp)`.
4. OTP được gửi email bất đồng bộ.
5. OTP mặc định hết hạn sau 15 phút.

Backend duy trì thời gian phản hồi tối thiểu mặc định 300 ms nhằm giảm khả năng suy đoán email tồn tại qua timing.

### 7.7. Reset mật khẩu

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "client@example.com",
  "otp": "123456",
  "newPassword": "mat-khau-moi-toi-thieu-12-ky-tu"
}
```

Điều kiện:

- OTP gồm đúng 6 chữ số.
- Mật khẩu mới từ 12 đến 64 ký tự.
- OTP chưa dùng, chưa hết hạn và chưa nhập sai 5 lần.

Khi thành công:

1. Password mới được băm bằng BCrypt.
2. `authVersion` của user tăng lên 1.
3. OTP được đánh dấu đã sử dụng.
4. Toàn bộ refresh token của user bị thu hồi.
5. Email thông báo đổi mật khẩu được gửi bất đồng bộ.

Việc tăng `authVersion` khiến mọi access token cũ bị từ chối ngay ở request tiếp theo.

## 8. Rate limit

| Thao tác | Khóa giới hạn | Giới hạn |
|---|---|---:|
| Register | IP | 10 lần/giờ |
| Login | IP | 20 lần/15 phút |
| Login | Email chuẩn hóa | 8 lần/15 phút |
| Refresh | IP | 60 lần/15 phút |
| Forgot password | IP | 20 lần/giờ |
| Forgot password | Email chuẩn hóa | 3 lần/giờ |
| Reset password | IP | 30 lần/15 phút |
| Reset password | Email chuẩn hóa | 10 lần/15 phút |

Vượt giới hạn trả `429 Too Many Requests`.

Rate limiter hiện lưu trong memory của từng application instance. Nếu triển khai nhiều instance, cần chuyển sang Redis hoặc rate limit tập trung tại API Gateway/Ingress.

Lưu ý: IP hiện lấy từ `HttpServletRequest.getRemoteAddr()`. Khi chạy sau reverse proxy, chỉ cấu hình xử lý forwarded header từ proxy đáng tin cậy; không tin trực tiếp `X-Forwarded-For` do client tự gửi.

## 9. CORS

Các origin frontend hợp lệ được khai báo bằng `CORS_ALLOWED_ORIGINS`, phân tách bằng dấu phẩy:

```env
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

Cấu hình hiện tại:

- Cho phép method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- Cho phép header: `Authorization`, `Content-Type`, `X-CSRF-Token`.
- Cho phép credentials để trình duyệt gửi cookie.
- Không sử dụng wildcard origin.

Origin phải khớp chính xác protocol, hostname và port.

## 10. Cách frontend lưu và sử dụng token

### 10.1. Nguyên tắc

- Access token: lưu trong memory của ứng dụng frontend.
- Không lưu access token trong `localStorage` nếu không thực sự cần thiết.
- Refresh token: frontend không đọc và không lưu; trình duyệt quản lý cookie `HttpOnly`.
- CSRF token: đọc từ cookie `csrf_token` chỉ khi gọi refresh/logout.
- Mọi request auth dùng `credentials: "include"` để nhận/gửi cookie.

### 10.2. Ví dụ JavaScript

```javascript
let accessToken = null;

async function login(email, password) {
  const response = await fetch("https://api.example.com/api/v1/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) throw await response.json();
  const result = await response.json();
  accessToken = result.accessToken;
  return result;
}

async function callProtectedApi(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`
    }
  });
  return response;
}

function readCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie
    .split("; ")
    .find(cookie => cookie.startsWith(prefix));
  return item ? decodeURIComponent(item.substring(prefix.length)) : null;
}

async function refreshAccessToken() {
  const csrfToken = readCookie("csrf_token");
  const response = await fetch("https://api.example.com/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken ?? "" }
  });

  if (!response.ok) {
    accessToken = null;
    throw await response.json();
  }

  const result = await response.json();
  accessToken = result.accessToken;
  return result;
}

async function logout() {
  const csrfToken = readCookie("csrf_token");
  try {
    await fetch("https://api.example.com/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken ?? "" }
    });
  } finally {
    accessToken = null;
  }
}
```

### 10.3. Xử lý `401`

Frontend nên bảo đảm tại một thời điểm chỉ có một request refresh đang chạy:

```text
API trả 401 do access token hết hạn
    -> nếu chưa refresh: bắt đầu refresh
    -> các request khác chờ cùng một Promise
    -> refresh thành công: cập nhật access token và retry mỗi request một lần
    -> refresh thất bại: xóa trạng thái đăng nhập và chuyển về trang login
```

Không retry refresh vô hạn. Không dùng nhiều request refresh song song vì refresh token chỉ được dùng một lần; request thứ hai có thể bị xem là reuse và làm thu hồi cả family.

## 11. HTTP status và lỗi

Error body có dạng:

```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

| HTTP status | Trường hợp |
|---:|---|
| `400 Bad Request` | JSON/validation sai, role không hợp lệ, OTP sai hoặc hết hạn. |
| `401 Unauthorized` | Sai thông tin đăng nhập, access token không hợp lệ/hết hạn, refresh token không hợp lệ. |
| `403 Forbidden` | Đã xác thực nhưng sai role, hoặc CSRF token thiếu/sai. |
| `409 Conflict` | Email đã tồn tại. |
| `429 Too Many Requests` | Vượt rate limit. |

Đối với lỗi do Spring Security chặn trước controller, response có thể không cùng cấu trúc với `ErrorResponse` của application nếu chưa cấu hình custom `AuthenticationEntryPoint` và `AccessDeniedHandler`.

## 12. Biến môi trường

### 12.1. Bắt buộc

```env
DB_PASSWORD=database-password
JWT_SECRET=secret-ngau-nhien-toi-thieu-32-byte
PASSWORD_RESET_OTP_PEPPER=pepper-rieng-ngau-nhien-toi-thieu-32-byte
```

`JWT_SECRET` và `PASSWORD_RESET_OTP_PEPPER` phải là hai secret độc lập, không commit vào Git và nên được cấp qua secret manager.

### 12.2. Cấu hình liên quan

```env
JWT_ISSUER=review-shop-backend
JWT_AUDIENCE=review-shop-api
JWT_ACCESS_TOKEN_TTL_MINUTES=15
JWT_REFRESH_TOKEN_TTL_DAYS=30
JWT_REFRESH_TOKEN_CLEANUP_CRON=0 0 3 * * *
JWT_REFRESH_COOKIE_NAME=refresh_token
JWT_REFRESH_COOKIE_SECURE=true
JWT_CSRF_COOKIE_NAME=csrf_token
CORS_ALLOWED_ORIGINS=https://app.example.com

PASSWORD_RESET_OTP_TTL_MINUTES=5
PASSWORD_RESET_MINIMUM_RESPONSE_MILLIS=300

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin-password-toi-thieu-12-ky-tu
ADMIN_FULL_NAME=Platform Admin
```

Production phải giữ `JWT_REFRESH_COOKIE_SECURE=true` và phục vụ API qua HTTPS.

## 13. Vòng đời và thu hồi token

| Sự kiện | Access token cũ | Refresh token |
|---|---|---|
| Login/Register | Không áp dụng | Tạo family mới. |
| Refresh hợp lệ | Access token cũ còn hiệu lực đến `exp` | Token cũ bị thu hồi, token mới cùng family được tạo. |
| Reuse refresh token cũ | Không bị ảnh hưởng trực tiếp | Toàn bộ family bị thu hồi. |
| Logout | Còn hiệu lực đến `exp` | Toàn bộ family hiện tại bị thu hồi. |
| Reset password | Vô hiệu ngay do `authVersion` tăng | Tất cả refresh token của user bị thu hồi. |
| Access token hết hạn | Bị từ chối | Có thể dùng refresh token hợp lệ để cấp token mới. |
| Family hết hạn | Không bị ảnh hưởng trực tiếp | Không thể refresh, phải login lại. |

Refresh token hết hạn được dọn định kỳ, mặc định lúc 03:00 hằng ngày.

## 14. Checklist triển khai production

- Sử dụng HTTPS toàn bộ đường truyền.
- Giữ refresh cookie ở chế độ `Secure`.
- Cấu hình allowlist CORS chính xác, không dùng `*` với credentials.
- Sinh secret đủ mạnh bằng nguồn ngẫu nhiên mật mã và lưu trong secret manager.
- Không ghi access token, refresh token, password hoặc OTP vào log.
- Không trả token trong URL/query string.
- Đảm bảo mail server hoạt động và giám sát lỗi gửi email.
- Dùng Flyway hoặc Liquibase thay cho `ddl-auto=update`.
- Chuyển rate limiter sang Redis/API Gateway khi chạy nhiều instance.
- Thiết lập trusted proxy đúng cách trước khi dùng IP cho rate limit/audit.
- Cân nhắc cơ chế xoay signing key hoặc khóa bất đối xứng khi có nhiều service.
- Cấu hình backup, audit log và cảnh báo cho hành vi đăng nhập/reset bất thường.
- Không cho phép frontend gửi hoặc tự quyết định owner/role cho các thao tác nghiệp vụ nhạy cảm.

## 15. Giới hạn kiến trúc hiện tại

- JWT dùng shared symmetric secret (`HS256`), chưa hỗ trợ key rotation hay `kid`.
- JWT validator đọc database ở mỗi request để kiểm tra `authVersion`; bảo mật thu hồi tốt nhưng tăng tải database.
- Logout không blacklist access token hiện tại; độ trễ thu hồi tối đa bằng access-token TTL.
- Rate limit chỉ có hiệu lực trong từng process.
- Role được nhúng trong JWT. Nếu đổi role mà không tăng `authVersion`, token cũ giữ quyền cũ đến khi hết hạn. Khi cập nhật role cần đồng thời tăng `authVersion` và thu hồi refresh token của user.
- Chưa có MFA/2FA cho tài khoản quản trị.

Với kiến trúc monolith hiện tại, cơ chế này phù hợp nếu triển khai đúng HTTPS, secret, CORS và database. Khi hệ thống phát triển thành nhiều service, có nhiều ứng dụng client hoặc cần SSO/MFA tập trung, nên cân nhắc Keycloak hoặc một OpenID Connect provider tương đương.

## 16. Các file implementation chính

| Thành phần | File |
|---|---|
| Security filter chain, JWT decoder, CORS | `src/main/java/com/example/reviewshopbackend/config/SecurityConfig.java` |
| Auth REST API và cookie | `src/main/java/com/example/reviewshopbackend/controller/AuthController.java` |
| Register/login/reset flow | `src/main/java/com/example/reviewshopbackend/service/impl/AuthServiceImpl.java` |
| Phát hành access JWT | `src/main/java/com/example/reviewshopbackend/service/impl/JwtTokenServiceImpl.java` |
| Rotation và thu hồi refresh token | `src/main/java/com/example/reviewshopbackend/service/impl/RefreshTokenServiceImpl.java` |
| Kiểm tra user và `authVersion` | `src/main/java/com/example/reviewshopbackend/security/JwtUserValidator.java` |
| CSRF cho refresh/logout | `src/main/java/com/example/reviewshopbackend/security/RefreshCsrfService.java` |
| Rate limit authentication | `src/main/java/com/example/reviewshopbackend/security/AuthRateLimiter.java` |
| Exception mapping | `src/main/java/com/example/reviewshopbackend/exception/AuthExceptionHandler.java` |
| Integration test | `src/test/java/com/example/reviewshopbackend/JwtAuthenticationIntegrationTest.java` |
