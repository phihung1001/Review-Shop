# Kiến trúc hệ thống — Review Shop Backend

## 1. Mục đích

Tài liệu này mô tả kiến trúc đang được triển khai trong code tại ngày **28/07/2026**, gồm:

- Ranh giới hệ thống và các thành phần bên ngoài.
- Cấu trúc package và trách nhiệm của từng lớp.
- Luồng xử lý authentication, tạo Job và xử lý proof.
- Mô hình dữ liệu, transaction và cơ chế chống race condition.
- Cấu hình, kiểm thử và cách triển khai hiện tại.
- Các giới hạn và hướng phát triển kiến trúc.

Yêu cầu nghiệp vụ và trạng thái đã/chưa thực hiện được theo dõi tại [PRODUCT.md](PRODUCT.md). Chi tiết từng luồng nằm trong các tài liệu flow tương ứng.

## 2. Tổng quan kiến trúc

Review Shop Backend hiện là một **modular monolith** xây dựng bằng Spring Boot. Toàn bộ authentication, Job, proof và cấu hình Admin chạy trong cùng một application process và dùng chung một MySQL database.

```text
┌──────────────────────┐
│ Web/Mobile Frontend  │
└──────────┬───────────┘
           │ HTTPS + JSON
           │ Bearer JWT / Auth cookies
           ▼
┌────────────────────────────────────────────────────────┐
│                Review Shop Backend                     │
│                                                        │
│  Security Filter Chain                                 │
│       │                                                │
│       ▼                                                │
│  Controller → Service → Repository → JPA/Hibernate    │
│       │           │                                    │
│       │           ├── Validation / business rules      │
│       │           ├── Transaction / locking            │
│       │           └── Email service                    │
│       │                                                │
│       └── DTO request/response                          │
└──────────────┬──────────────────────┬──────────────────┘
               │ JDBC                 │ SMTP
               ▼                      ▼
       ┌──────────────┐       ┌────────────────┐
       │    MySQL     │       │  Mail Server   │
       └──────────────┘       └────────────────┘
```

Các đặc điểm chính:

- REST API, dữ liệu JSON.
- Stateless authentication cho API nghiệp vụ bằng JWT.
- Refresh token và OTP reset password được lưu trong database.
- Spring Data JPA/Hibernate truy cập MySQL.
- Transaction được đặt tại application service.
- Pessimistic locking bảo vệ luồng giữ slot và xử lý proof.
- Chưa có cache, message broker, object storage, payment gateway hoặc service tách riêng trong luồng đang hoạt động.

## 3. Bối cảnh hệ thống

| Thành phần | Vai trò | Trạng thái |
| --- | --- | --- |
| Frontend | Gọi REST API, giữ access token trong memory và gửi auth cookie | Nằm ngoài repository này |
| Review Shop Backend | Authentication, authorization và nghiệp vụ Job/Proof/Admin | Đã triển khai |
| MySQL | Lưu user, token, cấu hình, Job và proof | Đã tích hợp |
| SMTP server | Gửi OTP reset password và thông báo đổi mật khẩu | Đã tích hợp qua Spring Mail |
| Object storage | Lưu ảnh proof | Đã tích hợp Cloudflare R2 bằng presigned PUT/GET URL |
| Payment gateway | Nạp/rút/chuyển tiền thật | Chưa tích hợp |
| Redis | Distributed rate limit/cache/lock | Chưa tích hợp |
| Kafka | Xử lý event bất đồng bộ | Có dependency nhưng chưa có producer/consumer trong code hiện tại |

## 4. Công nghệ

| Nhóm | Công nghệ |
| --- | --- |
| Runtime | Java 21 |
| Framework | Spring Boot 4.1.0 |
| Web | Spring Web MVC |
| Security | Spring Security, OAuth2 Resource Server, JWT HS256 |
| Persistence | Spring Data JPA, Hibernate |
| Database | MySQL; H2 MySQL mode cho test |
| Validation | Jakarta Bean Validation, custom validators |
| Email | Spring Mail |
| Build | Maven Wrapper |
| Test | JUnit 5, Spring Boot Test, MockMvc, Spring Security Test |
| Boilerplate | Lombok |

`spring-boot-starter-kafka` và `spring-boot-starter-restclient` đang có trong `pom.xml`, nhưng chưa được sử dụng bởi implementation hiện tại.

## 5. Cấu trúc source code

