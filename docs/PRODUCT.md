# Product Requirements — Review Shop

## 1. Tổng quan

Review Shop là backend kết nối Client có nhu cầu tạo nhiệm vụ đánh giá với Freelancer thực hiện nhiệm vụ và gửi bằng chứng (proof).

Tài liệu này phản ánh trạng thái code và quyết định sản phẩm tại ngày **28/07/2026**. Quy ước:

- ✅ **Đã thực hiện**: có code triển khai và có thể gọi qua API.
- 🟡 **Một phần**: đã có một phần mô hình hoặc luồng, nhưng chưa đáp ứng đầy đủ yêu cầu sản phẩm.
- ❌ **Chưa thực hiện**: chưa tìm thấy luồng triển khai trong code hiện tại.

## 2. Trạng thái MVP

| Nhóm chức năng | Trạng thái | Hiện trạng trong code |
| --- | --- | --- |
| Đăng ký, đăng nhập | ✅ | Đăng ký Client/Freelancer, đăng nhập bằng email và mật khẩu BCrypt. Không cho đăng ký Admin qua API public. |
| JWT và phân quyền | ✅ | Access token JWT, kiểm tra issuer/audience/user version, phân quyền `CLIENT`, `FREELANCER`, `ADMIN`. |
| Refresh token | ✅ | Lưu token dạng hash, rotation, phát hiện reuse, thu hồi theo token family, cookie HttpOnly và CSRF token. |
| Quên/đặt lại mật khẩu | ✅ | OTP 6 số gửi email, lưu hash, có hạn dùng và giới hạn số lần thử; reset sẽ vô hiệu access/refresh token cũ. |
| Client tạo Job | ✅ | Validate dữ liệu, Google Maps URL, Required Level, giá tối thiểu, snapshot phí và tính ngân sách. |
| Client quản lý Job | ✅ | Client được tạo, liệt kê và xem chi tiết Job của chính mình. Theo quyết định sản phẩm, Client không được sửa, hủy hoặc xóa Job; khi cần thay đổi số lượng review phải tạo Job mới. |
| Freelancer xem Job mở | ✅ | Có danh sách Job `OPEN` còn slot và trạng thái các review content. |
| Freelancer nhận Job | ✅ | `JobAssignment` giữ một slot/review content trong 10 phút; có thể cancel và tự hết hạn. |
| Kiểm tra level Freelancer | ✅ | Kiểm tra eligibility của Google Maps contributor profile công khai qua SerpApi; chưa chứng minh ownership. API eligibility phục vụ khóa/mở nút nhận Job và claim kiểm tra lại snapshot account được chọn. |
| Freelancer gửi/xem proof | ✅ | Upload ảnh trực tiếp lên R2, gửi object key và nhận presigned URL khi xem proof. |
| Client xem/duyệt/từ chối proof | ✅ | Kiểm tra quyền sở hữu Job, chỉ xử lý proof `PENDING`, bắt buộc lý do từ chối. |
| Quản lý slot và đồng thời | ✅ | Claim khóa ngắn trên Job và giữ slot qua Assignment; submit không trừ lần hai; expire/cancel/reject trả slot. |
| Trả thưởng | 🟡 | Đã có bảng số dư, sổ giao dịch bất biến, giữ ngân sách Job và trả thưởng lũy đẳng; chưa kết nối cổng thanh toán/rút tiền thực tế. |
| Required Level | 🟡 | User đã đăng nhập được đọc; Admin tạo, sửa, xóa; đã có rank Local Guide 1–10, chưa có trạng thái active. |
| Platform fee | ✅ | Admin đọc/cập nhật tỷ lệ; Job lưu snapshot tỷ lệ và số phí lúc tạo. |
| Phân trang/lọc | ❌ | Các API danh sách trả toàn bộ dữ liệu; chưa lọc proof theo trạng thái. |
| Migration database | ✅ | Flyway `V1` tạo đầy đủ schema, `V2` bảo vệ assignment active; Hibernate mặc định chỉ `validate`. |
| Test tự động | 🟡 | Có 38 unit/integration test, gồm test migration database mới/cũ, constraint assignment, đồng thời AccountBalance và idempotency tạo Job; chưa có test đồng thời slot/payout trên MySQL thật. |

