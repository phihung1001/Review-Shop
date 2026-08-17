# API Reference — Review Shop Backend

Luồng payout method, QR ngân hàng và rút tiền Freelancer xem [WITHDRAWAL_FLOW.md](WITHDRAWAL_FLOW.md). API mới gồm `/api/v1/freelancer/payout-methods`, `/api/v1/freelancer/payout-method-images/uploads`, `/api/v1/freelancer/withdrawals`, `/api/v1/admin/withdrawals` và `/api/v1/admin/platform-settings/withdrawals`.

Tài liệu này phản ánh public HTTP API trong code tại ngày **28/07/2026**.

## 1. Quy ước chung

Base URL môi trường local:

```text
http://localhost:8080
```

API nghiệp vụ dùng JSON và JWT Bearer:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Các role: `CLIENT`, `FREELANCER`, `ADMIN`. API danh sách hiện trả mảng đầy đủ, chưa có phân trang.
Thời gian trong response dùng ISO-8601 `Instant`; tiền hiện dùng `VND` với hai chữ số thập phân.

Response lỗi do controller/domain exception handler trả về:

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Only pending proof can be reviewed"
}
```

Lỗi `401/403` phát sinh trực tiếp trong Spring Security filter có thể dùng error body mặc định và
chưa được chuẩn hóa hoàn toàn theo cấu trúc trên.

Mã HTTP thường gặp:

| Status | Ý nghĩa |
| ---: | --- |
| `200` | Đọc/cập nhật thành công. |
| `201` | Tạo thành công. |
| `204` | Xóa/hủy thành công, không có body. |
| `400` | Payload/header hoặc quy tắc validation không hợp lệ. |
| `401` | Thiếu hoặc sai thông tin xác thực. |
| `403` | Sai role hoặc không có quyền sở hữu. |
| `404` | Không tìm thấy tài nguyên được phép nhìn thấy. |
| `409` | Xung đột trạng thái/idempotency/slot. |
| `422` | Không đủ số dư hoặc dữ liệu nghiệp vụ không thể xử lý. |
| `429` | Vượt rate limit của API xác thực. |
| `503` | Dịch vụ xác minh Google Maps không khả dụng. |

## 2. Authentication

### Đăng ký

```http
POST /api/v1/auth/register
```

```json
{
  "fullName": "Nguyen Van A",
  "email": "client@example.com",
  "password": "password-12-chars",
  "role": "CLIENT"
}
```

`role` chỉ chấp nhận đăng ký public cho `CLIENT` hoặc `FREELANCER`; mật khẩu dài 12–64 ký tự.
Thành công trả `201` với `AuthResponse` và set refresh/CSRF cookie.

### Đăng nhập

```http
POST /api/v1/auth/login
```

```json
{"email":"client@example.com","password":"password-12-chars"}
```

Response `200`:

```json
{
  "message": "Login successfully",
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {"id": 1, "fullName": "Nguyen Van A", "email": "client@example.com"}
}
```

### Refresh token

```http
POST /api/v1/auth/refresh
Cookie: refresh_token=<token>; csrf_token=<csrf-token>
X-CSRF-Token: <same-csrf-token>
```

Không có request body. Thành công rotate refresh token, set lại hai cookie và trả `AuthResponse`.

### Logout

```http
POST /api/v1/auth/logout
Cookie: refresh_token=<token>; csrf_token=<csrf-token>
X-CSRF-Token: <same-csrf-token>
```

Nếu có refresh cookie thì CSRF bắt buộc. Thành công thu hồi token family phù hợp, xóa cookie và trả:

```json
{"message":"Logout successfully"}
```

### Quên mật khẩu

```http
POST /api/v1/auth/forgot-password
```

```json
{"email":"client@example.com"}
```

Luôn trả message thống nhất để hạn chế dò tài khoản.

### Đặt lại mật khẩu

```http
POST /api/v1/auth/reset-password
```

```json
{
  "email": "client@example.com",
  "otp": "123456",
  "newPassword": "new-password-12"
}
```

OTP bắt buộc đúng 6 chữ số; mật khẩu dài 6–64 ký tự.

## 3. Required Level

### Danh sách và chi tiết — Đã đăng nhập

```http
GET /api/v1/required-levels
GET /api/v1/required-levels/{id}
Authorization: Bearer <access-token>
```

Response item:

```json
{
  "id": 1,
  "description": "Local Guide level 3",
  "pricePerReview": 10000.00,
  "rank": 3
}
```

### Tạo — Admin

```http
POST /api/v1/required-levels
Authorization: Bearer <admin-token>
```

```json
{
  "description": "Local Guide level 3",
  "pricePerReview": 10000.00,
  "rank": 3
}
```

`pricePerReview > 0`; `rank` từ 1–10 và mặc định là `1` khi tạo nếu bỏ qua. Trả `201`.

### Cập nhật và xóa — Admin

```http
PUT /api/v1/required-levels/{id}
DELETE /api/v1/required-levels/{id}
```

PUT dùng cùng payload với API tạo; bỏ `rank` sẽ giữ rank hiện tại. DELETE trả `204` và có thể bị
database từ chối nếu level đang được Job tham chiếu.

## 4. Platform Settings — Admin

### Đọc

```http
GET /api/v1/admin/platform-settings
Authorization: Bearer <admin-token>
```

```json
{
  "platformFeeRate": 0.5000,
  "updatedBy": "SYSTEM",
  "version": 0,
  "updatedAt": "2026-07-28T00:00:00Z"
}
```

### Cập nhật phí

```http
PUT /api/v1/admin/platform-settings/fee-rate
```

```json
{"platformFeeRate":0.2500}
```

Giá trị từ `0.0000` đến nhỏ hơn `1.0000`, tối đa 4 chữ số thập phân. Job cũ không bị tính lại.

## 5. Client — tài khoản, Job và duyệt Proof

### Xem số dư

```http
GET /api/v1/client/account
Authorization: Bearer <client-token>
```

```json
{
  "currency": "VND",
  "availableAmount": 700000.00,
  "heldAmount": 300000.00
}
```

### Tạo yêu cầu nạp tiền

```http
POST /api/v1/client/account/deposits
Authorization: Bearer <client-token>
```

```json
{
  "amount": 500000.00,
  "provider": "VNPAY",
  "idempotencyKey": "deposit-request-001"
}
```

`amount >= 1.00`; `provider` tối đa 40 ký tự; `idempotencyKey` tối đa 100 ký tự. API chỉ tạo
DepositOrder `PENDING`, chưa cộng tiền.

```json
{
  "id": 10,
  "requestedAmount": 500000.00,
  "receivedAmount": null,
  "currency": "VND",
  "provider": "VNPAY",
  "status": "PENDING",
  "createdAt": "2026-07-28T00:00:00Z",
  "completedAt": null
}
```

`DepositService.confirm` hiện là API nội bộ của service, chưa có HTTP webhook public.

### Job

#### Tạo Job

```http
POST /api/v1/jobs
Authorization: Bearer <client-token>
Idempotency-Key: <unique-key-max-100-characters>
```

```json
{
  "title": "Review địa điểm A",
  "description": "Đăng review theo nội dung cung cấp",
  "mapLink": "https://www.google.com/maps/place/example",
  "requiredLevelId": 1,
  "pricePerReview": 100000.00,
  "totalReviews": 2,
  "reviewContents": [
    {"content":"Nội dung thứ nhất","images":[]},
    {"content":"Nội dung thứ hai","images":[]}
  ]
}
```

Alias cũ: `linkUrlMap` cho `mapLink`, `totalSlots` cho `totalReviews`. `pricePerReview` phải không
thấp hơn giá Required Level. Thành công chuyển toàn bộ `totalBudget` từ `available` sang `held`.

Cùng Client + key + payload trả lại Job cũ và không giữ tiền lần hai. Cùng key nhưng payload khác
trả `409`. Không đủ tiền trả `422` và toàn bộ Job/ledger rollback.

Response `201`:

```json
{
  "id": 10,
  "title": "Review địa điểm A",
  "description": "Đăng review theo nội dung cung cấp",
  "mapLink": "https://www.google.com/maps/place/example",
  "requiredLevel": {"id":1,"description":"Level 1","pricePerReview":10000.00,"rank":1},
  "pricePerReview": 100000.00,
  "requiredReviews": 2,
  "reviewContents": [],
  "linkUrlMap": "https://www.google.com/maps/place/example",
  "pricePerTask": 50000.00,
  "totalSlots": 2,
  "availableSlots": 2,
  "completedSlots": 0,
  "status": "OPEN"
}
```

#### Danh sách và chi tiết Job của Client

```http
GET /api/v1/jobs
GET /api/v1/jobs/{jobId}
```

Chỉ trả Job thuộc Client hiện tại. Job thuộc Client khác cũng trả `404` ở API chi tiết. Không có API
Client sửa, hủy hoặc xóa Job; thay đổi số lượng review bằng cách tạo Job mới.

### Xem và xử lý Proof

```http
GET /api/v1/client/proofs
GET /api/v1/client/proofs/{proofId}
GET /api/v1/client/proofs/history
GET /api/v1/client/proofs/history/{proofId}
POST /api/v1/client/proofs/{proofId}/approve
POST /api/v1/client/proofs/{proofId}/reject
Authorization: Bearer <client-token>
```

`GET /api/v1/client/proofs/history` phục vụ màn `/client/proofs/history`, chỉ trả Proof `APPROVED` và
`REJECTED`, mới xử lý gần nhất đứng trước. Mỗi phần tử có đầy đủ dữ liệu giống màn duyệt. Endpoint
`GET /api/v1/client/proofs/history/{proofId}` trả chi tiết một mục lịch sử. Proof `PENDING`, không tồn tại hoặc
thuộc Client khác đều trả `404 Not Found` ở endpoint chi tiết lịch sử.

Approve không có body. Reject yêu cầu:

```json
{"reason":"Ảnh chưa thể hiện review đã được đăng"}
```

Chỉ Client sở hữu Job và proof `PENDING` được xử lý. Approve giải ngân payout từ tiền đang giữ
của Client sang số dư khả dụng của Freelancer và tăng slot hoàn thành. Reject không payout, trả
slot về Job và lưu lý do; proof cũ vẫn được giữ làm lịch sử. Request xử lý lặp lại trả `409`.

## 6. Google Maps Account — Freelancer

Toàn bộ luồng tích hợp phía Freelancer, ví dụ payload và vòng đời trạng thái được tổng hợp tại
[FREELANCER_FLOW.md](FREELANCER_FLOW.md).

### Xác minh account

```http
POST /api/v1/freelancer/google-maps-accounts/verify
Authorization: Bearer <freelancer-token>
```

```json
{"profileUrl":"https://www.google.com/maps/contrib/117642509766343273456"}
```

Thành công trả `201`. Link phải là contributor URL hợp lệ; profile phải là Local Guide có ít nhất
một review công khai. Backend dùng `hl=en` để ổn định schema JSON cho mọi account, không phải để
giới hạn ngôn ngữ/quốc gia. Nếu tổng review bị thiếu, mảng `reviews` được dùng để xác nhận có review.
SerpApi không khả dụng hoặc trả dữ liệu không thành công thì API trả `503`.

Đây là kiểm tra eligibility từ profile công khai, chưa phải bằng chứng user sở hữu profile.

### Danh sách account và cập nhật loại

```http
GET /api/v1/freelancer/google-maps-accounts
PATCH /api/v1/freelancer/google-maps-accounts/{id}/type
```

```json
{"accountType":"VIETNAM"}
```

Loại hỗ trợ: `VIETNAM`, `FOREIGN`. Response account:

```json
{
  "id": 12,
  "contributorId": "117642509766343273456",
  "profileUrl": "https://www.google.com/maps/contrib/117642509766343273456",
  "accountName": "Local Guide A",
  "thumbnail": "https://example.com/avatar.jpg",
  "localGuideLevel": 5,
  "points": 1000,
  "reviewCount": 100,
  "accountType": "VIETNAM",
  "readyForJobs": true,
  "verifiedAt": "2026-07-28T00:00:00Z"
}
```

## 7. Job Assignment — Freelancer

### Job mở và account đủ điều kiện

```http
GET /api/v1/freelancer/jobs/open
GET /api/v1/freelancer/jobs/{jobId}/eligible-google-maps-accounts
```

Job mở chỉ gồm Job `OPEN` còn slot. Mỗi `reviewContents` item có `index`, `content`, `images` và
`available`. API eligibility chỉ trả account active, đã chọn loại và đủ `requiredLevel.rank`.

### Claim Job

```http
POST /api/v1/freelancer/jobs/{jobId}/assignments
```

```json
{
  "reviewContentIndex": 0,
  "googleMapsAccountId": 12
}
```

`googleMapsAccountId` bắt buộc. `reviewContentIndex` có thể bỏ/null nếu Job không có content. Thành
công trả `201`; assignment mặc định hết hạn sau 10 phút.

```json
{
  "id": 50,
  "jobId": 10,
  "jobTitle": "Review địa điểm A",
  "jobDescription": "Đăng review theo nội dung cung cấp",
  "mapLink": "https://www.google.com/maps/place/example",
  "payoutPerTask": 25000.00,
  "reviewContentIndex": 0,
  "reviewContent": "Nội dung cần đăng",
  "reviewContentImages": [],
  "googleMapsAccountId": 12,
  "googleMapsAccountName": "Local Guide A",
  "status": "CLAIMED",
  "expiresAt": "2026-07-28T00:10:00Z",
  "submittedAt": null,
  "finishedAt": null,
  "createdAt": "2026-07-28T00:00:00Z"
}
```

### Danh sách, chi tiết và hủy Assignment

```http
GET /api/v1/freelancer/assignments
GET /api/v1/freelancer/assignments/{assignmentId}
DELETE /api/v1/freelancer/assignments/{assignmentId}
```

API danh sách trả response rút gọn. API chi tiết trả cùng response đầy đủ như claim và chỉ owner được xem.
Chỉ assignment `CLAIMED` của chính Freelancer mới được hủy. DELETE trả `204` và trả lại slot.

## 8. Proof — Freelancer

### Freelancer submit proof

```http
POST /api/v1/freelancer/jobs/{jobId}/proofs
```

```json
{
  "assignmentId": 50,
  "shareLink": "https://share.example/review/123",
  "proofImages": ["https://cdn.example.com/proof-1.jpg"]
}
```

`assignmentId` bắt buộc theo business rule; share link và 1–10 image URL phải dùng HTTPS. Chỉ
Assignment `CLAIMED` còn hạn, đúng Job và đúng owner được submit. Thành công trả `201`.

### Freelancer xem proof của mình

```http
GET /api/v1/freelancer/proofs
```

## 9. Freelancer Account

```http
GET /api/v1/freelancer/account
Authorization: Bearer <freelancer-token>
```

Response dùng cùng `AccountBalanceResponse` với Client. Freelancer nhận tiền vào `availableAmount`
khi proof được Client approve.

## 10. Giới hạn API hiện tại

- Chưa có pagination/filter cho các API danh sách.
- Chưa có API lịch sử `account_transactions`, rút tiền, hoàn tiền hoặc tranh chấp.
- Chưa có HTTP webhook xác nhận Deposit; `POST /deposits` chỉ tạo `PENDING`.
- Chưa có API Client sửa/hủy/xóa Job theo quyết định sản phẩm.
- Proof image mới dùng object key do `POST /api/v1/freelancer/proof-images/uploads` cấp; xem [OBJECT_STORAGE.md](OBJECT_STORAGE.md).
- CORS hiện chỉ allow `Authorization`, `Content-Type`, `X-CSRF-Token`; chưa allow
  `Idempotency-Key`. Browser chạy khác origin cần bổ sung header này vào `SecurityConfig` trước khi
  gọi `POST /api/v1/jobs`.

## 11. Tài liệu chi tiết

- [AUTHENTICATION_AUTHORIZATION.md](AUTHENTICATION_AUTHORIZATION.md)
- [CLIENT_JOB_CREATION_FLOW.md](CLIENT_JOB_CREATION_FLOW.md)
- [FREELANCER_FLOW.md](FREELANCER_FLOW.md)
- [FREELANCER_JOB_PROOF_FLOW.md](FREELANCER_JOB_PROOF_FLOW.md)
- [FREELANCER_GOOGLE_MAPS_ACCOUNT_FLOW.md](FREELANCER_GOOGLE_MAPS_ACCOUNT_FLOW.md)
- [ADMIN_CONFIGURATION_FLOW.md](ADMIN_CONFIGURATION_FLOW.md)
- [FINANCIAL_FLOW.md](FINANCIAL_FLOW.md)
