# Luồng nghiệp vụ Client

Tài liệu này tập hợp các use case hiện có của role `CLIENT`: xem số dư, tạo yêu cầu nạp tiền,
xem Required Level, tạo và theo dõi Job, xem proof, duyệt hoặc từ chối proof.

## 1. Quyền và luồng tổng quát

Tất cả API bên dưới yêu cầu:

```http
Authorization: Bearer <client-access-token>
```

Thiếu hoặc sai token trả `401`; token không có role `CLIENT` trả `403` đối với API Client/Job.

```text
Xem số dư → tạo yêu cầu nạp tiền → chọn Required Level → tạo Job
                                                        ↓
Freelancer claim → submit proof → Client xem proof → approve hoặc reject
                                             approve ──→ payout + hoàn thành slot
                                             reject  ──→ trả slot cho Job
```

## 2. Tài khoản và nạp tiền

### Xem số dư

```http
GET /api/v1/client/account
```

```json
{
  "currency": "VND",
  "availableAmount": 700000.00,
  "heldAmount": 300000.00
}
```

- `availableAmount`: số tiền có thể dùng để tạo Job.
- `heldAmount`: số tiền đang được giữ cho các Job đã tạo.

### Tạo yêu cầu nạp tiền

```http
POST /api/v1/client/account/deposits
Content-Type: application/json
```

```json
{
  "amount": 500000.00,
  "provider": "VNPAY",
  "idempotencyKey": "deposit-request-001"
}
```

`amount >= 1.00`, tối đa 2 chữ số thập phân; `provider` tối đa 40 ký tự;
`idempotencyKey` tối đa 100 ký tự. API chỉ tạo DepositOrder `PENDING`, chưa cộng tiền.
Việc xác nhận nạp tiền hiện mới có ở service nội bộ, chưa có HTTP webhook public.

## 3. Xem Required Level

```http
GET /api/v1/required-levels
GET /api/v1/required-levels/{id}
```

Client phải chọn một `requiredLevelId` hợp lệ khi tạo Job. Response level gồm `id`, `description`,
`pricePerReview` tối thiểu và `rank` Google Maps yêu cầu. Các API này yêu cầu đăng nhập; chỉ Admin
được tạo, sửa hoặc xóa level.

## 4. Tạo Job

```http
POST /api/v1/jobs
Idempotency-Key: <client-generated-unique-key>
Content-Type: application/json
```

`Idempotency-Key` là header bắt buộc, không rỗng và tối đa 100 ký tự. Dùng một key mới cho mỗi ý
định tạo Job và dùng lại đúng key đó khi retry do timeout hoặc lỗi mạng.

```json
{
  "title": "Review địa điểm A",
  "description": "Đăng review theo nội dung cung cấp",
  "mapLink": "https://www.google.com/maps/place/example",
  "requiredLevelId": 1,
  "pricePerReview": 10000.00,
  "totalReviews": 2,
  "reviewContents": [
    {"content": "Nội dung thứ nhất", "images": []},
    {"content": "Nội dung thứ hai", "images": []}
  ]
}
```

Alias tương thích ngược: `linkUrlMap` thay cho `mapLink`, `totalSlots` thay cho `totalReviews`.

| Trường | Quy tắc |
|---|---|
| `title` | Không rỗng, tối đa 255 ký tự. |
| `description` | Không rỗng. |
| `mapLink` | HTTPS Google Maps, tối đa 2048 ký tự. |
| `requiredLevelId` | Số dương và phải tồn tại. |
| `pricePerReview` | Lớn hơn 0, tối đa 2 số thập phân, không thấp hơn giá Required Level. |
| `totalReviews` | Tối thiểu 1. |
| `reviewContents` | Có thể null; backend lưu danh sách rỗng. |

URL hỗ trợ các domain `google.com`, `google.com.vn`, `maps.app.goo.gl` và `goo.gl/maps`.

### Tính và giữ tiền

```text
totalBudget       = pricePerReview * totalReviews
platformFeeAmount = round(totalBudget * platformFeeRate, 2, HALF_UP)
freelancerBudget  = totalBudget - platformFeeAmount
pricePerTask      = floor(freelancerBudget / totalReviews, 2 chữ số)
remainingBudget   = freelancerBudget
```