## 3. Actor và khả năng hiện có

### 3.1 Public

Đã thực hiện:

- Đăng ký tài khoản `CLIENT` hoặc `FREELANCER`.
- Đăng nhập, refresh token và logout.
- Yêu cầu OTP và đặt lại mật khẩu.
- Xem danh sách hoặc chi tiết Required Level.

Job không phải dữ liệu public; chỉ Freelancer được xem danh sách Job mở qua API riêng.

### 3.2 Client

Đã thực hiện:

- Tạo Job.
- Liệt kê và xem chi tiết các Job của mình.
- Xem toàn bộ proof thuộc các Job do mình sở hữu.
- Duyệt hoặc từ chối proof của Job do mình sở hữu.
- Nhận các trường slot, ngân sách và trạng thái trong response khi tạo Job.
- Xem số dư `available`/`held` và tạo yêu cầu nạp tiền `PENDING`.
- Tạo Job có `Idempotency-Key`; retry cùng payload trả Job cũ và không giữ tiền lần hai.

Chưa thực hiện:

- Lọc/phân trang proof.
- Tích hợp cổng thanh toán thực tế, lịch sử giao dịch và rút tiền.

Quy tắc quản lý Job:

- Job đã tạo là bản ghi nghiệp vụ bất biến đối với Client; không cung cấp API để Client sửa, hủy hoặc xóa Job.
- Client không được thay đổi số lượng review của Job hiện có.
- Khi cần tăng, giảm hoặc thay đổi số lượng review, Client phải tạo một Job mới với số lượng mong muốn.
- Quy tắc này bảo toàn dữ liệu đối soát, ngân sách và doanh thu của từng Job.

### 3.3 Freelancer

Đã thực hiện:

- Xem Job `OPEN` còn slot.
- Claim một slot và review content chưa bị giữ trong thời hạn mặc định 10 phút.
- Xem hoặc hủy assignment của chính mình.
- Gửi proof gồm HTTPS share link và từ 1 đến 10 URL ảnh.
- Xem lịch sử proof của chính mình.
- Nhận tiền vào `balance` khi proof được duyệt.

Chưa thực hiện:

- Hồ sơ/cấp độ của Freelancer.
- Lọc Job theo Required Level của Freelancer.
- Gia hạn assignment hoặc heartbeat trong lúc làm việc.
- Rút tiền và xem lịch sử giao dịch.

### 3.4 Admin

Đã thực hiện:

- Tạo tài khoản Admin từ biến môi trường khi khởi động.
- CRUD Required Level.
- Xem và cập nhật platform fee.

Chưa thực hiện:

- Quản lý người dùng, khóa tài khoản hoặc đổi role.
- Quản lý Job/proof và xử lý tranh chấp.
- Dashboard hoặc báo cáo quản trị.

## 4. Mô hình và quy tắc đã triển khai

### 4.1 Required Level

Model hiện tại gồm:

- `id`.
- `description`.
- `pricePerReview` lớn hơn 0, tối đa 2 chữ số thập phân.
- `rank` Local Guide từ 1 đến 10; nếu request không truyền thì service dùng `1`.
- `version`, `createdAt`, `updatedAt`.

Khi tạo Job, `pricePerReview` phải lớn hơn hoặc bằng giá của Required Level đã chọn. Khi claim,
Google Maps account được chọn phải có `localGuideLevel >= requiredLevel.rank`. Required Level chưa
có trạng thái active.

### 4.2 Job

Job hiện lưu:

- Client sở hữu, tiêu đề, mô tả và Google Maps URL hợp lệ.
- Required Level và giá mỗi review.
- Danh sách review content dạng JSON.
- Tổng slot, slot còn trống và slot hoàn thành.
- Platform fee snapshot, tổng ngân sách, ngân sách Freelancer và ngân sách còn lại.
- Trạng thái và optimistic-lock version.
- `idempotencyKey` theo Client và SHA-256 request fingerprint để chống tạo/giữ tiền lặp.