```text
com.example.reviewshopbackend
├── config/       Cấu hình Security và bootstrap Admin
├── controller/   REST endpoint, HTTP status và lấy Principal
├── dto/
│   ├── request/  Input contract và Bean Validation
│   └── response/ Output contract, không trả JPA entity trực tiếp
├── entity/       JPA entity, enum và JSON value object
├── exception/    Domain/application exception và HTTP exception mapping
├── repository/   Spring Data repository và query có lock
├── security/     Rate limiter, JWT user validation và refresh CSRF
├── service/      Interface application service
├── service/impl/ Business logic và transaction boundary
└── validator/    Validation chuyên biệt cho auth và Job
```

### 5.1. Controller

Controller chịu trách nhiệm:

- Khai báo route và HTTP method.
- Validate request bằng `@Valid`.
- Phân quyền coarse-grained bằng `@PreAuthorize`.
- Lấy email user đã xác thực từ `Principal.getName()`.
- Chuyển việc xử lý nghiệp vụ cho service.

Controller không trực tiếp truy cập repository và không tự cập nhật entity.

### 5.2. Service

Service là application layer và là transaction boundary chính:

- `AuthService`: register, login, refresh, logout, forgot/reset password.
- `JwtTokenService`: phát access token.
- `RefreshTokenService`: phát, rotate, revoke và dọn refresh token.
- `JobService`: tạo Job và snapshot ngân sách/phí.
- `JobProofService`: danh sách Job, submit, approve/reject và danh sách proof.
- `RequiredLevelService`: CRUD Required Level.
- `PlatformSettingsService`: đọc/tạo/cập nhật platform fee singleton.
- `EmailService`: gửi email authentication.

Business rule liên quan nhiều entity được đặt trong service implementation và chạy trong một transaction.

### 5.3. Repository

Repository dùng Spring Data JPA. Query đặc biệt hiện có:

- Khóa Job theo ID bằng `PESSIMISTIC_WRITE`.
- Khóa JobProof theo ID bằng `PESSIMISTIC_WRITE`.
- Tìm Job `OPEN` còn slot theo thời gian tạo giảm dần.
- Kiểm tra Freelancer hoặc review content đã giữ Job hay chưa.
- Thu hồi refresh token theo family hoặc user.

### 5.4. DTO và entity

API nhận/trả DTO, không serialize JPA entity trực tiếp. Mapping response hiện được thực hiện qua các factory method dạng `Response.from(entity)`.

Một số cấu trúc được lưu dưới dạng JSON trong MySQL:

- `Job.reviewContents`.
- `JobProof.proofImages`.

## 6. Module nghiệp vụ

Kiến trúc chưa tách thành Maven module riêng, nhưng có thể nhìn theo các module logic sau:

| Module logic | Thành phần chính | Dữ liệu sở hữu |
| --- | --- | --- |
| Identity & Access | Auth controller/service, JWT, refresh token, CSRF, rate limiter | `users`, `refresh_tokens`, `password_reset_tokens` |
| Job Management | Job controller/service/validator | `jobs` |
| Assignment & Proof Workflow | JobAssignment/Proof controllers và services | `job_assignments`, `job_proofs`, cập nhật `jobs` và `users.balance` |
| Admin Configuration | Required Level và Platform Settings services/controllers | `required_levels`, `platform_settings` |

Các module đang dùng chung entity và transaction trong cùng process. Proof Workflow phụ thuộc trực tiếp vào Job và User, vì vậy chưa thể tách microservice mà không thiết kế lại transaction và ownership dữ liệu.

## 7. Luồng request chung

```text
HTTP request
    │
    ▼
CORS + Spring Security Filter Chain
    │
    ├── Public route: đi tiếp không cần JWT
    │
    └── Protected route:
          decode JWT
          validate signature / exp / iss / aud
          validate user + authVersion
          convert roles → ROLE_*
    │
    ▼
Controller + @PreAuthorize
    │
    ▼
Request validation
    │
    ▼
Transactional service
    │
    ▼
Repository / MySQL
    │
    ▼
DTO response hoặc ErrorResponse
```

Authorization được thực hiện nhiều lớp:

1. Route rule trong `SecurityFilterChain`.
2. Method rule bằng `@PreAuthorize`.
3. Kiểm tra role và ownership trong service đối với dữ liệu cụ thể.

Frontend không được quyết định user ID hoặc role. Danh tính luôn được lấy từ JWT đã xác thực và đối chiếu lại database.