Khi tạo thành công, toàn bộ `totalBudget` được chuyển từ `available` sang `held` trong cùng
transaction. Tỷ lệ phí và các giá trị ngân sách được snapshot; thay đổi cấu hình sau đó không làm
thay đổi Job cũ.

Job bắt đầu với `OPEN`, `availableSlots = totalReviews`, `completedSlots = 0`. API trả `201`.
Cùng Client + key + payload trả lại Job cũ và không giữ tiền lần hai; cùng key nhưng payload khác
trả `409`.

## 5. Theo dõi Job của Client

```http
GET /api/v1/jobs
GET /api/v1/jobs/{jobId}
```

- Danh sách chỉ gồm Job của Client hiện tại và sắp xếp mới nhất trước.
- Chi tiết Job của Client khác cũng trả `404` để không làm lộ quyền sở hữu.
- Client chưa có API sửa, hủy hoặc xóa Job. Muốn thay đổi nội dung/số lượng phải tạo Job mới.

Vòng đời liên quan đến Client:

```text
OPEN --Freelancer giữ hết slot/nộp proof--> IN_PROGRESS
PENDING proof --Client approve đủ slot----> COMPLETED
PENDING proof --Client reject-------------> OPEN (trả lại slot)
```

## 6. Xem và xử lý proof

### Danh sách proof cần xử lý

```http
GET /api/v1/client/proofs
```

API chỉ trả proof thuộc các Job của Client hiện tại. Proof chứa thông tin Job, Freelancer, nội dung
review, link chia sẻ, ảnh bằng chứng, trạng thái, payout và kết quả review.

### Chi tiết proof trong lịch sử

```http
GET /api/v1/client/proofs/history
GET /api/v1/client/proofs/history/{proofId}
```

Danh sách lịch sử chỉ gồm Proof `APPROVED`/`REJECTED`, sắp xếp theo thời điểm xử lý giảm dần và có đầy đủ dữ
liệu giống màn duyệt. Chi tiết chỉ cho Client sở hữu Job xem; Proof `PENDING`, ID không tồn tại hoặc thuộc
Client khác đều trả `404 Not Found` để không làm lộ dữ liệu.

### Duyệt proof

```http
POST /api/v1/client/proofs/{proofId}/approve
```

Không có request body. Chỉ Client sở hữu Job và proof đang `PENDING` mới được duyệt. Trong cùng
transaction:

```text
Proof      PENDING → APPROVED
Assignment SUBMITTED → APPROVED
Job.completedSlots += 1
Job.remainingFreelancerBudget -= payoutAmount
Freelancer.availableAmount += payoutAmount
```

Khoản payout được chuyển từ tiền đang giữ của Client sang số dư khả dụng của Freelancer. Khi
`completedSlots == totalSlots`, Job chuyển sang `COMPLETED`. Gọi duyệt lặp lại không trả tiền lần
hai mà nhận `409 Conflict`.

### Từ chối proof

```http
POST /api/v1/client/proofs/{proofId}/reject
Content-Type: application/json
```

```json
{"reason":"Ảnh chưa thể hiện review đã được đăng"}
```

`reason` bắt buộc, không rỗng và tối đa 2000 ký tự. Trong cùng transaction:

```text
Proof      PENDING → REJECTED
Assignment SUBMITTED → REJECTED
Job.availableSlots += 1
Job.status = OPEN
```

Reject không payout. Proof cũ được giữ làm lịch sử và slot được mở lại để Freelancer có thể claim
một lượt mới.

## 7. Lỗi chính

| Status | Trường hợp |
|---|---|
| `400` | Payload, URL, giá, level hoặc lý do reject không hợp lệ. |
| `401` | Thiếu hoặc sai access token. |
| `403` | Sai role hoặc không có quyền trên API. |
| `404` | Job/proof không tồn tại hoặc không thuộc Client hiện tại. |
| `409` | Idempotency conflict hoặc proof đã được xử lý. |
| `422` | Số dư khả dụng không đủ để giữ ngân sách Job. |

## 8. Giới hạn hiện tại

- Chưa có API Client sửa, hủy hoặc xóa Job.
- API danh sách Job và proof chưa phân trang/lọc.
- `reviewContents` chưa có Bean Validation riêng.
- Phần dư do làm tròn `pricePerTask` có thể còn trong ngân sách Job.
- Deposit chưa có HTTP webhook public để xác nhận thanh toán.
