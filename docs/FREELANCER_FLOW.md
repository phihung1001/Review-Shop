# Hướng dẫn đầy đủ cho Freelancer

Tài liệu này mô tả toàn bộ luồng hiện có dành cho user có role `FREELANCER`, từ chuẩn bị Google Maps
account, tìm và nhận Job, nộp proof, theo dõi kết quả đến nhận tiền thưởng.

## 1. Điều kiện và xác thực

Tất cả endpoint trong tài liệu đều yêu cầu JWT access token của user có role `FREELANCER`:

```http
Authorization: Bearer <freelancer-access-token>
```

- Thiếu hoặc token không hợp lệ: `401 Unauthorized`.
- Token hợp lệ nhưng sai role: `403 Forbidden`.
- Request/response dùng JSON, trừ API `DELETE` thành công không có body.
- Thời gian trong response dùng ISO-8601 UTC, ví dụ `2026-08-02T10:00:00Z`.
- Các API danh sách hiện chưa có phân trang hoặc bộ lọc.

## 2. Tổng quan luồng

```text
Đăng nhập Freelancer
        │
        ▼
Xác minh Google Maps contributor profile
        │
        ▼
Chọn accountType: VIETNAM hoặc FOREIGN
        │
        ▼
Xem Job OPEN và chọn Google Maps account đủ level
        │
        ▼
Claim Job ──> Assignment CLAIMED (mặc định giữ chỗ 10 phút)
        │
        ├── hủy ───────────────> CANCELLED, trả slot
        ├── hết hạn ───────────> EXPIRED, trả slot
        ▼
Submit proof ────────────────> Assignment SUBMITTED + Proof PENDING
        │
        ├── Client reject ─────> REJECTED, không nhận tiền, trả slot
        └── Client approve ────> APPROVED, tiền thưởng vào available balance
```

## 3. Quản lý Google Maps account

### 3.1. Xác minh contributor profile

```http
POST /api/v1/freelancer/google-maps-accounts/verify
Content-Type: application/json

{
  "profileUrl": "https://www.google.com/maps/contrib/117642509766343273456"
}
```

Backend chỉ chấp nhận URL HTTPS có host `google.com` hoặc `www.google.com` và path dạng
`/maps/contrib/{contributorId}`. Dữ liệu công khai của contributor được kiểm tra qua SerpApi với
response language cố định `hl=en`; lựa chọn này chỉ ổn định tên field JSON, không giới hạn ngôn ngữ
hay quốc gia của account.

Account hợp lệ phải:

- Là Local Guide.
- Có level từ `1` trở lên.
- Có ít nhất một review đã xuất bản.
- Chưa được bất kỳ user nào đăng ký trong hệ thống.

Thành công trả `201 Created`. Account mới xác minh chưa sẵn sàng nhận Job vì chưa có `accountType`.

Lưu ý: bước này xác nhận profile công khai đủ điều kiện, chưa chứng minh Freelancer sở hữu profile.
Khi SerpApi tạm lỗi, API trả `503`; các lần claim sau sử dụng snapshot đã lưu và không gọi provider
lại.

### 3.2. Chọn loại account

```http
PATCH /api/v1/freelancer/google-maps-accounts/{accountId}/type
Content-Type: application/json

{
  "accountType": "VIETNAM"
}
```

Giá trị hợp lệ: `VIETNAM`, `FOREIGN`. Chỉ owner của account được cập nhật. Khi account đang active
và đã có loại, response trả `readyForJobs: true`.

### 3.3. Xem account của mình

```http
GET /api/v1/freelancer/google-maps-accounts
```

API chỉ trả các account active của Freelancer hiện tại, mới nhất trước:

```json
[
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
    "verifiedAt": "2026-08-02T10:00:00Z"
  }
]
```

## 4. Tìm Job và kiểm tra eligibility

### 4.1. Danh sách Job mở

```http
GET /api/v1/freelancer/jobs/open
```

Chỉ trả Job có `status = OPEN` và `availableSlots > 0`, sắp xếp mới nhất trước. API chưa tự lọc
theo level của Freelancer; frontend cần gọi API eligibility trước khi cho phép claim.