## 8. Kiến trúc authentication

### 8.1. Login/Register

```text
Client
  │ email + password
  ▼
AuthController
  ├── rate limit IP/email
  ▼
AuthService
  ├── normalize email
  ├── BCrypt verify/hash password
  ├── issue access JWT
  └── issue refresh token family
  ▼
Response
  ├── body: access token
  ├── HttpOnly cookie: refresh_token
  └── readable cookie: csrf_token
```

Access token chứa `sub=email`, `userId`, `roles` và `authVersion`. JWT được xác minh chữ ký HS256, issuer, audience, expiry và trạng thái user trong database.

### 8.2. Refresh token

Refresh token là chuỗi random 32 byte, không phải JWT. Database chỉ lưu SHA-256 hash.

```text
refresh_token cookie + csrf_token cookie + X-CSRF-Token header
                    │
                    ▼
             Validate CSRF HMAC
                    │
                    ▼
        Lock refresh token trong database
                    │
        ┌───────────┴────────────┐
        │ hợp lệ                 │ đã dùng/revoked/expired
        ▼                        ▼
  revoke token cũ          revoke toàn family
  issue token mới          trả lỗi 401
  issue access JWT
```

Rotation giữ nguyên thời hạn tuyệt đối của token family, không kéo dài phiên vô hạn.

### 8.3. Reset password

OTP 6 số được HMAC với pepper trước khi lưu. Khi reset thành công:

- Password được BCrypt hash lại.
- `authVersion` tăng để access token cũ mất hiệu lực.
- Toàn bộ refresh token của user bị revoke.
- OTP bị đánh dấu đã dùng.

Chi tiết bảo mật và frontend integration nằm trong [AUTHENTICATION_AUTHORIZATION.md](AUTHENTICATION_AUTHORIZATION.md).

## 9. Kiến trúc luồng Job

```text
POST /api/v1/jobs
      │
      ▼
Security: ROLE_CLIENT
      │
      ▼
Idempotency-Key + Bean Validation
  ├── title/description/mapLink
  ├── positive price/slots
  └── Google Maps URL allowlist
      │
      ▼
JobValidator
  ├── Client tồn tại và đúng role
  ├── Required Level tồn tại
  └── price >= Required Level price
      │
      ▼
JobService transaction
  ├── khóa Client và kiểm tra key/fingerprint
  ├── retry cùng payload → trả Job cũ
  ├── đọc/tạo PlatformSettings
  ├── tính và snapshot fee/budget
  ├── khởi tạo slot
  ├── tạo Job status = OPEN
  └── available -= totalBudget; held += totalBudget
      │
      ▼
jobs table
```

Job snapshot `platformFeeRate`, `platformFeeAmount`, `freelancerBudget` và `pricePerTask`. Thay đổi fee hoặc giá Required Level sau đó không làm thay đổi Job đã tạo.

Tạo Job và giữ toàn bộ `totalBudget` chạy trong cùng transaction. Nếu số dư không đủ, Job và ledger
entry cùng rollback. `(client_id, idempotency_key)` là unique; request fingerprint ngăn một key được
dùng cho payload khác. Số tiền giữ hiện tổng hợp trong `AccountBalance.heldAmount`, chưa có
reservation tách riêng theo từng Job.

## 10. Kiến trúc luồng Proof

### 10.1. Claim Job

```text
POST /api/v1/freelancer/jobs/{jobId}/assignments
                 │
                 ▼
       Lock Job PESSIMISTIC_WRITE
                 │
       ├── Job OPEN và còn slot
       ├── Freelancer chưa có assignment active
       ├── review content chưa occupied
       └── Google Maps account thuộc owner, active và đủ rank
                 │
                 ▼
       Create assignment CLAIMED
       expiresAt = now + 10 phút
       availableSlots -= 1
```

Transaction kết thúc ngay sau khi tạo assignment. Database lock không được giữ trong thời gian Freelancer làm việc. Scheduler chạy mỗi phút chuyển claim quá hạn sang `EXPIRED` và trả slot. Freelancer cũng có thể cancel claim để trả slot sớm.

### 10.2. Submit proof

```text
POST /api/v1/freelancer/jobs/{jobId}/proofs
                 │
                 ▼
          Require FREELANCER
                 │
                 ▼
       Lock Assignment rồi Job
                 │
       ├── Assignment thuộc Freelancer và Job
       ├── status = CLAIMED
       └── chưa hết hạn
                 │
                 ▼
       Create proof PENDING
       Snapshot payoutAmount
       Assignment → SUBMITTED
```