Khi tạo Job:

```text
totalBudget = pricePerReview × totalReviews
platformFeeAmount = totalBudget × platformFeeRate
freelancerBudget = totalBudget - platformFeeAmount
pricePerTask = freelancerBudget / totalReviews
```

Lưu ý: code hiện coi `pricePerReview × totalReviews` là tổng tiền Client khai báo, sau đó trừ platform fee khỏi phần trả Freelancer. Đây không phải công thức cộng phí vào trên tổng tiền như mô tả cũ.

### 4.3 Vòng đời Job

```text
OPEN
  └─ hết slot khả dụng khi có proof PENDING/APPROVED → IN_PROGRESS

IN_PROGRESS
  ├─ một proof bị REJECTED, slot được trả lại → OPEN
  └─ đủ số proof APPROVED → COMPLETED
```

- `OPEN`: còn slot và nhận proof.
- `IN_PROGRESS`: toàn bộ slot đang được giữ/đã duyệt nhưng chưa đủ proof duyệt.
- `COMPLETED`: số slot hoàn thành bằng tổng slot; không nhận thêm proof.
- `CANCELLED`: đã có trong enum nhưng chưa có luồng/API chuyển trạng thái.

### 4.4 Vòng đời Proof

```text
PENDING ── approve ──> APPROVED
   └────── reject ───> REJECTED
```

Quy tắc đã thực hiện:

- Freelancer phải claim bằng Google Maps account hợp lệ trước khi gửi proof.
- Job phải `OPEN` và còn slot tại thời điểm claim; submit dùng Assignment `CLAIMED` còn hạn nên Job có thể đang `IN_PROGRESS`.
- Chủ Job không được gửi proof cho chính Job đó.
- Một Freelancer chỉ có tối đa một proof `PENDING` hoặc `APPROVED` trên cùng Job.
- Proof `REJECTED` cho phép Freelancer gửi lại.
- Nếu chọn review content, content đó không được có proof `PENDING` hoặc `APPROVED` khác.
- Submit và cập nhật slot chạy trong transaction với pessimistic lock trên Job.
- Chỉ Client sở hữu Job được approve/reject.
- Chỉ proof `PENDING` được xử lý; request lặp lại bị từ chối bằng conflict.
- Approve cộng payout đúng một lần, tăng completed slot và có thể hoàn thành Job.
- Reject bắt buộc lý do, trả slot và mở lại Job.

Thiếu sót hiện tại:

- Assignment active đã có unique constraint theo Job/Freelancer và Job/review-content bằng generated column; proof active vẫn dựa vào lock và kiểm tra application.
- Chưa có thời hạn xử lý, tự động hết hạn hoặc tranh chấp proof.

### 4.5 Số dư và thanh toán

Đã thực hiện mô hình tài chính MVP:

- `account_balances` lưu snapshot `available`/`held`; `account_transactions` lưu lịch sử bất biến.
- Khi tạo Job, toàn bộ `totalBudget` được chuyển từ available sang held trong cùng transaction.
- Khi approve, payout được chuyển từ held của Client sang available của Freelancer bằng idempotency key theo proof.
- Khi Job hoàn tất, platform fee được ghi vào tài khoản doanh thu và phần dư làm tròn được hoàn Client.
- Client có API xem số dư và tạo `DepositOrder` ở trạng thái `PENDING`.
- `DepositService.confirm` khóa DepositOrder, kiểm tra đúng số tiền và cộng `available` lũy đẳng; hiện chưa có webhook public gọi luồng này.

Chưa thực hiện:

- Adapter cổng thanh toán và xác thực webhook.
- Rút tiền, thu hồi giao dịch, hoàn tiền trong các trường hợp do hệ thống/Admin xử lý và đối soát.
- Test migration và concurrency trên MySQL thật bằng Testcontainers.
- Adapter/provider webhook để hoàn tất nạp tiền thực tế; rút tiền, hoàn tiền và đối soát.

Do đó balance hiện tại chỉ phục vụ MVP kỹ thuật, chưa đủ an toàn cho tiền thật.

## 5. Xác thực và bảo mật

