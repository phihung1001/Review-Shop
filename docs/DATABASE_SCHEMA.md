# Tài liệu cơ sở dữ liệu

Migration `V4__add_withdrawals.sql` bổ sung `payout_methods`, `withdrawals`, cấu hình phí rút tiền và các ledger type giữ/quyết toán/hoàn tiền. Withdrawal snapshot tài khoản ngân hàng cùng QR object key; số tài khoản được mã hóa AES-256-GCM. Xem [WITHDRAWAL_FLOW.md](WITHDRAWAL_FLOW.md).

## 1. Phạm vi và nguồn sự thật

Tài liệu này mô tả toàn bộ mô hình dữ liệu đang được ánh xạ bởi các JPA entity trong
`src/main/java/com/example/reviewshopbackend/entity`.

Hiện hệ thống có **12 bảng vật lý**:

1. `users`
2. `refresh_tokens`
3. `password_reset_tokens`
4. `required_levels`
5. `platform_settings`
6. `google_maps_accounts`
7. `jobs`
8. `job_assignments`
9. `job_proofs`
10. `account_balances`
11. `account_transactions`
12. `deposit_orders`

`ReviewContent` là cấu trúc được lưu trong cột JSON của `jobs`, không có bảng riêng.

Schema được Flyway quản lý: `V1__baseline_schema.sql` tạo đầy đủ 12 bảng nghiệp vụ, foreign key,
unique constraint và index; `V2__add_active_assignment_constraints.sql` bổ sung invariant assignment
active. Hibernate chỉ dùng `ddl-auto=validate` để phát hiện entity lệch schema, không tự sửa database.

## 2. Quy ước chung

| Quy ước | Ý nghĩa |
| --- | --- |
| `BIGINT AUTO_INCREMENT` | Khóa chính sinh tự động với `GenerationType.IDENTITY`. |
| `DECIMAL(19,2)` | Số tiền có tối đa 17 chữ số phần nguyên và 2 chữ số thập phân. |
| `TIMESTAMP` | Trong Java được ánh xạ thành `Instant`; dữ liệu nên được lưu theo UTC. |
| `version` | Trường optimistic locking do `@Version` quản lý. |
| `created_at` | Hibernate tự gán khi tạo và không cập nhật lại. |
| `updated_at` | Hibernate tự gán lại khi entity được cập nhật. |
| Enum dạng chuỗi | Giá trị enum được lưu bằng tên, không lưu ordinal. |
| Quan hệ `LAZY` | Entity liên quan chỉ được tải khi được truy cập trong persistence context. |

Các foreign key hiện không khai báo cascade delete trong entity. Không nên xóa bản ghi cha khi còn
dữ liệu con; nghiệp vụ nên dùng trạng thái vô hiệu hóa hoặc migration có chủ đích.

## 3. Sơ đồ quan hệ tổng quát

```text
users
 ├──< refresh_tokens
 ├──< password_reset_tokens
 ├──< google_maps_accounts
 ├──< jobs                         (vai trò Client)
 ├──< job_assignments              (vai trò Freelancer)
 ├──< job_proofs                   (vai trò Freelancer)
 ├──< account_balances
 └──< deposit_orders               (vai trò Client)

required_levels
 └──< jobs

jobs
 ├──< job_assignments
 └──< job_proofs

google_maps_accounts
 └──< job_assignments

job_assignments
 └─── job_proofs                   (quan hệ 1-0..1)

account_balances
 └──< account_transactions
```

## 4. Nhóm người dùng và xác thực

### 4.1. Bảng `users`

Lưu thông tin đăng nhập và vai trò của người dùng. Số dư tài chính không còn được lưu trong bảng
này mà nằm tại `account_balances`.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh người dùng. |
| `full_name` | `VARCHAR(255)` | Không | — | — | Họ tên hiển thị. |
| `email` | `VARCHAR(255)` | Không | — | UNIQUE | Email đăng nhập, được chuẩn hóa thành chữ thường ở service. |
| `password_hash` | `VARCHAR(255)` | Không | — | — | Mật khẩu đã băm bằng BCrypt; không lưu mật khẩu gốc. |
| `role` | `VARCHAR(20)` | Không | — | Enum | Vai trò duy nhất của user. |
| `auth_version` | `INT` | Không | `0` | — | Tăng khi cần vô hiệu hóa access token đã phát hành trước đó. |

Giá trị `role`:

| Giá trị | Ý nghĩa |
| --- | --- |
| `CLIENT` | Tạo và quản lý Job, duyệt proof, nạp và giữ tiền. |
| `FREELANCER` | Nhận Job, gửi proof và nhận thưởng. |
| `ADMIN` | Quản trị cấu hình hệ thống. |