```json
[
  {
    "id": 10,
    "title": "Review địa điểm A",
    "description": "Đăng review theo nội dung cung cấp",
    "mapLink": "https://www.google.com/maps/place/example",
    "requiredLevel": {
      "id": 1,
      "description": "Level 3",
      "pricePerReview": 50000.00,
      "rank": 3
    },
    "payoutPerTask": 25000.00,
    "availableSlots": 2,
    "totalSlots": 2,
    "reviewContents": [
      {
        "index": 0,
        "content": "Nội dung cần đăng",
        "images": [],
        "available": true
      }
    ]
  }
]
```

`available` cho biết review content chưa bị Assignment `CLAIMED`, `SUBMITTED` hoặc `APPROVED`
chiếm giữ. Dữ liệu này có thể thay đổi ngay sau khi đọc, nên backend luôn kiểm tra lại lúc claim.

### 4.2. Account đủ điều kiện cho một Job

```http
GET /api/v1/freelancer/jobs/{jobId}/eligible-google-maps-accounts
```

Một account đủ điều kiện khi:

- Thuộc Freelancer hiện tại.
- Đang active.
- Đã chọn `accountType`.
- `localGuideLevel >= requiredLevel.rank` của Job.

Mảng rỗng nghĩa là Freelancer chưa có account phù hợp và không thể claim Job đó.

## 5. Claim và quản lý Assignment

### 5.1. Claim Job

```http
POST /api/v1/freelancer/jobs/{jobId}/assignments
Content-Type: application/json

{
  "reviewContentIndex": 0,
  "googleMapsAccountId": 12
}
```

- `googleMapsAccountId` bắt buộc.
- Job có `reviewContents`: `reviewContentIndex` bắt buộc, bắt đầu từ `0` và phải còn available.
- Job không có `reviewContents`: bỏ field hoặc truyền `null`.

Backend từ chối claim nếu Job không tồn tại, không còn `OPEN`, hết slot, account không thuộc user,
account chưa sẵn sàng/không đủ level, content đã bị giữ, hoặc Freelancer đã có Assignment active trên
cùng Job. Assignment active gồm `CLAIMED`, `SUBMITTED`, `APPROVED`.