Đã thực hiện:

- BCrypt cho mật khẩu; mật khẩu tối thiểu 12 ký tự.
- JWT HS256 có issuer, audience, thời hạn và role claim.
- `authVersion` để vô hiệu access token cũ sau khi reset mật khẩu.
- Refresh token ngẫu nhiên chỉ lưu SHA-256 hash, có rotation và revoke family.
- Refresh token trong HttpOnly/SameSite Strict cookie; refresh/logout yêu cầu double-submit CSRF token.
- Rate limit in-memory theo IP/email cho register, login, refresh và password reset.
- OTP reset được HMAC với pepper, có TTL và tối đa 5 lần thử.
- Response forgot-password thống nhất để giảm account enumeration.
- CORS cấu hình qua biến môi trường.

Chưa thực hiện hoặc còn hạn chế:

- Rate limiter đang nằm trong bộ nhớ một instance, chưa phù hợp khi chạy nhiều instance và sẽ mất dữ liệu khi restart.
- Chưa có xác minh email khi đăng ký, MFA, khóa tài khoản hoặc audit log.
- CSRF toàn cục của Spring bị tắt; bảo vệ CSRF tùy chỉnh chỉ áp dụng cho refresh/logout cookie flow.

## 6. API hiện có

| Method | Endpoint | Quyền | Trạng thái |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Public | ✅ |
| POST | `/api/v1/auth/login` | Public | ✅ |
| POST | `/api/v1/auth/refresh` | Public + refresh/CSRF cookie | ✅ |
| POST | `/api/v1/auth/logout` | Public + refresh/CSRF cookie nếu có token | ✅ |
| POST | `/api/v1/auth/forgot-password` | Public | ✅ |
| POST | `/api/v1/auth/reset-password` | Public | ✅ |
| GET | `/api/v1/required-levels` | Authenticated | ✅ |
| GET | `/api/v1/required-levels/{id}` | Authenticated | ✅ |
| POST | `/api/v1/required-levels` | Admin | ✅ |
| PUT | `/api/v1/required-levels/{id}` | Admin | ✅ |
| DELETE | `/api/v1/required-levels/{id}` | Admin | ✅ |
| GET | `/api/v1/admin/platform-settings` | Admin | ✅ |
| PUT | `/api/v1/admin/platform-settings/fee-rate` | Admin | ✅ |
| GET | `/api/v1/client/account` | Client | ✅ |
| POST | `/api/v1/client/account/deposits` | Client | ✅, chỉ tạo `PENDING` |
| POST | `/api/v1/jobs` | Client, bắt buộc `Idempotency-Key` | ✅ |
| GET | `/api/v1/jobs` | Client, chỉ Job sở hữu | ✅ |
| GET | `/api/v1/jobs/{jobId}` | Client, chỉ Job sở hữu | ✅ |
| GET | `/api/v1/freelancer/jobs/open` | Freelancer | ✅ |
| GET | `/api/v1/freelancer/jobs/{jobId}/eligible-google-maps-accounts` | Freelancer | ✅ |
| POST | `/api/v1/freelancer/jobs/{jobId}/assignments` | Freelancer | ✅ |
| GET | `/api/v1/freelancer/assignments` | Freelancer | ✅ |
| DELETE | `/api/v1/freelancer/assignments/{assignmentId}` | Freelancer sở hữu assignment | ✅ |
| POST | `/api/v1/freelancer/jobs/{jobId}/proofs` | Freelancer | ✅ |
| GET | `/api/v1/freelancer/proofs` | Freelancer | ✅ |
| GET | `/api/v1/freelancer/account` | Freelancer | ✅ |
| POST | `/api/v1/freelancer/google-maps-accounts/verify` | Freelancer | ✅ |
| GET | `/api/v1/freelancer/google-maps-accounts` | Freelancer | ✅ |
| PATCH | `/api/v1/freelancer/google-maps-accounts/{id}/type` | Freelancer sở hữu account | ✅ |
| GET | `/api/v1/client/proofs` | Client | ✅ |
| GET | `/api/v1/client/proofs/{proofId}` | Client sở hữu Job | ✅ |
| GET | `/api/v1/client/proofs/history` | Client | ✅ |
| GET | `/api/v1/client/proofs/history/{proofId}` | Client sở hữu Job | ✅ |
| POST | `/api/v1/client/proofs/{proofId}/approve` | Client sở hữu Job | ✅ |
| POST | `/api/v1/client/proofs/{proofId}/reject` | Client sở hữu Job | ✅ |