Quy tắc:

- Email là duy nhất trong database.
- API đăng ký công khai không cho tạo `ADMIN`.
- Một user hiện chỉ có một role; chưa hỗ trợ đồng thời Client và Freelancer.
- Xóa user sẽ ảnh hưởng nhiều bảng con và hiện không có cascade delete.

### 4.2. Bảng `refresh_tokens`

Lưu refresh token ở dạng băm, hỗ trợ rotation, thu hồi theo token family và phát hiện token bị dùng lại.

| Cột | Kiểu | Null | Mặc định | Ràng buộc/index | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh refresh token. |
| `user_id` | `BIGINT` | Không | — | FK → `users.id`, index | Chủ sở hữu token. |
| `token_hash` | `VARCHAR(64)` | Không | — | UNIQUE | SHA-256 hash của token; không lưu token gốc. |
| `family_id` | `VARCHAR(36)` | Không | — | Index | Nhóm token thuộc cùng một chuỗi rotation. |
| `expires_at` | `TIMESTAMP` | Không | — | Index | Thời điểm token cụ thể hết hạn. |
| `family_expires_at` | `TIMESTAMP` | Không | — | — | Hạn tối đa của toàn bộ token family. |
| `used_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm token đã được dùng để rotation. |
| `revoked_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm token bị thu hồi. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm tạo token. |

Index:

- `idx_refresh_tokens_family(family_id)`
- `idx_refresh_tokens_user(user_id)`
- `idx_refresh_tokens_expiry(expires_at)`

Quy tắc:

- Repository khóa bi quan token khi tìm theo `token_hash`.
- Khi phát hiện reuse, toàn bộ `family_id` có thể bị thu hồi.
- Reset mật khẩu thu hồi tất cả refresh token đang hoạt động của user.
- Token hết hạn được xóa bằng tác vụ định kỳ.

### 4.3. Bảng `password_reset_tokens`