Thành công trả `201 Created` với response chi tiết để frontend mở ngay màn hình thực hiện Job:

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
  "expiresAt": "2026-08-02T10:10:00Z",
  "submittedAt": null,
  "finishedAt": null,
  "createdAt": "2026-08-02T10:00:00Z"
}
```

Tên, contributor ID, level và loại Google Maps account được snapshot vào Assignment tại thời điểm
claim. Claim mặc định giữ slot trong 10 phút; thời hạn thực tế nằm trong `expiresAt`.

#### Claim không thành công do Freelancer khác nhanh hơn

Danh sách Job, `availableSlots` và cờ `reviewContents[].available` chỉ là snapshot tại thời điểm frontend
đọc dữ liệu. Nếu hai Freelancer cùng gửi `POST /api/v1/freelancer/jobs/{jobId}/assignments`, backend khóa Job
và xử lý tuần tự. Request được xử lý trước có thể claim thành công với `201 Created`; request sau được kiểm
tra lại trên dữ liệu mới và nhận `409 Conflict`.

Nếu Freelancer trước đã lấy slot cuối, response là:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json
```

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Job has no available slot"
}
```

Nếu Job vẫn còn slot nhưng review content được chọn đã bị Freelancer trước giữ, response là:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json
```

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Review content has already been assigned"
}
```

Frontend phải coi đây là xung đột dữ liệu bình thường, không phải lỗi hệ thống: hiển thị thông báo Job/content
vừa được người khác nhận, đóng trạng thái loading và tải lại `GET /api/v1/freelancer/jobs/open`. Nếu Job vẫn còn
slot thì cho người dùng chọn một content còn `available`; không tự động gửi lại claim với content cũ.

### 5.2. Danh sách Assignment

```http
GET /api/v1/freelancer/assignments
```

Trả danh sách Assignment rút gọn của Freelancer hiện tại, mới nhất trước, gồm cả trạng thái đã kết thúc.
Response danh sách không chứa mô tả, map link và nội dung review để tránh payload lớn.

```json
[
  {
    "id": 50,
    "jobId": 10,
    "jobTitle": "Review địa điểm A",
    "payoutPerTask": 25000.00,
    "googleMapsAccountName": "Local Guide A",
    "status": "CLAIMED",
    "expiresAt": "2026-08-02T10:10:00Z",
    "submittedAt": null,
    "finishedAt": null,
    "createdAt": "2026-08-02T10:00:00Z"
  }
]
```

### 5.3. Chi tiết Assignment

```http
GET /api/v1/freelancer/assignments/{assignmentId}
```

Chỉ owner của Assignment được xem. Response có cùng cấu trúc chi tiết với response claim, bao gồm mô tả Job,
map link, payout, review content, ảnh và Google Maps account cần sử dụng. Frontend gọi API này khi mở chi tiết
từ danh sách hoặc khi tải lại trang thực hiện Job.

### 5.4. Hủy Assignment

```http
DELETE /api/v1/freelancer/assignments/{assignmentId}
```

Chỉ owner được hủy và chỉ trạng thái `CLAIMED` được hủy. Thành công trả `204 No Content`, chuyển
Assignment sang `CANCELLED` và trả slot/content về Job. Assignment đã submit không thể hủy.

### 5.5. Trạng thái Assignment

| Trạng thái | Ý nghĩa | Giữ slot/content |
| --- | --- | :---: |
| `CLAIMED` | Đang thực hiện, phải submit trước `expiresAt`. | Có |
| `SUBMITTED` | Đã nộp proof, chờ Client xử lý. | Có |
| `APPROVED` | Proof được duyệt và đã trả thưởng. | Có, dưới dạng slot hoàn thành |
| `REJECTED` | Proof bị từ chối. | Không |
| `EXPIRED` | Không submit đúng hạn. | Không |
| `CANCELLED` | Freelancer chủ động hủy trước khi submit. | Không |

Scheduler mặc định quét claim hết hạn mỗi phút. Submit sau `expiresAt` bị từ chối ngay cả khi
scheduler chưa kịp chuyển trạng thái sang `EXPIRED`.

## 6. Nộp và theo dõi proof

### 6.1. Submit proof

```http
POST /api/v1/freelancer/jobs/{jobId}/proofs
Content-Type: application/json

{
  "assignmentId": 50,
  "shareLink": "https://share.example/review/123",
  "proofImages": [
    "https://cdn.example.com/proofs/proof-1.jpg"
  ]
}
```

| Field | Quy tắc |
| --- | --- |
| `assignmentId` | Bắt buộc theo business rule; phải thuộc đúng Freelancer và đúng `jobId`. |
| `shareLink` | Bắt buộc, HTTPS URL, tối đa 2048 ký tự. |
| `proofImages` | Từ 1 đến 10 R2 object key do API upload cấp hoặc HTTPS URL tương thích cũ; tối đa 2048 ký tự. |

Chỉ Assignment `CLAIMED` còn hạn được submit. Thành công trả `201 Created`, chuyển Assignment sang
`SUBMITTED` và tạo Proof `PENDING`. Submit không trừ slot lần thứ hai.

```json
{
  "id": 80,
  "assignmentId": 50,
  "jobId": 10,
  "jobTitle": "Review địa điểm A",
  "freelancerId": 20,
  "freelancerName": "Freelancer A",
  "reviewContentIndex": 0,
  "reviewContent": "Nội dung cần đăng",
  "shareLink": "https://share.example/review/123",
  "proofImages": ["https://cdn.example.com/proofs/proof-1.jpg"],
  "status": "PENDING",
  "rejectionReason": null,
  "payoutAmount": 25000.00,
  "reviewedAt": null,
  "createdAt": "2026-08-02T10:05:00Z",
  "updatedAt": "2026-08-02T10:05:00Z"
}
```

`reviewContent` và `payoutAmount` là snapshot tại thời điểm submit.

### 6.2. Xem proof của mình

```http
GET /api/v1/freelancer/proofs
```

Trả toàn bộ proof của Freelancer hiện tại, mới nhất trước. Dùng `status`, `rejectionReason` và
`reviewedAt` để hiển thị kết quả Client xử lý.

### 6.3. Kết quả duyệt proof

- `APPROVED`: Assignment cũng thành `APPROVED`; `payoutAmount` được chuyển từ tiền Client đang giữ
  sang `availableAmount` của Freelancer.
- `REJECTED`: Assignment thành `REJECTED`; không trả thưởng, `rejectionReason` được lưu và slot được
  trả về Job để có thể claim lại.

Freelancer không có API tự sửa, xóa hoặc submit lại một Proof cũ. Sau khi bị reject, cần claim một
Assignment mới nếu Job vẫn mở và còn slot.

## 7. Số dư Freelancer

```http
GET /api/v1/freelancer/account
```

Nếu user chưa có ví, API tự tạo ví VND số dư `0`.

```json
{
  "currency": "VND",
  "availableAmount": 25000.00,
  "heldAmount": 0.00
}
```

- `availableAmount`: tiền Freelancer đã nhận và có thể sử dụng trong các luồng được hỗ trợ.
- `heldAmount`: tiền đang giữ; hiện chủ yếu dùng cho phía Client khi tài trợ Job.
- Freelancer chỉ được cộng tiền khi proof được approve; submit proof chưa làm thay đổi số dư.
- Hệ thống đã có ledger nội bộ nhưng chưa có API xem lịch sử giao dịch hoặc yêu cầu rút tiền.

## 8. Mã lỗi thường gặp

| HTTP status | Trường hợp thường gặp |
| ---: | --- |
| `400` | JSON/URL sai định dạng, thiếu field, proof image không phải HTTPS. |
| `401` | Thiếu, hết hạn hoặc sai JWT. |
| `403` | Sai role hoặc truy cập Assignment/account của Freelancer khác. |
| `404` | Google Maps account hoặc Assignment không tồn tại theo phạm vi API. |
| `409` | Contributor trùng, hết slot, content đã bị giữ, account không đủ level, Assignment hết hạn/sai trạng thái. |
| `422` | Contributor không phải Local Guide hoặc chưa có review hợp lệ. |
| `503` | SerpApi chưa cấu hình, timeout hoặc không trả được contributor data. |

Error response chuẩn:

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Job has no available slot"
}
```