Submit không trừ slot lần hai vì slot đã được giữ khi claim. Assignment `CLAIMED`, `SUBMITTED`, `APPROVED` được coi là occupied. `EXPIRED`, `CANCELLED`, `REJECTED` không giữ slot/content.

### 10.3. Approve/Reject

```text
Client request
     │
     ▼
Lock Proof PESSIMISTIC_WRITE
     │
     ├── Client sở hữu Job
     └── Proof đang PENDING
     │
     ▼
Lock Job PESSIMISTIC_WRITE
     │
     ├── APPROVE
     │     proof → APPROVED
     │     completedSlots += 1
     │     remainingBudget -= payout
     │     Client held -= payout
     │     Freelancer available += payout
     │     đủ slot → COMPLETED
     │
     └── REJECT
           proof → REJECTED
           lưu rejectionReason
           availableSlots += 1
           Job → OPEN
```

Proof chỉ được chuyển từ `PENDING` một lần. Request lặp lại bị từ chối, nhờ đó không cộng balance lần hai trong flow hiện tại.

Chi tiết nghiệp vụ nằm trong [CLIENT_JOB_CREATION_FLOW.md](CLIENT_JOB_CREATION_FLOW.md) và [FREELANCER_JOB_PROOF_FLOW.md](FREELANCER_JOB_PROOF_FLOW.md).

## 11. Mô hình dữ liệu

```text
users
  1 ───────< jobs                    required_levels
  │           >────── 1                    1
  │             client                     │
  │                                        │
  │                         jobs >──────────┘
  │
  ├──< refresh_tokens
  ├──< password_reset_tokens
  ├──< google_maps_accounts
  ├──< account_balances ──< account_transactions
  ├──< deposit_orders
  │
  ├──< job_assignments >──── jobs
  │          │
  └──< job_proofs >──────── jobs
             └── assignment (1:1)
         freelancer           job

platform_settings
  singleton row (id = 1)

jobs (client_id, idempotency_key unique)
```

### 11.1. Entity chính

| Entity | Trách nhiệm |
| --- | --- |
| `User` | Danh tính, role, password hash và auth version |
| `RefreshToken` | Hash token, family, expiry, used/revoked timestamp |
| `PasswordResetToken` | Hash OTP, expiry, used timestamp và failed attempts |
| `RequiredLevel` | Mô tả, Local Guide rank và giá review tối thiểu |
| `PlatformSettings` | Platform fee singleton và người cập nhật |
| `Job` | Nội dung Job, owner, Required Level, slot, fee, budget và trạng thái |
| `JobAssignment` | Lượt giữ slot/content có TTL và vòng đời claim/submit/review |
| `JobProof` | Bằng chứng, Freelancer, payout snapshot và trạng thái duyệt |
| `GoogleMapsAccount` | Contributor đã xác minh, level, loại và trạng thái sẵn sàng |
| `AccountBalance` | Snapshot `available`/`held` theo account/currency |
| `AccountTransaction` | Ledger entry bất biến và idempotency key |
| `DepositOrder` | Yêu cầu nạp tiền `PENDING/SUCCEEDED/FAILED` |

### 11.2. Lock/version

- Các aggregate ghi chính có `@Version`; luồng tài chính/slot còn dùng khóa bi quan tại điểm cập nhật.
- Các luồng slot/proof quan trọng còn dùng `PESSIMISTIC_WRITE` để tuần tự hóa thao tác.
- Refresh token được khóa khi rotate.

### 11.3. Hạn chế schema hiện tại

- Flyway `V1` tạo đầy đủ schema và `V2` bảo vệ assignment active; Hibernate chỉ validate schema.
- Ledger và số dư đã có, nhưng tiền `held` chưa tách reservation theo từng Job.
- Level eligibility dựa trên Google Maps account được xác minh, chưa có level trực tiếp trên hồ sơ Freelancer.
- Chưa có unique constraint có điều kiện bảo vệ proof occupied theo Job/Freelancer hoặc Job/content.
- JSON columns làm model linh hoạt nhưng khó query/index từng phần tử.

## 12. Transaction và consistency