Lưu OTP đặt lại mật khẩu ở dạng hash.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh bản ghi. |
| `token_hash` | `VARCHAR(255)` | Không | — | UNIQUE | HMAC của email và OTP. |
| `user_id` | `BIGINT` | Không | — | FK → `users.id` | User yêu cầu đặt lại mật khẩu. |
| `expires_at` | `TIMESTAMP` | Không | — | — | Thời điểm OTP hết hạn. |
| `used_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm OTP được dùng hoặc bị vô hiệu hóa. |
| `failed_attempts` | `INT` | Không | `0` | — | Số lần nhập OTP sai. |

Quy tắc:

- Service hiện duy trì tối đa một token reset cho mỗi user bằng cách xóa token cũ trước khi tạo mới.
- Quy tắc “một token trên mỗi user” chưa có unique constraint trực tiếp trên `user_id`.
- OTP hết hạn, đã dùng hoặc đạt giới hạn số lần sai sẽ không còn hợp lệ.

## 5. Nhóm cấu hình

### 5.1. Bảng `required_levels`

Lưu cấp độ Google Maps yêu cầu và giá tối thiểu cho mỗi review.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh cấp độ. |
| `description` | `TEXT` | Không | — | — | Mô tả cấp độ. |
| `level_rank` | `INT` | Không | `1` | — | Local Guide level tối thiểu. |
| `price_per_review` | `DECIMAL(19,2)` | Không | — | — | Giá tối thiểu Client phải đặt cho mỗi review. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản entity. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm tạo. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật gần nhất. |

Quy tắc:

- `price_per_review` phải lớn hơn 0 theo validation của API/service.
- `level_rank` được đối chiếu với level đã xác minh của Google Maps account.
- Job giữ quan hệ đến Required Level; xóa level đang được Job sử dụng có thể vi phạm foreign key.

### 5.2. Bảng `platform_settings`

Lưu cấu hình toàn cục của nền tảng theo mô hình singleton.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | — | PK | Luôn sử dụng giá trị `1`. |
| `platform_fee_rate` | `DECIMAL(5,4)` | Không | — | — | Tỷ lệ phí, ví dụ `0.0500` tương ứng 5%. |
| `updated_by` | `VARCHAR(255)` | Có | `NULL` | — | Email Admin cập nhật gần nhất. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản cấu hình. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm khởi tạo. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật. |

Quy tắc:

- Ứng dụng chỉ sử dụng bản ghi `id = 1`.
- Tỷ lệ phí được snapshot vào Job khi Job được tạo; cập nhật cấu hình không làm đổi Job cũ.
- Database chưa có check constraint cho khoảng hợp lệ của tỷ lệ; validation nằm tại service/API.

## 6. Nhóm Google Maps account

### 6.1. Bảng `google_maps_accounts`

Lưu Google Maps Local Guide account đã được xác minh cho Freelancer.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh account. |
| `freelancer_id` | `BIGINT` | Không | — | FK → `users.id` | Freelancer sở hữu account. |
| `contributor_id` | `VARCHAR(30)` | Không | — | UNIQUE | Google Maps contributor ID. |
| `profile_url` | `VARCHAR(500)` | Không | — | — | URL hồ sơ Google Maps. |
| `account_name` | `VARCHAR(255)` | Không | — | — | Tên hiển thị tại thời điểm xác minh. |
| `thumbnail` | `VARCHAR(2048)` | Có | `NULL` | — | URL ảnh đại diện. |
| `local_guide_level` | `INT` | Không | — | — | Local Guide level đã xác minh. |
| `points` | `INT` | Không | — | — | Điểm Local Guide. |
| `review_count` | `INT` | Không | — | — | Số review tại thời điểm xác minh. |
| `account_type` | `VARCHAR(20)` | Có | `NULL` | Enum | Phân loại tài khoản. |
| `active` | `BOOLEAN` | Không | `true` trong entity | — | Account còn được phép dùng hay không. |
| `verified_at` | `TIMESTAMP` | Không | — | — | Thời điểm xác minh gần nhất. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản entity. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm liên kết account. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật. |

Giá trị `account_type`:

| Giá trị | Ý nghĩa |
| --- | --- |
| `VIETNAM` | Tài khoản được phân loại Việt Nam. |
| `FOREIGN` | Tài khoản được phân loại nước ngoài. |

Quy tắc:

- Một contributor ID chỉ được liên kết với một bản ghi trong toàn hệ thống.
- API danh sách chỉ trả account có `active = true`.
- Khi claim Job, dữ liệu quan trọng được snapshot sang `job_assignments` để lịch sử không đổi nếu
  Google Maps account được xác minh lại hoặc vô hiệu hóa sau đó.

## 7. Nhóm Job

### 7.1. Bảng `jobs`

Lưu nhiệm vụ, số slot, cấu hình giá và ngân sách đã snapshot tại thời điểm tạo.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh Job. |
| `client_id` | `BIGINT` | Không | — | FK → `users.id` | Client sở hữu Job. |
| `idempotency_key` | `VARCHAR(100)` | Có* | — | Unique cùng `client_id` | Khóa chống tạo Job và giữ tiền lặp khi Client retry. |
| `request_fingerprint` | `VARCHAR(64)` | Có* | — | SHA-256 | Dấu vân tay payload để phát hiện một key bị dùng với request khác. |
| `title` | `VARCHAR(255)` | Không | — | — | Tiêu đề Job. |
| `description` | `TEXT` | Không | — | — | Mô tả công việc. |
| `link_map` | `VARCHAR(2048)` | Không | — | — | Google Maps URL. |
| `required_level_id` | `BIGINT` | Không | — | FK → `required_levels.id` | Cấp độ yêu cầu. |
| `price_per_review` | `DECIMAL(19,2)` | Không | — | — | Giá Client khai báo cho mỗi review. |
| `review_contents` | `JSON` | Có | Danh sách rỗng trong entity | — | Danh sách nội dung review và URL ảnh gợi ý. |
| `price_per_task` | `DECIMAL(19,2)` | Không | — | — | Khoản payout snapshot cho mỗi proof được duyệt. |
| `total_slots` | `INT` | Không | — | — | Tổng số review/proof Job cần. Entity gọi là `totalReviews`. |
| `available_slots` | `INT` | Không | — | — | Số slot còn có thể nhận. |
| `completed_slots` | `INT` | Không | — | — | Số proof đã được duyệt. |
| `platform_fee_rate` | `DECIMAL(5,4)` | Không | — | — | Snapshot tỷ lệ phí nền tảng. |
| `platform_fee_amount` | `DECIMAL(19,2)` | Không | — | — | Tổng phí nền tảng của Job. |
| `total_budget` | `DECIMAL(19,2)` | Không | — | — | Tổng ngân sách được giữ từ Client. |
| `freelancer_budget` | `DECIMAL(19,2)` | Không | — | — | Ngân sách tối đa dành cho Freelancer. |
| `remaining_budget` | `DECIMAL(19,2)` | Không | — | — | Ngân sách Freelancer chưa giải ngân. |
| `status` | `VARCHAR(20)` | Không | — | Enum | Trạng thái Job. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản Job. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm tạo Job. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật. |

`idempotency_key` và `request_fingerprint` để nullable nhằm tương thích các Job cũ đã tồn tại trước
khi bổ sung idempotency; mọi Job mới tạo qua API đều bắt buộc có hai giá trị này. Ràng buộc
`uk_job_client_idempotency (client_id, idempotency_key)` bảo đảm một key chỉ tạo tối đa một Job cho
mỗi Client.

Giá trị `status`:

| Giá trị | Ý nghĩa |
| --- | --- |
| `OPEN` | Job còn slot và có thể được nhận. |
| `IN_PROGRESS` | Các slot đã được giữ/gửi proof nhưng Job chưa hoàn thành. |
| `COMPLETED` | Đã đủ số proof được duyệt và đã quyết toán. |
| `CANCELLED` | Đã hủy; enum đã có nhưng luồng hủy chưa hoàn chỉnh. |

Công thức hiện tại:

```text
totalBudget             = pricePerReview × totalSlots
platformFeeAmount       = totalBudget × platformFeeRate
freelancerBudget        = totalBudget - platformFeeAmount
pricePerTask            = freelancerBudget / totalSlots, làm tròn xuống 2 chữ số
remainingBudget ban đầu = freelancerBudget
```

Quy tắc tài chính:

- Toàn bộ `total_budget` phải được chuyển từ `available` sang `held` của Client trong transaction
  tạo Job.
- Mỗi payout trừ `remaining_budget` và `held` của Client.
- Khi hoàn thành, phí nền tảng được chuyển sang tài khoản doanh thu; phần dư làm tròn được hoàn Client.

Quy tắc slot:

```text
0 <= available_slots <= total_slots
0 <= completed_slots <= total_slots
```

Các giới hạn trên đang chủ yếu được service bảo vệ; entity chưa khai báo check constraint tương ứng.

#### Cấu trúc JSON `review_contents`

Mỗi phần tử có dạng:

```json
{
  "content": "Nội dung review gợi ý",
  "images": [
    "https://example.com/image.jpg"
  ]
}
```

| Trường | Kiểu JSON | Ý nghĩa |
| --- | --- | --- |
| `content` | Chuỗi | Nội dung review; `null` được chuẩn hóa thành chuỗi rỗng. |
| `images` | Mảng chuỗi | Danh sách URL ảnh; `null` được chuẩn hóa thành mảng rỗng. |

### 7.2. Bảng `job_assignments`

Lưu lượt giữ slot có thời hạn của Freelancer và snapshot Google Maps account đã dùng.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh assignment. |
| `job_id` | `BIGINT` | Không | — | FK → `jobs.id` | Job được nhận. |
| `freelancer_id` | `BIGINT` | Không | — | FK → `users.id` | Freelancer nhận Job. |
| `google_maps_account_id` | `BIGINT` | Có | `NULL` | FK → `google_maps_accounts.id` | Account được chọn khi claim. |
| `google_maps_account_name` | `VARCHAR(255)` | Có | `NULL` | — | Snapshot tên Google account. |
| `google_maps_contributor_id` | `VARCHAR(30)` | Có | `NULL` | — | Snapshot contributor ID. |
| `local_guide_level` | `INT` | Có | `NULL` | — | Snapshot Local Guide level. |
| `google_maps_account_type` | `VARCHAR(20)` | Có | `NULL` | Enum | Snapshot loại account. |
| `review_content_index` | `INT` | Có | `NULL` | — | Vị trí nội dung trong `jobs.review_contents`. |
| `active_freelancer_id` | `BIGINT` generated | Có | Tính từ status | Unique cùng `job_id` | Bằng `freelancer_id` khi assignment chiếm chỗ, ngược lại `NULL`. |
| `active_review_content_index` | `INT` generated | Có | Tính từ status | Unique cùng `job_id` | Bằng content index khi assignment chiếm chỗ, ngược lại `NULL`. |
| `status` | `VARCHAR(20)` | Không | — | Enum | Trạng thái assignment. |
| `expires_at` | `TIMESTAMP` | Không | — | — | Hạn giữ slot khi ở `CLAIMED`. |
| `submitted_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm Freelancer gửi proof. |
| `finished_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm approve, reject, expire hoặc cancel. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản assignment. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm claim. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật. |

Giá trị `status`:

| Giá trị | Ý nghĩa |
| --- | --- |
| `CLAIMED` | Đang giữ slot và chưa gửi proof. |
| `SUBMITTED` | Đã gửi proof. |
| `APPROVED` | Proof tương ứng đã được duyệt. |
| `REJECTED` | Proof tương ứng bị từ chối. |
| `EXPIRED` | Hết thời gian giữ slot. |
| `CANCELLED` | Freelancer chủ động hủy. |

Quy tắc:

- Repository khóa bi quan assignment khi submit/cập nhật.
- Một assignment chỉ có tối đa một proof nhờ unique constraint tại `job_proofs.assignment_id`.
- Service và database cùng ngăn một Freelancer có nhiều assignment chiếm chỗ trên cùng Job.
- Service và database cùng ngăn hai assignment chiếm cùng `review_content_index` của một Job.
- `CLAIMED`, `SUBMITTED`, `APPROVED` được xem là chiếm chỗ; `REJECTED`, `EXPIRED`, `CANCELLED`
  sinh generated value `NULL`, vì vậy Freelancer/content có thể được dùng lại.
- Job không có review content lưu index `NULL`; unique constraint cho phép nhiều hàng `NULL`.

### 7.3. Bảng `job_proofs`

Lưu bằng chứng hoàn thành Job và snapshot khoản trả thưởng.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh proof. |
| `assignment_id` | `BIGINT` | Không | — | FK → `job_assignments.id`, UNIQUE | Assignment tạo ra proof. |
| `job_id` | `BIGINT` | Không | — | FK → `jobs.id` | Job liên quan. |
| `freelancer_id` | `BIGINT` | Không | — | FK → `users.id` | Freelancer gửi proof. |
| `review_content_index` | `INT` | Có | `NULL` | — | Vị trí nội dung review được sử dụng. |
| `review_content_snapshot` | `TEXT` | Có | `NULL` | — | Snapshot nội dung review lúc submit. |
| `share_link` | `VARCHAR(2048)` | Không | — | — | HTTPS share link của review. |
| `proof_images` | `JSON` | Không | Mảng rỗng trong entity | — | Danh sách URL ảnh bằng chứng. |
| `status` | `VARCHAR(20)` | Không | — | Enum | Trạng thái xét duyệt. |
| `rejection_reason` | `TEXT` | Có | `NULL` | — | Lý do từ chối. |
| `payout_amount` | `DECIMAL(19,2)` | Không | — | — | Snapshot khoản thưởng từ `jobs.price_per_task`. |
| `reviewed_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm Client duyệt hoặc từ chối. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản proof. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm submit. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật. |

