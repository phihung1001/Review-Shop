# Review Shop Backend

Tài liệu luồng rút tiền Freelancer: [WITHDRAWAL_FLOW.md](WITHDRAWAL_FLOW.md).

Backend cho nền tảng kết nối Client và Freelancer thực hiện các nhiệm vụ đánh giá, tương tác hoặc cung cấp bằng chứng hoàn thành công việc.

Hệ thống hỗ trợ quản lý tài khoản, tạo Job, nhận Job, nộp proof, duyệt kết quả, cấu hình cấp độ yêu cầu và phí nền tảng.

## Trạng thái dự án

Dự án hiện đang trong giai đoạn phát triển MVP.

Các luồng chính đã hoặc đang được triển khai:

* Đăng ký và đăng nhập.
* Xác thực bằng JWT.
* Phân quyền theo actor.
* Client xem số dư, tạo yêu cầu nạp tiền và tạo Job có giữ ngân sách.
* Freelancer nhận Job và nộp proof.
* Client duyệt hoặc từ chối proof.
* Admin cấu hình Required Level và phí nền tảng.

Đã có số dư `available`/`held`, ledger, tạo yêu cầu nạp tiền và giữ ngân sách Job. Cổng thanh toán,
reservation riêng theo từng Job, rút tiền và API lịch sử giao dịch chưa được triển khai đầy đủ.

## Actor

| Actor      | Vai trò                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| Public     | Người dùng chưa đăng nhập, có thể đăng ký, đăng nhập và xem các dữ liệu công khai. |
| CLIENT     | Người tạo Job, quản lý ngân sách và duyệt kết quả do Freelancer gửi.               |
| FREELANCER | Người nhận Job và gửi proof chứng minh đã hoàn thành nhiệm vụ.                     |
| ADMIN      | Người quản trị cấu hình hệ thống, level và phí nền tảng.                           |

## Luồng nghiệp vụ chính

```text
Admin cấu hình Required Level và platform fee
                         |
                 Client tạo Job
                         |
                    Job OPEN
                         |
          Freelancer nhận Job và nộp proof
                         |
                  Proof PENDING
                         |
              +----------+----------+
              |                     |
       Client APPROVE         Client REJECT
              |                     |
   Ghi nhận phần thưởng      Trả lại slot của Job
              |              Freelancer có thể nhận lại
              |
  Đủ số lượng proof được duyệt
              |
         Job COMPLETED
```

## Thuật ngữ chính

| Thuật ngữ      | Ý nghĩa                                             |
| -------------- | --------------------------------------------------- |
| Job            | Nhiệm vụ do Client tạo để Freelancer thực hiện.     |
| Slot           | Số lượng Freelancer hoặc proof mà một Job cần.      |
| Proof          | Bằng chứng Freelancer gửi sau khi thực hiện Job.    |
| Required Level | Cấp độ tối thiểu Freelancer cần có để tham gia Job. |
| Platform Fee   | Phần phí nền tảng áp dụng cho Job hoặc giao dịch.   |
| OPEN           | Job đang mở và có thể tiếp nhận proof.              |
| PENDING        | Proof đang chờ Client duyệt.                        |
| APPROVED       | Proof đã được Client chấp nhận.                     |
| REJECTED       | Proof bị Client từ chối.                            |
| COMPLETED      | Job đã nhận đủ số proof hợp lệ.                     |

## Tài liệu

| Tài liệu                                                                | Phạm vi                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| [PRODUCT.md](PRODUCT.md)                                           | Mục tiêu sản phẩm, actor, chức năng và quy tắc nghiệp vụ.  |
| [API_REFERENCE.md](API_REFERENCE.md)                               | Toàn bộ endpoint, request/response, quyền và mã lỗi.       |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                 | Kiến trúc hệ thống và các quyết định kỹ thuật.             |
| [AUTHENTICATION_AUTHORIZATION.md](AUTHENTICATION_AUTHORIZATION.md) | Đăng ký, đăng nhập, token, mật khẩu và phân quyền.         |
| [CLIENT_JOB_CREATION_FLOW.md](CLIENT_JOB_CREATION_FLOW.md)         | Toàn bộ use case Client: tài khoản, Job và duyệt proof.    |
| [FREELANCER_FLOW.md](FREELANCER_FLOW.md)                           | Hướng dẫn end-to-end đầy đủ cho Freelancer và frontend.   |
| [FREELANCER_JOB_PROOF_FLOW.md](FREELANCER_JOB_PROOF_FLOW.md)       | Freelancer nhận Job, nộp proof; Client duyệt hoặc từ chối. |
| [FREELANCER_GOOGLE_MAPS_ACCOUNT_FLOW.md](FREELANCER_GOOGLE_MAPS_ACCOUNT_FLOW.md) | Xác thực Local Guide account, eligibility và chọn account lúc nhận Job. |
| [ADMIN_CONFIGURATION_FLOW.md](ADMIN_CONFIGURATION_FLOW.md)         | Admin quản lý Required Level và phí nền tảng.              |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)                           | Từ điển dữ liệu đầy đủ cho toàn bộ bảng, cột, quan hệ và ràng buộc. |
| [FINANCIAL_FLOW.md](FINANCIAL_FLOW.md)                             | Luồng nạp tiền, giữ tiền, trả thưởng và sổ giao dịch.       |
| [OBJECT_STORAGE.md](OBJECT_STORAGE.md)                             | Upload ảnh proof trực tiếp lên Cloudflare R2 bằng presigned URL. |

