# Luồng Freelancer nhận Job và nộp Proof

## 1. Tổng quan

Freelancer không nộp proof trực tiếp vào một slot chưa được giữ. Luồng hiện tại tách thành hai bước:

```text
Claim Job → JobAssignment CLAIMED → Submit proof → Assignment SUBMITTED
                                      │
                                      └→ Proof PENDING → APPROVED/REJECTED
```

`JobAssignment` là lượt giữ chỗ có thời hạn. Database lock chỉ tồn tại trong transaction ngắn lúc claim/submit/review, không tồn tại trong suốt thời gian Freelancer làm việc.

## 2. Vòng đời Assignment

```text
                         submit proof
CLAIMED ───────────────────────────────> SUBMITTED
   │                                         │
   ├── hết hạn ──> EXPIRED                   ├── approve ──> APPROVED
   └── tự hủy ───> CANCELLED                 └── reject ───> REJECTED
```

| Trạng thái | Giữ slot/content | Ý nghĩa |
| --- | :---: | --- |
| `CLAIMED` | Có | Freelancer đang có quyền làm Job đến `expiresAt`. |
| `SUBMITTED` | Có | Proof đã nộp và đang chờ Client xử lý. |
| `APPROVED` | Có, dưới dạng slot hoàn thành | Proof đã duyệt và payout đã ghi nhận. |
| `REJECTED` | Không | Proof bị từ chối và slot đã trả lại. |
| `EXPIRED` | Không | Không submit đúng hạn; scheduler đã trả slot. |
| `CANCELLED` | Không | Freelancer chủ động trả lượt giữ chỗ. |

TTL mặc định là 10 phút, cấu hình bằng:

```env
JOB_ASSIGNMENT_CLAIM_TTL_MINUTES=10
JOB_ASSIGNMENT_EXPIRY_CLEANUP_CRON=0 * * * * *
```

Scheduler mặc định quét assignment hết hạn mỗi phút.

## 3. Quy tắc slot

Với Job có 10 slot:

```text
10 available
→ A claim: 9 available + 1 claimed
→ A submit: vẫn 9 available + 1 submitted
→ Client approve: 9 available + 1 completed
```

Submit không trừ slot lần hai. Nếu A cancel, hết hạn hoặc bị reject thì slot trở về 10.

Bất biến nghiệp vụ:

```text
availableSlots + claimed + submitted + completed = totalSlots
```

Trong implementation hiện tại, `availableSlots` và `completedSlots` được lưu trên Job; các nhóm còn lại được thể hiện bằng trạng thái Assignment/Proof.

## 4. API xem Job mở

```http
GET /api/v1/freelancer/jobs/open
Authorization: Bearer <freelancer-access-token>
```

Chỉ trả Job:

```text
status = OPEN
availableSlots > 0
```

Mỗi review content có cờ `available`. Content không khả dụng nếu đã có Assignment `CLAIMED`, `SUBMITTED` hoặc `APPROVED`.

Danh sách Job mở vẫn hiển thị toàn bộ Job. Khi Freelancer mở bước nhận Job, frontend gọi
`GET /api/v1/freelancer/jobs/{jobId}/eligible-google-maps-accounts`; nút nhận Job bị khóa nếu danh
sách account đủ level rỗng. Claim bắt buộc chọn `googleMapsAccountId` và backend kiểm tra lại.

## 5. API claim Job

```http
POST /api/v1/freelancer/jobs/{jobId}/assignments
Authorization: Bearer <freelancer-access-token>
Content-Type: application/json
```

Request khi Job có review content:

```json
{
  "reviewContentIndex": 0,
  "googleMapsAccountId": 12
}
```

Nếu Job không có review content, truyền `reviewContentIndex = null` hoặc bỏ field.
`googleMapsAccountId` luôn bắt buộc.

Điều kiện claim:

- User có role `FREELANCER`.
- Job tồn tại, đang `OPEN` và còn slot.
- Freelancer không phải chủ Job.
- Freelancer chưa có Assignment `CLAIMED`, `SUBMITTED` hoặc `APPROVED` trên Job.
- Review content tồn tại và chưa bị Assignment khác giữ.
- Google Maps account thuộc Freelancer, đang active, đã chọn loại và có level đáp ứng `requiredLevel.rank`.

Transaction claim:

1. Khóa Job bằng `PESSIMISTIC_WRITE`.
2. Kiểm tra điều kiện.
3. Tạo Assignment `CLAIMED` và `expiresAt`.
4. Giảm `availableSlots` đúng một lần.
5. Nếu hết slot, chuyển Job thành `IN_PROGRESS`.
6. Commit và nhả database lock ngay.

Response mẫu:

```json
{
  "id": 50,
  "jobId": 10,
  "jobTitle": "Google Maps review",
  "jobDescription": "Đăng review theo nội dung cung cấp",
  "mapLink": "https://www.google.com/maps/place/example",
  "payoutPerTask": 25000.00,
  "reviewContentIndex": 0,
  "reviewContent": "Nội dung cần đăng",
  "reviewContentImages": [],
  "googleMapsAccountId": 12,
  "googleMapsAccountName": "Local Guide A",
  "status": "CLAIMED",
  "expiresAt": "2026-07-19T15:10:00Z",
  "submittedAt": null,
  "finishedAt": null,
  "createdAt": "2026-07-19T15:00:00Z"
}
```

## 6. API quản lý Assignment

`GET /api/v1/freelancer/assignments` trả danh sách rút gọn. Khi mở một item, gọi
`GET /api/v1/freelancer/assignments/{assignmentId}` để lấy response chi tiết giống response claim.

### Danh sách của Freelancer

```http
GET /api/v1/freelancer/assignments
Authorization: Bearer <freelancer-access-token>
```

Trả tất cả assignment của user hiện tại, mới nhất trước.

### Hủy claim

```http
DELETE /api/v1/freelancer/assignments/{assignmentId}
Authorization: Bearer <freelancer-access-token>
```

Chỉ owner được hủy và chỉ Assignment `CLAIMED` được hủy. Thành công trả `204 No Content`, Assignment thành `CANCELLED` và slot/content được trả lại.

## 7. API submit proof

```http
POST /api/v1/freelancer/jobs/{jobId}/proofs
Authorization: Bearer <freelancer-access-token>
Content-Type: application/json
```

Request:

```json
{
  "assignmentId": 50,
  "shareLink": "https://share.example/review/123",
  "proofImages": [
    "https://cdn.example.com/proofs/proof-1.jpg"
  ]
}
```

Validation:

| Trường | Quy tắc |
| --- | --- |
| `assignmentId` | Bắt buộc theo business rule; assignment phải thuộc đúng Freelancer và Job. |
| `shareLink` | Bắt buộc, HTTPS, tối đa 2048 ký tự. |
| `proofImages` | Từ 1 đến 10 HTTPS URL, mỗi URL tối đa 2048 ký tự. |

Transaction submit:

1. Khóa Assignment.
2. Kiểm tra owner, Job, trạng thái `CLAIMED` và thời hạn.
3. Khóa Job theo thứ tự lock đã quy định.
4. Tạo Proof `PENDING` liên kết one-to-one với Assignment.
5. Snapshot review content và `Job.pricePerTask`.
6. Chuyển Assignment thành `SUBMITTED`.
7. Không thay đổi `availableSlots`.

Response proof có thêm `assignmentId` để truy vết lượt giữ chỗ.

## 8. Client xử lý proof