| Use case | Transaction | Lock chính | Dữ liệu thay đổi |
| --- | --- | --- | --- |
| Register | Read/write | Unique email ở DB | User, refresh token |
| Refresh token | Read/write | Refresh token pessimistic lock | Token cũ, token mới |
| Reset password | Read/write | Chưa có explicit lock trên OTP/User | User, OTP, refresh tokens |
| Tạo Job | Read/write | Client rồi AccountBalance pessimistic lock | Job, AccountBalance và AccountTransaction |
| Claim Job | Read/write | Job pessimistic lock | Job và Assignment |
| Submit proof | Read/write | Assignment rồi Job pessimistic lock | Assignment và Proof |
| Duyệt proof | Đọc/ghi | Khóa bi quan trên Proof, Job và bảng số dư | Proof, Job, bảng số dư, sổ giao dịch bất biến |
| Reject proof | Read/write | Proof rồi Job pessimistic lock | Proof, Assignment và Job |

Nguyên tắc lock order cho proof review là **Proof → Job → Client account → Freelancer/Platform account**.
Submit khóa Assignment rồi Job. Khi mở rộng luồng, cần giữ thứ tự lock thống nhất để giảm nguy cơ deadlock.

Các invariant hiện được bảo vệ:

```text
availableSlots >= 0
completedSlots <= totalReviews
remainingFreelancerBudget >= 0
proof chỉ được approve/reject từ PENDING
Job COMPLETED không nhận thêm proof
```

Một số invariant mới chỉ được bảo vệ ở application layer và chưa có reservation theo từng Job. Vì
vậy kiến trúc hiện tại phù hợp MVP kỹ thuật nhưng chưa đủ cho thanh toán tiền thật.

## 13. Error handling

`AuthExceptionHandler` ánh xạ validation, authentication, authorization, not-found và conflict exception sang HTTP response DTO.

Mục tiêu response lỗi:

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Only pending proof can be reviewed"
}
```

Hạn chế hiện tại:

- Chưa có error code ổn định, độc lập với message.
- Response lỗi hiện chưa có `path`, `timestamp` hoặc correlation ID.
- Một số domain case như Job không tồn tại đang trả `400` thay vì `404`.
- Chưa có observability tập trung cho exception.

## 14. Cấu hình runtime

Ứng dụng đọc biến môi trường thông qua `application.properties` và optional `.env`.

### Database

```env
DB_URL=jdbc:mysql://localhost:3306/review-shop-dev
DB_USERNAME=root
DB_PASSWORD=change-me
JPA_DDL_AUTO=update
```

### JWT và password reset

```env
JWT_SECRET=at-least-32-bytes
JWT_ISSUER=review-shop-backend
JWT_AUDIENCE=review-shop-api
PASSWORD_RESET_OTP_PEPPER=at-least-32-bytes
```

### Platform, Admin, CORS và mail

```env
PLATFORM_DEFAULT_FEE_RATE=0.5000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-admin-password
CORS_ALLOWED_ORIGINS=https://app.example.com
MAIL_HOST=smtp.example.com
```

Secret không được commit. `.env.example` chỉ nên chứa tên biến và giá trị minh họa không nhạy cảm.

## 15. Bootstrap và background work

### Admin bootstrap

`AdminBootstrapConfig` tạo tài khoản Admin từ biến môi trường nếu được cấu hình. Public register luôn từ chối role `ADMIN`.

### Scheduled cleanup

Refresh token hết hạn được dọn bằng scheduled task theo `JWT_REFRESH_TOKEN_CLEANUP_CRON`, mặc định chạy lúc 03:00 mỗi ngày.

### Email

Email reset password và thông báo đổi mật khẩu đi qua `EmailService`. SMTP là external dependency; production cần timeout, retry policy và quan sát lỗi gửi mail. Hiện chưa có durable queue/outbox để bảo đảm email được gửi sau khi transaction commit.

## 16. Kiểm thử

Test hiện dùng H2 in-memory với MySQL compatibility mode và Hibernate `create-drop`.

| Test | Phạm vi chính |
| --- | --- |
| `AuthServiceImplTest` | Nghiệp vụ auth service |
| `JwtAuthenticationIntegrationTest` | JWT và authorization |
| `RequiredLevelIntegrationTest` | Required Level API |
| `JobServiceImplTest` | Tính toán/validation Job service |
| `JobFlowIntegrationTest` | Luồng tạo Job |
| `FreelancerJobFlowIntegrationTest` | Submit, approve/reject và trạng thái Job/proof |
| `JobAssignmentIntegrationTest` | Claim/cancel/expire và invariant slot |
| `FinancialFlowIntegrationTest` | Deposit, giữ tiền, replay/conflict idempotency và rollback |
| `AccountBalanceConcurrencyIntegrationTest` | Cập nhật AccountBalance đồng thời không lost update |
| `JobCreationIdempotencyConcurrencyIntegrationTest` | Hai request cùng key chỉ tạo/giữ tiền một lần |
| `ActiveAssignmentConstraintIntegrationTest` | Áp dụng migration V1 và kiểm tra unique constraint assignment active |

Giới hạn của môi trường test:

- H2 không tái hiện đầy đủ locking, JSON type, index và transaction behavior của MySQL.
- Chưa có Testcontainers MySQL.
- Đã có test nhiều thread cho AccountBalance và tạo Job idempotent; chưa có test nhiều thread cho slot/payout trên MySQL.
- Chưa có contract, performance hoặc end-to-end test với SMTP/object storage.

Trước khi production nên thêm integration test chạy trên MySQL thật hoặc Testcontainers.

## 17. Triển khai hiện tại

Mô hình triển khai tối thiểu:

```text
Internet
   │
   ▼