## Phạm vi API theo actor

| Actor      | API chính                                                  |
| ---------- | ---------------------------------------------------------- |
| Public     | `/api/v1/auth/**`                                               |
| Authenticated | `GET /api/v1/required-levels/**`                           |
| CLIENT     | `POST/GET /api/v1/jobs/**`, `/api/v1/client/account/**`, `/api/v1/client/proofs/**` |
| FREELANCER | `/api/v1/freelancer/**`                                       |
| ADMIN      | `/api/v1/admin/**`, các API ghi tại `/api/v1/required-levels/**` |

Danh sách endpoint hiện tại được mô tả trong [PRODUCT.md](PRODUCT.md) và các tài liệu luồng tương ứng.

## Công nghệ

* Java 21
* Spring Boot
* Spring Security
* Spring Data JPA
* Hibernate
* MySQL
* JWT
* Maven
* JUnit 5
* MockMvc

## Cấu hình môi trường

Không lưu mật khẩu, JWT secret hoặc thông tin nhạy cảm trực tiếp trong repository.

Ví dụ các biến môi trường cần thiết:

```env
DB_URL=jdbc:mysql://localhost:3306/review_shop_dev
DB_USERNAME=root
DB_PASSWORD=change-me

JWT_SECRET=change-me
JWT_ISSUER=review-shop-backend
JWT_AUDIENCE=review-shop-api

PLATFORM_DEFAULT_FEE_RATE=0.0500

FLYWAY_ENABLED=true
FLYWAY_BASELINE_ON_MIGRATE=true
FLYWAY_BASELINE_VERSION=1
JPA_DDL_AUTO=validate
```

Không sử dụng giá trị mẫu trên môi trường production.

## Chạy dự án

Yêu cầu:

* Java 21
* Maven hoặc Maven Wrapper
* MySQL

Tạo database:

```sql
CREATE DATABASE review_shop_dev;
```

Chạy ứng dụng trên Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Chạy test:

```powershell
.\mvnw.cmd test
```

Chạy kiểm tra toàn bộ:

```powershell
.\mvnw.cmd clean verify
```

## Giới hạn và chức năng chưa triển khai

* Client được tạo, liệt kê và xem chi tiết Job của mình. Theo quyết định sản phẩm, Client không được sửa, hủy hoặc xóa Job; muốn thay đổi số lượng review phải tạo Job mới.
* `POST /api/v1/jobs` bắt buộc `Idempotency-Key`; retry cùng payload trả Job cũ và không giữ tiền lần hai.
* Đã có API claim Job bằng `JobAssignment`; claim giữ slot mặc định 10 phút.
* Submit proof bắt buộc dùng `assignmentId` và không trừ slot lần hai.
* Đã có upload ảnh proof trực tiếp từ frontend lên Cloudflare R2 bằng presigned URL.
* Chưa hỗ trợ phân trang đầy đủ.
* Chưa lọc proof theo trạng thái.
* Đã có bảng số dư, sổ giao dịch, yêu cầu nạp tiền `PENDING` và cơ chế giữ ngân sách Job; chưa có adapter/webhook cổng thanh toán thực tế.
* Chưa có luồng yêu cầu và duyệt rút tiền.
* Ledger đã lưu biến động số dư nhưng chưa có API cho người dùng xem lịch sử giao dịch.
* Flyway `V1` tạo đầy đủ schema và `V2` bảo vệ assignment active; Hibernate chỉ validate schema.

## Quy tắc phát triển

* Mọi thay đổi nghiệp vụ phải được cập nhật trong `docs/PRODUCT.md` hoặc file flow tương ứng.
* Thay đổi database phải sử dụng migration.
* Không trả trực tiếp JPA entity qua API.
* Không log mật khẩu, token, OTP hoặc secret.
* Chức năng mới phải có test.
* Bug fix phải có regression test.
* Không thay đổi public API ngoài phạm vi task.
* Sau mỗi task phải chạy test và kiểm tra build.

## Nguồn sự thật

Khi tài liệu và code không đồng nhất:

1. Không tự động giả định code hoặc tài liệu là đúng.
2. Kiểm tra test và migration liên quan.
3. Xác nhận quy tắc nghiệp vụ trong `docs/PRODUCT.md`.
4. Cập nhật đồng thời code, test và tài liệu trong cùng một task.