Sau khi Freelancer submit, proof chuyển sang `PENDING` để Client sở hữu Job duyệt hoặc từ chối.
Toàn bộ API, quyền, thay đổi trạng thái và tác động payout của phía Client được mô tả tập trung tại
[Luồng nghiệp vụ Client](CLIENT_JOB_CREATION_FLOW.md#6-xem-và-xử-lý-proof).

## 9. Expiry cleanup

`JobAssignmentService.expireAssignments()` chạy theo scheduler:

1. Tìm các Assignment `CLAIMED` có `expiresAt <= now`.
2. Xử lý Job theo ID tăng dần để giữ lock order ổn định.
3. Khóa từng Job.
4. Chuyển Assignment thành `EXPIRED`.
5. Tăng `availableSlots` và mở lại Job nếu chưa `COMPLETED`.

Submit một assignment đã quá hạn bị từ chối bằng `409 Conflict`. Scheduler/lần claim sau chịu trách nhiệm hoàn tất việc trả slot.

## 10. Concurrency

### Hai Freelancer claim slot cuối

Cả hai request cùng cần pessimistic lock trên một Job. Request thắng giảm `availableSlots` từ 1 xuống 0 và commit.
Request sau đọc trạng thái mới và nhận `409 Conflict` với body:

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Job has no available slot"
}
```

Vì vậy hệ thống không oversell. Frontend nên tải lại danh sách Job thay vì tự động retry request claim.

### Hai Freelancer claim cùng content

Job lock tuần tự hóa việc kiểm tra và tạo Assignment trên cùng Job. Nếu Job vẫn còn slot, request sau thấy content
đã occupied và nhận `409 Conflict` với body:

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Review content has already been assigned"
}
```

Frontend nên tải lại Job và yêu cầu người dùng chọn content còn available; không tự động retry content cũ.

### Submit lặp lại

Assignment được khóa và chỉ `CLAIMED` mới submit được. Sau lần đầu nó là `SUBMITTED`; lần sau nhận `409`. Quan hệ one-to-one và unique `assignment_id` trên Proof tạo thêm lớp bảo vệ database.

### Approve lặp lại

Proof được khóa và chỉ `PENDING` mới review được. Request lặp không cộng payout lần hai.

## 11. HTTP status chính

| Status | Trường hợp |
| ---: | --- |
| `201` | Claim hoặc submit proof thành công. |
| `200` | Đọc danh sách, approve hoặc reject thành công. |
| `204` | Cancel assignment thành công. |
| `400` | Payload không hợp lệ. |
| `401` | Thiếu/sai JWT. |
| `403` | Sai role hoặc không sở hữu Assignment/Job. |
| `404` | Assignment hoặc Proof không tồn tại. |
| `409` | Hết slot, content đã giữ, assignment hết hạn/sai trạng thái hoặc proof đã xử lý. |

## 12. Test hiện có

`JobAssignmentIntegrationTest` kiểm tra:

- Claim một trong 10 slot làm `availableSlots` giảm đúng một.
- Assignment xuất hiện trong danh sách của Freelancer.
- Hai Freelancer không claim cùng review content.
- Cancel trả slot.
- Scheduler cleanup chuyển assignment hết hạn thành `EXPIRED` và trả slot.
- Submit dùng Assignment và không trừ slot lần hai.

`FreelancerJobFlowIntegrationTest` kiểm tra toàn luồng claim → submit → approve/reject và khả năng claim lại sau rejection.

Toàn bộ suite hiện có 38 test và đã chạy thành công. Đã có test migration database mới/cũ, constraint assignment, test đa luồng cho AccountBalance và
idempotency tạo Job trên H2; chưa có test đa luồng slot/payout trên MySQL thật.

## 13. Giới hạn còn lại

- Flyway `V1` tạo full schema và `V2` thêm unique constraint generated-column cho assignment active.
- Constraint active proof theo Job/Freelancer và Job/content vẫn chưa có ở database.
- Chưa có API gia hạn/heartbeat assignment.
- Cleanup chạy trong một transaction và chưa phân batch; cần cải thiện khi dữ liệu lớn.
- Level eligibility được kiểm tra theo Google Maps account được chọn lúc claim.
- Chưa có phân trang/lọc assignment và proof.
- Ảnh proof upload trực tiếp lên R2 theo [OBJECT_STORAGE.md](OBJECT_STORAGE.md); payload submit dùng object key.
- Balance đã có ledger và giữ tiền tổng hợp trong `held`; chưa có reservation/escrow tách riêng theo từng Job.