Frontend không nên phụ thuộc tuyệt đối vào nội dung tiếng Anh của `message`; dùng HTTP status để
phân loại chính và hiển thị message như thông tin bổ sung.

## 9. Checklist tích hợp frontend

1. Đăng nhập bằng tài khoản `FREELANCER` và lưu access token an toàn.
2. Xác minh ít nhất một Google Maps contributor profile.
3. Bắt buộc chọn `accountType` trước khi cho account nhận Job.
4. Tải danh sách Job mở.
5. Khi chọn Job, tải lại account eligible và content availability.
6. Claim rồi lưu `assignmentId` và `expiresAt`.
7. Hiển thị đếm ngược; không cho submit sau thời hạn.
8. Submit proof bằng đúng `jobId` và `assignmentId`.
9. Poll/refetch `/api/v1/freelancer/proofs` để nhận kết quả duyệt.
10. Refetch `/api/v1/freelancer/account` sau khi proof được approve.

## 10. Giới hạn hiện tại

- Chưa có pagination/filter cho Job, Assignment và Proof.
- Chưa có heartbeat/gia hạn Assignment.
- Ảnh proof được upload trực tiếp lên R2 theo [OBJECT_STORAGE.md](OBJECT_STORAGE.md).
- Chưa có API sửa hoặc submit lại Proof.
- Chưa có API lịch sử giao dịch, rút tiền hoặc tranh chấp.
- Eligibility chỉ dựa trên active, account type và Local Guide level; chưa lọc theo quốc gia của Job.
- Verify profile còn đồng bộ và phụ thuộc SerpApi; chưa có retry/backoff, circuit breaker, re-verify
  định kỳ, provider dự phòng hoặc ownership challenge.

## 11. Tài liệu chuyên sâu

- [Xác minh Google Maps account](FREELANCER_GOOGLE_MAPS_ACCOUNT_FLOW.md)
- [Assignment, Proof, concurrency và expiry](FREELANCER_JOB_PROOF_FLOW.md)
- [API Reference](API_REFERENCE.md)
- [Luồng tài chính](FINANCIAL_FLOW.md)
- [Xác thực và phân quyền](AUTHENTICATION_AUTHORIZATION.md)