Reverse Proxy / TLS termination
   │
   ▼
Spring Boot application (1 instance)
   ├── JDBC → MySQL
   └── SMTP → Mail provider
```

Các yêu cầu production:

- TLS ở reverse proxy/load balancer.
- `JWT_REFRESH_COOKIE_SECURE=true`.
- CORS allowlist chính xác.
- Secret từ secret manager hoặc environment bảo mật.
- Database backup, connection pool và timeout phù hợp.
- Không dùng `ddl-auto=update`; chuyển sang Flyway/Liquibase.
- Health/readiness check và graceful shutdown.
- Structured log, metric, trace và alert.

Nếu chạy nhiều application instance, rate limiter in-memory sẽ không còn chính xác. Cần Redis/API Gateway cho distributed rate limit và kiểm tra scheduled task để tránh nhiều instance dọn dữ liệu đồng thời không cần thiết.

## 18. Quyết định kiến trúc hiện tại

### ADR-001: Modular monolith cho MVP

**Quyết định:** giữ authentication và nghiệp vụ trong một Spring Boot application.

**Lý do:** miền nghiệp vụ còn thay đổi; các ca sử dụng proof cần transaction đồng bộ qua Job, Proof, bảng số dư và sổ giao dịch.

**Hệ quả:** triển khai đơn giản và transaction dễ quản lý; cần giữ ranh giới package/service rõ để tránh monolith khó bảo trì.

### ADR-002: JWT access token và opaque refresh token

**Quyết định:** API nghiệp vụ dùng Bearer JWT; refresh token là chuỗi random lưu hash trong database.

**Lý do:** request API không cần HTTP session, trong khi refresh token vẫn có thể rotate/revoke và phát hiện reuse.

**Hệ quả:** access token chỉ bị vô hiệu ngay khi `authVersion` thay đổi; logout thông thường không blacklist access token còn hạn.

### ADR-003: Snapshot fee và payout

**Quyết định:** Job snapshot platform fee; Proof snapshot payout khi submit.

**Lý do:** thay đổi cấu hình sau này không làm sai dữ liệu lịch sử.

**Hệ quả:** mọi thay đổi công thức chỉ áp dụng cho Job/Proof mới, trừ khi có migration nghiệp vụ rõ ràng.

### ADR-004: Pessimistic lock cho slot/proof

**Quyết định:** khóa Job khi submit và khóa Proof/Job khi review.

**Lý do:** ngăn hai request đồng thời lấy slot cuối hoặc xử lý proof hai lần.

**Hệ quả:** transaction phải ngắn; cần index tốt, lock order thống nhất và concurrency test trên MySQL.

### ADR-005: URL ảnh thay vì binary upload

**Quyết định:** proof mới lưu object key R2; binary upload trực tiếp bằng presigned URL. URL HTTPS cũ vẫn tương thích.

**Lý do:** tránh đưa binary vào database và giữ transaction trong thời gian upload.

**Hệ quả:** transaction database không chứa upload; frontend gửi đúng signed headers và bucket phải cấu hình CORS.

## 19. Rủi ro và technical debt

| Mức độ | Rủi ro | Hướng xử lý |
| --- | --- | --- |
| Cao | Chưa có adapter cổng thanh toán, rút tiền và đối soát | Hoàn thiện xác minh webhook, rút tiền và đối soát trước khi dùng tiền thật |
| Trung bình | Migration mới có thể lệch entity hoặc khác hành vi giữa H2/MySQL | Giữ `ddl-auto=validate`, test migration và bổ sung Testcontainers MySQL |
| Cao | Eligibility phụ thuộc SerpApi; verify còn đồng bộ và chưa chứng minh ownership | Tách provider interface, background verification, retry/circuit breaker, cache/re-verify, grace period và ownership challenge/admin review |
| Cao | Chưa có concurrency test trên MySQL | Dùng Testcontainers và test nhiều transaction |
| Trung bình | Rate limit in-memory | Chuyển Redis/API Gateway khi scale ngang |
| Trung bình | Email không có outbox/retry bền vững | Transactional outbox + worker/event delivery |
| Trung bình | Danh sách không phân trang | Dùng `Pageable`, filter và stable sort |
| Trung bình | Error contract chưa có code ổn định | Chuẩn hóa error code và correlation ID |
| Trung bình | Hard-delete Required Level | Dùng trạng thái active/deactivate và bảo vệ reference |
| Thấp | Dependency Kafka/RestClient chưa dùng | Xóa cho gọn hoặc chỉ thêm lại khi có use case |

## 20. Kiến trúc mục tiêu theo giai đoạn

### Giai đoạn 1 — hoàn thiện modular monolith

- Tách package theo feature (`auth`, `job`, `proof`, `admin`) nhưng vẫn chung application.
- Thêm migration, pagination, error code và MySQL integration test.
- Hoàn thiện pagination/filter và chính sách level/eligibility.
- Thêm object storage adapter.
- Bổ sung observability và production configuration.

### Giai đoạn 2 — tài chính an toàn

- Mở rộng ledger hiện tại với reservation theo từng Job và transaction group.
- Gia cố idempotency Deposit đồng thời và tích hợp webhook provider.
- Transactional outbox cho payment/email/event.
- Nhật ký kiểm toán và tác vụ đối soát.

### Giai đoạn 3 — scale khi có nhu cầu thực tế

- Redis cho distributed rate limit/cache.
- Tách worker xử lý email/notification.
- Chỉ tách microservice khi có ranh giới ownership dữ liệu và nhu cầu scale độc lập rõ ràng.
- Kafka chỉ được đưa vào luồng khi có event use case cụ thể và có outbox để tránh dual-write.

Không nên tách microservice sớm cho Job và Proof vì luồng hiện tại cần transaction nhất quán trên nhiều bảng trong cùng database.

## 21. Quy tắc khi thay đổi kiến trúc

- Controller không truy cập repository trực tiếp.
- Không trả JPA entity qua API.
- Transaction chứa database operation, không chứa upload file hoặc network call dài.
- Thao tác tiền phải có ledger và idempotency trước khi production.
- Thay đổi schema phải có migration tiến/lùi hoặc kế hoạch rollback rõ ràng.
- Thêm lock phải mô tả lock order và có concurrency test.
- Event quan trọng phải được phát qua outbox nếu cần bảo đảm không mất event.
- Secret không được nằm trong source, test log hoặc tài liệu với giá trị thật.
- Mọi thay đổi business rule phải cập nhật [PRODUCT.md](PRODUCT.md) và tài liệu flow tương ứng.
- Mọi thay đổi boundary, persistence, security hoặc deployment phải cập nhật file này.

## 22. Tài liệu liên quan

- [README.md](README.md): tổng quan và cách chạy dự án.
- [PRODUCT.md](PRODUCT.md): yêu cầu sản phẩm và trạng thái triển khai.
- [API_REFERENCE.md](API_REFERENCE.md): danh mục endpoint, request/response, quyền và mã lỗi.
- [AUTHENTICATION_AUTHORIZATION.md](AUTHENTICATION_AUTHORIZATION.md): authentication, JWT, refresh token và phân quyền.
- [CLIENT_JOB_CREATION_FLOW.md](CLIENT_JOB_CREATION_FLOW.md): tạo Job và tính ngân sách.
- [FREELANCER_JOB_PROOF_FLOW.md](FREELANCER_JOB_PROOF_FLOW.md): nhận Job, proof và review workflow.
- [ADMIN_CONFIGURATION_FLOW.md](ADMIN_CONFIGURATION_FLOW.md): Required Level và platform fee.