## 7. Backlog ưu tiên

### Ưu tiên cao — để hoàn thiện MVP

- Duy trì mọi thay đổi schema tiếp theo bằng migration `V3+`; không sửa migration đã release.
- Bổ sung test concurrency cho slot và duyệt proof.
- Thêm database constraints phù hợp để bảo vệ invariant.
- Chuẩn hóa error response cho mọi exception.
- Thêm phân trang và lọc trạng thái cho danh sách Job/proof.

### Ưu tiên cao — trước khi dùng tiền thật

- Tích hợp và xác minh webhook cổng thanh toán để xác nhận `DepositOrder`.
- Bổ sung reservation/escrow riêng theo từng Job thay vì chỉ tổng `held` theo Client.
- Gia cố idempotency tạo Deposit khi hai request cùng key chạy đồng thời.
- Luồng rút tiền, hoàn tiền, chargeback và đối soát.
- Audit log và test đồng thời cho mọi biến động số dư.

### Ngoài MVP hiện tại

- Chat và notification thời gian thực.
- Khiếu nại/giải quyết tranh chấp.
- Cổng thanh toán bên thứ ba.
- Xếp hạng và đánh giá người dùng.
- Kiểm chứng proof bằng AI.
- Hỗ trợ nhiều loại tiền tệ.
- Quản trị người dùng và báo cáo.

## 8. Tiêu chí hoàn thành MVP cập nhật

MVP chỉ được xem là hoàn thành khi tất cả mục sau đạt yêu cầu:

- ✅ Đăng ký, đăng nhập, refresh, logout và reset mật khẩu hoạt động.
- ✅ Backend phân quyền và kiểm tra ownership cho proof.
- ✅ Client tạo Job hợp lệ.
- ✅ Freelancer xem Job mở, gửi proof và xem proof của mình.
- ✅ Client xem, duyệt hoặc từ chối proof.
- ✅ Slot được giữ/trả và Job chuyển trạng thái theo proof.
- ✅ Không cộng payout hai lần ở luồng xử lý tuần tự.
- ✅ Admin quản lý Required Level và platform fee.
- ✅ Freelancer xem Job mở, chỉ nhận được khi chọn Google Maps account đủ level.
- ✅ Client được tạo, xem danh sách và chi tiết Job của mình; không sửa, hủy hoặc xóa theo quyết định sản phẩm.
- ✅ Tạo Job giữ tiền nguyên tử và retry cùng `Idempotency-Key` không tạo Job/giữ tiền lặp.
- ❌ Có test chứng minh không vượt slot khi request chạy đồng thời.
- ✅ Flyway quản lý full baseline và assignment constraint; Hibernate chỉ validate schema.
- ❌ Các API danh sách quan trọng có phân trang/lọc.
- 🟡 Tài liệu đã phản ánh code hiện tại, nhưng cần tiếp tục cập nhật cùng mỗi thay đổi nghiệp vụ.

## 9. Quyết định sản phẩm chưa chốt

- Một user có thể đồng thời là Client và Freelancer hay chỉ có một role?
- Cấp độ Freelancer được tính/nâng như thế nào?
- Required Level cần tên/code, trạng thái active và chính sách thay đổi `rank` theo cấu trúc nào?
- Freelancer được gửi lại bao nhiêu lần sau khi bị reject?
- Có cho phép gia hạn assignment không, tối đa bao nhiêu lần?
- Client có thời hạn duyệt proof không; proof quá hạn xử lý thế nào?
- Platform fee do Client hay Freelancer chịu? Code hiện tại đang trừ phí khỏi tổng ngân sách Freelancer.
- Quy trình hoàn tiền, tranh chấp và rút tiền như thế nào?