Giá trị `status`:

| Giá trị | Ý nghĩa |
| --- | --- |
| `PENDING` | Đang chờ Client xử lý. |
| `APPROVED` | Được chấp nhận và đã phát sinh payout. |
| `REJECTED` | Bị từ chối và slot được trả lại. |

Quy tắc:

- Chỉ proof `PENDING` được approve hoặc reject.
- Repository khóa bi quan proof trước khi xét duyệt.
- `payout_amount` không thay đổi nếu giá hoặc phí của Job thay đổi sau khi submit.
- Payout được bảo vệ thêm bằng unique `idempotency_key` trong `account_transactions`.
- Service ngăn proof hoạt động trùng cặp Job/Freelancer hoặc Job/review content; chưa có constraint
  trực tiếp cho các điều kiện phụ thuộc trạng thái này.

#### Cấu trúc JSON `proof_images`

```json
[
  "https://example.com/proof-1.jpg",
  "https://example.com/proof-2.jpg"
]
```

Proof mới lưu R2 object key; khi trả API backend đổi key thành presigned GET URL. HTTPS URL cũ vẫn tương thích.

## 8. Nhóm tài chính

### 8.1. Bảng `account_balances`

Lưu snapshot số dư hiện tại để đọc và khóa nhanh. Lịch sử biến động nằm tại
`account_transactions`.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh account. |
| `account_key` | `VARCHAR(100)` | Không | — | UNIQUE | Khóa nghiệp vụ duy nhất. |
| `account_type` | `VARCHAR(30)` | Không | — | Enum | Loại tài khoản. |
| `user_id` | `BIGINT` | Có | `NULL` | FK → `users.id` | User sở hữu; `NULL` với account hệ thống. |
| `currency` | `VARCHAR(3)` | Không | — | — | Mã tiền tệ, hiện dùng `VND`. |
| `available_amount` | `DECIMAL(19,2)` | Không | `0.00` trong entity | CHECK ≥ 0 | Số tiền có thể sử dụng/rút. |
| `held_amount` | `DECIMAL(19,2)` | Không | `0.00` trong entity | CHECK ≥ 0 | Số tiền đang giữ cho Job/nghiệp vụ khác. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản account. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm tạo account. |
| `updated_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm cập nhật số dư. |

Giá trị `account_type`:

| Giá trị | Mẫu `account_key` | Ý nghĩa |
| --- | --- | --- |
| `USER` | `USER:{userId}:VND` | Tài khoản của Client/Freelancer. |
| `PLATFORM_REVENUE` | `PLATFORM_REVENUE:VND` | Doanh thu phí nền tảng. |

Constraint:

- `uk_account_balance_key(account_key)`
- `CHECK (available_amount >= 0 AND held_amount >= 0)`

Quy tắc đồng thời:

- Account được đọc bằng pessimistic write lock trước khi thay đổi.
- Truy vấn khóa phải là lần đọc account đầu tiên trong transaction để tránh giữ version cũ.
- Khi nhiều request cập nhật cùng account, các transaction được tuần tự hóa để không lost update.

Điểm cần mở rộng:

- Database chưa có unique constraint trực tiếp trên `(user_id, currency)`; tính duy nhất hiện dựa
  trên `account_key`.
- Chưa có account riêng cho withdrawal clearing, chargeback hoặc dispute.

### 8.2. Bảng `account_transactions`

Lưu sổ giao dịch bất biến. Mỗi hàng thể hiện biến động trên một `account_balances`.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh entry. |
| `account_balance_id` | `BIGINT` | Không | — | FK → `account_balances.id` | Account bị thay đổi. |
| `type` | `VARCHAR(40)` | Không | — | Enum | Loại nghiệp vụ. |
| `available_delta` | `DECIMAL(19,2)` | Không | — | — | Biến động số dư khả dụng; có thể âm hoặc dương. |
| `held_delta` | `DECIMAL(19,2)` | Không | — | — | Biến động số dư đang giữ; có thể âm hoặc dương. |
| `available_after` | `DECIMAL(19,2)` | Không | — | — | Số dư khả dụng ngay sau entry. |
| `held_after` | `DECIMAL(19,2)` | Không | — | — | Số dư đang giữ ngay sau entry. |
| `reference_type` | `VARCHAR(40)` | Không | — | — | Loại đối tượng nguồn, ví dụ `JOB`, `JOB_PROOF`. |
| `reference_id` | `VARCHAR(100)` | Không | — | — | ID nghiệp vụ nguồn dưới dạng chuỗi. |
| `idempotency_key` | `VARCHAR(160)` | Không | — | UNIQUE | Khóa chống ghi giao dịch lặp. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm ghi entry. |

Giá trị `type`:

| Giá trị | Biến động chính | Ý nghĩa |
| --- | --- | --- |
| `DEPOSIT` | `available +` | Nạp tiền đã được xác nhận. |
| `JOB_FUND_HOLD` | `available -`, `held +` | Giữ toàn bộ ngân sách khi tạo Job. |
| `JOB_REWARD` | Client `held -`, Freelancer `available +` | Giải ngân proof đã duyệt. |
| `PLATFORM_FEE` | Client `held -`, platform `available +` | Quyết toán phí nền tảng. |
| `JOB_REMAINDER_REFUND` | Client `held -`, `available +` | Hoàn phần dư làm tròn. |

Mẫu khóa lũy đẳng:

```text
DEPOSIT:{depositId}
JOB_HOLD:{jobId}
JOB_REWARD:{proofId}:ESCROW
JOB_REWARD:{proofId}:FREELANCER
PLATFORM_FEE:{jobId}:ESCROW
PLATFORM_FEE:{jobId}:CREDIT
JOB_REMAINDER_REFUND:{jobId}
```

Quy tắc:

- Bản ghi đã tạo không được sửa hoặc xóa trong nghiệp vụ bình thường.
- Nếu cần hoàn tác, nên tạo entry đối ứng thay vì cập nhật lịch sử cũ.
- `available_after` và `held_after` hỗ trợ kiểm toán, phát hiện sai lệch và dựng lại số dư.
- Một giao dịch chuyển tiền tạo entry cho từng account liên quan. Hiện chưa có `transaction_group_id`
  chung; các phía được liên kết bằng `reference_type`, `reference_id` và quy ước idempotency key.

### 8.3. Bảng `deposit_orders`

Lưu yêu cầu nạp tiền và trạng thái xác nhận của nhà cung cấp.

| Cột | Kiểu | Null | Mặc định | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `BIGINT` | Không | Tự tăng | PK | Định danh yêu cầu nạp tiền. |
| `client_id` | `BIGINT` | Không | — | FK → `users.id` | Client tạo yêu cầu. |
| `requested_amount` | `DECIMAL(19,2)` | Không | — | — | Số tiền Client yêu cầu nạp. |
| `received_amount` | `DECIMAL(19,2)` | Có | `NULL` | — | Số tiền provider xác nhận đã nhận. |
| `currency` | `VARCHAR(3)` | Không | — | — | Loại tiền, hiện là `VND`. |
| `provider` | `VARCHAR(40)` | Không | — | UNIQUE cùng provider reference | Mã nhà cung cấp thanh toán. |
| `provider_reference` | `VARCHAR(120)` | Có | `NULL` | UNIQUE cùng provider | Mã giao dịch phía provider. |
| `idempotency_key` | `VARCHAR(100)` | Không | — | UNIQUE cùng Client | Khóa lũy đẳng do Client gửi. |
| `status` | `VARCHAR(20)` | Không | — | Enum | Trạng thái yêu cầu. |
| `completed_at` | `TIMESTAMP` | Có | `NULL` | — | Thời điểm xác nhận thành công. |
| `version` | `BIGINT` | Không | Tự quản lý | Optimistic lock | Phiên bản deposit order. |
| `created_at` | `TIMESTAMP` | Không | Tự sinh | — | Thời điểm tạo yêu cầu. |

Giá trị `status`:

| Giá trị | Ý nghĩa |
| --- | --- |
| `PENDING` | Đã tạo nhưng chưa được provider xác nhận. |
| `SUCCEEDED` | Đã xác nhận đúng số tiền và đã credit account. |
| `FAILED` | Giao dịch thất bại; enum đã có nhưng luồng đánh dấu lỗi chưa hoàn chỉnh. |

Unique constraint:

- `uk_deposit_client_idempotency(client_id, idempotency_key)`
- `uk_deposit_provider_reference(provider, provider_reference)`

Quy tắc:

- Endpoint Client chỉ tạo `PENDING`, không tự cộng tiền.
- `DepositService.confirm` khóa bi quan deposit order trước khi xác nhận.
- `received_amount` phải đúng bằng `requested_amount`.
- Confirm lại với cùng dữ liệu không cộng tiền lần hai.
- Confirm lại với số tiền hoặc provider reference khác bị từ chối.
- Production vẫn cần adapter xác minh chữ ký webhook và đối soát với provider.

## 9. Ma trận foreign key

| Bảng con | Cột FK | Bảng cha | Bắt buộc |
| --- | --- | --- | --- |
| `refresh_tokens` | `user_id` | `users.id` | Có |
| `password_reset_tokens` | `user_id` | `users.id` | Có |
| `google_maps_accounts` | `freelancer_id` | `users.id` | Có |
| `jobs` | `client_id` | `users.id` | Có |
| `jobs` | `required_level_id` | `required_levels.id` | Có |
| `job_assignments` | `job_id` | `jobs.id` | Có |
| `job_assignments` | `freelancer_id` | `users.id` | Có |
| `job_assignments` | `google_maps_account_id` | `google_maps_accounts.id` | Không |
| `job_proofs` | `assignment_id` | `job_assignments.id` | Có, unique |
| `job_proofs` | `job_id` | `jobs.id` | Có |
| `job_proofs` | `freelancer_id` | `users.id` | Có |
| `account_balances` | `user_id` | `users.id` | Không với account hệ thống |
| `account_transactions` | `account_balance_id` | `account_balances.id` | Có |
| `deposit_orders` | `client_id` | `users.id` | Có |

## 10. Danh sách unique constraint và index

### Unique constraint

| Tên/nguồn | Cột |
| --- | --- |
| `users.email` | `email` |
| `refresh_tokens.token_hash` | `token_hash` |
| `password_reset_tokens.token_hash` | `token_hash` |
| `uk_google_maps_accounts_contributor_id` | `contributor_id` |
| `uk_job_client_idempotency` | `client_id, idempotency_key` |
| `uk_job_assignment_active_freelancer` | `job_id, active_freelancer_id` |
| `uk_job_assignment_active_content` | `job_id, active_review_content_index` |
| `job_proofs.assignment_id` | `assignment_id` |
| `uk_account_balance_key` | `account_key` |
| `uk_account_transaction_idempotency` | `idempotency_key` |
| `uk_deposit_client_idempotency` | `client_id, idempotency_key` |
| `uk_deposit_provider_reference` | `provider, provider_reference` |

### Index khai báo tường minh

| Tên | Bảng | Cột |
| --- | --- | --- |
| `idx_refresh_tokens_family` | `refresh_tokens` | `family_id` |
| `idx_refresh_tokens_user` | `refresh_tokens` | `user_id` |
| `idx_refresh_tokens_expiry` | `refresh_tokens` | `expires_at` |

Database thường tự tạo index cho primary key, unique constraint và một số foreign key. Việc này
phụ thuộc engine/dialect và cần được chốt trong migration production.

## 11. Khóa và chiến lược đồng thời

| Dữ liệu | Kiểu khóa | Mục đích |
| --- | --- | --- |
| `refresh_tokens` | Pessimistic write theo `token_hash` | Ngăn rotation cùng token đồng thời. |
| `users` | Pessimistic write theo `id` khi tạo Job | Tuần tự hóa request cùng Client trước khi kiểm tra idempotency Job. |
| `deposit_orders` | Pessimistic write theo `id` | Ngăn confirm/cộng tiền lặp. |
| `account_balances` | Pessimistic write theo `account_key` | Ngăn lost update số dư. |
| `jobs` | Pessimistic write theo `id` | Bảo vệ slot, ngân sách và trạng thái Job. |
| `job_assignments` | Pessimistic write theo `id` | Bảo vệ claim/submit/expire/cancel. |
| `job_proofs` | Pessimistic write theo `id` | Ngăn approve/reject cùng proof đồng thời. |
| Entity có `version` | Optimistic lock | Phát hiện ghi đè từ transaction khác. |

Thứ tự khóa tài chính hiện dùng:

```text
Proof
→ Job
→ Client account
→ Freelancer/Platform account
```

Các luồng mới phải giữ thứ tự khóa nhất quán để giảm nguy cơ deadlock.

Tạo Job dùng thứ tự `Client user → AccountBalance`; unique constraint
`(client_id, idempotency_key)` là lớp bảo vệ cuối cùng để không tạo Job lặp.

## 12. Constraint còn thiếu trước production

Các điều kiện sau đang được code/service bảo vệ nhưng chưa được database bảo vệ đầy đủ:

1. Một user chỉ có một `password_reset_tokens` đang áp dụng.
2. Một Freelancer chỉ có một proof `PENDING/APPROVED` trên cùng Job.
3. Một nội dung review chỉ có một proof `PENDING/APPROVED` trên cùng Job.
4. `available_slots` và `completed_slots` nằm trong khoảng hợp lệ.
5. Các trường tiền và giá không âm ngoài `account_balances`.
6. `platform_fee_rate` nằm trong khoảng nghiệp vụ cho phép.
7. `account_balances.user_id` phù hợp với `account_type`.
8. `(user_id, currency)` là duy nhất đối với account loại `USER`.

MySQL không hỗ trợ partial unique index theo cách PostgreSQL hỗ trợ. Assignment active đã dùng
generated column kết hợp unique constraint; các constraint phụ thuộc trạng thái khác có thể áp dụng
cùng kỹ thuật hoặc thiết kế bảng trạng thái active riêng.

## 13. Khuyến nghị migration

Trước khi dùng production:

1. Database mới chạy tuần tự `V1` rồi `V2`; không dùng Hibernate để tạo bảng.
2. Database cũ đã có schema nhưng chưa có `flyway_schema_history` dùng `baseline-on-migrate=true`
   và `baseline-version=1`, sau đó Flyway chỉ áp dụng `V2` trở đi.
3. Backfill `account_balances` nếu môi trường cũ từng có `users.balance`.
4. Thêm check constraint và index nghiệp vụ còn thiếu bằng các migration `V3+`; không sửa `V1`/`V2`
   sau khi đã release.
5. Xác nhận charset/collation cho email, URL và nội dung tiếng Việt.
6. Kiểm tra timezone của MySQL/JDBC và lưu mọi `Instant` theo UTC.
7. Có quy trình backup, restore và reconciliation cho các bảng tài chính.

Không được xóa cột số dư cũ hoặc chuyển dữ liệu tài chính bằng `ddl-auto`; cần migration có kiểm tra
tổng tiền trước và sau khi chuyển đổi.

### 13.1. Migration assignment active

File: `db/migration/V2__add_active_assignment_constraints.sql`.

Trước khi chạy trên database hiện có, kiểm tra dữ liệu trùng:

```sql
SELECT job_id, freelancer_id, COUNT(*) AS duplicate_count
FROM job_assignments
WHERE status IN ('CLAIMED', 'SUBMITTED', 'APPROVED')
GROUP BY job_id, freelancer_id
HAVING COUNT(*) > 1;

SELECT job_id, review_content_index, COUNT(*) AS duplicate_count
FROM job_assignments
WHERE status IN ('CLAIMED', 'SUBMITTED', 'APPROVED')
  AND review_content_index IS NOT NULL
GROUP BY job_id, review_content_index
HAVING COUNT(*) > 1;
```

Hai truy vấn phải trả rỗng. Migration cố ý thất bại nếu còn dữ liệu trùng và không tự xóa dữ liệu
nghiệp vụ. Với database hiện có đang do Hibernate quản lý:

```env
FLYWAY_ENABLED=true
FLYWAY_BASELINE_ON_MIGRATE=true
FLYWAY_BASELINE_VERSION=1
JPA_DDL_AUTO=validate
```

Sao lưu database trước khi chạy. `DatabaseMigrationIntegrationTest` kiểm tra database rỗng chạy đủ
`V1` + `V2` và Hibernate validate thành công; `ExistingDatabaseMigrationIntegrationTest` kiểm tra
baseline database cũ ở version 1 rồi chạy V2; `ActiveAssignmentConstraintIntegrationTest` kiểm tra
hành vi unique constraint.
