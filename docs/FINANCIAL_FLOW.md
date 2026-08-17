# Luồng tài chính

## Các điều kiện bất biến

- Job chỉ được chuyển sang `OPEN` sau khi toàn bộ `totalBudget` đã được chuyển từ số dư khả dụng
  (`available`) sang số dư đang giữ (`held`) của Client.
- Số dư khả dụng và số dư đang giữ không bao giờ được âm.
- Mỗi giao dịch nạp tiền được nhà cung cấp xác nhận thành công chỉ được cộng vào tài khoản một lần.
- Mỗi proof chỉ được trả thưởng cho Freelancer một lần.
- Mọi biến động số dư đều tạo một bản ghi bất biến trong `account_transactions`, với
  `idempotency_key` duy nhất.
- Khi Job hoàn thành, tổng tiền thưởng đã duyệt, phí nền tảng và phần dư được hoàn lại phải bằng
  ngân sách đã giữ cho Job.

## Tài khoản số dư và sổ giao dịch

`account_balances` lưu ảnh chụp số dư hiện tại và được khóa khi cập nhật để phục vụ truy vấn nhanh.
`account_transactions` là sổ giao dịch bất biến dùng để kiểm toán và tính lại số dư khi cần.

Tài khoản người dùng sử dụng khóa `USER:{userId}:VND`; tài khoản doanh thu nền tảng sử dụng khóa
`PLATFORM_REVENUE:VND`.

Phiên bản hiện tại hỗ trợ VND với hai chữ số thập phân. Khi bổ sung loại tiền tệ khác, hệ thống phải
tạo tài khoản riêng cho từng loại tiền. Không được tự động quy đổi số tiền giữa các loại tiền tệ.

Client đọc số dư qua `GET /api/v1/client/account`; Freelancer dùng `GET /api/v1/freelancer/account`.
Hai API trả `currency`, `availableAmount` và `heldAmount`, không trả trực tiếp entity hay ledger.

## Nạp tiền

`POST /api/v1/client/account/deposits` tạo một yêu cầu nạp tiền có trạng thái `PENDING`. API này bảo
đảm tính lũy đẳng theo cặp `(client, idempotencyKey)` và không tự cộng tiền vào tài khoản.

Request gồm `amount` (tối thiểu `1.00`, tối đa 2 chữ số thập phân), `provider` và
`idempotencyKey`. Retry tuần tự cùng dữ liệu trả DepositOrder cũ; dùng cùng key với amount/provider
khác bị từ chối. Trường hợp hai request tạo Deposit cùng key chạy chính xác đồng thời hiện mới dựa
vào unique constraint và cần được gia cố để request thua đọc/trả bản ghi cũ thay vì có thể nhận lỗi constraint.

Adapter của cổng thanh toán phải xác thực webhook và chữ ký của nhà cung cấp trước khi gọi
`DepositService.confirm`. Thao tác xác nhận sẽ:

1. Khóa yêu cầu nạp tiền.
2. Kiểm tra chính xác số tiền đã nhận.
3. Lưu mã tham chiếu của nhà cung cấp.
4. Chuyển trạng thái sang `SUCCEEDED`.
5. Cộng tiền vào số dư khả dụng của Client trong cùng transaction.

Mã tham chiếu của nhà cung cấp là duy nhất. Một callback được gửi lại với cùng dữ liệu không được
cộng tiền lần hai; nếu cùng yêu cầu nhưng dữ liệu khác, hệ thống phải từ chối.

## Giữ tiền khi tạo Job

Khi tạo Job, hệ thống tính và lưu ảnh chụp phí nền tảng cùng khoản trả thưởng. Sau khi lưu Job,
hệ thống khóa tài khoản Client và chuyển toàn bộ `totalBudget` từ số dư khả dụng sang số dư đang giữ.

API tạo Job yêu cầu `Idempotency-Key`. Cùng Client retry với cùng key và payload sẽ nhận lại Job cũ,
không tạo thêm `JOB_FUND_HOLD`; dùng lại key với payload khác bị từ chối bằng `409 Conflict`. Hai
request đồng thời cùng key được tuần tự hóa bằng khóa pessimistic trên Client và bảo vệ thêm bởi
unique constraint `(client_id, idempotency_key)`.

Nếu Client không đủ tiền, cả thao tác tạo Job và các biến động sổ giao dịch đều được rollback.
Vì vậy Job không thể ở trạng thái `OPEN` khi chưa được cấp đủ ngân sách.

```text
Client available
    │
    └── JOB_FUND_HOLD ──> Client held
```

## Trả thưởng và quyết toán Job

Khi Client duyệt proof, hệ thống lần lượt khóa proof, Job và các tài khoản liên quan. Khoản thưởng
được trừ khỏi số dư đang giữ của Client và cộng vào số dư khả dụng của Freelancer. Hai phía đều
được ghi vào sổ giao dịch bằng khóa lũy đẳng gắn với proof.

```text
Client held
    │
    └── JOB_REWARD ──> Freelancer available
```

Khi proof cuối cùng được duyệt:

- Phí nền tảng được chuyển từ số dư đang giữ của Client sang tài khoản doanh thu nền tảng.
- Phần dư do phép chia hoặc làm tròn được chuyển từ `held` về `available` của Client.
- Ngân sách Freelancer còn lại của Job được đưa về 0.

```text
Client held
    ├── PLATFORM_FEE ─────────> Platform revenue
    └── JOB_REMAINDER_REFUND ─> Client available
```

## Kiểm soát đồng thời và tính lũy đẳng

- `account_balances` được khóa bằng pessimistic lock trước khi cập nhật.
- Truy vấn có khóa phải là lần đọc account đầu tiên trong transaction để tránh giữ entity có
  version cũ trong persistence context.
- Mỗi nghiệp vụ tài chính có `idempotency_key` duy nhất ở database.
- Kiểm tra khóa lũy đẳng được thực hiện sau khi đã khóa account để hai request đồng thời không cùng
  vượt qua bước kiểm tra.
- `available_amount` và `held_amount` có ràng buộc không âm.

## Rút tiền Freelancer

Freelancer quản lý tài khoản ngân hàng và QR, sau đó tạo withdrawal có `Idempotency-Key`. Hệ thống chuyển tiền từ `available` sang `held` khi tạo, quyết toán `held` khi thành công và hoàn lại khi hủy/từ chối/thất bại. Chi tiết xem [WITHDRAWAL_FLOW.md](WITHDRAWAL_FLOW.md).

## Phần tích hợp nhà cung cấp vẫn còn thiếu

Không có endpoint công khai nào được phép tự chuyển yêu cầu nạp tiền sang thành công. Trước khi sử
dụng tiền thật, hệ thống vẫn cần một adapter cho cổng thanh toán cụ thể, bao gồm:

- Xác minh chữ ký webhook.
- Chống phát lại callback.
- Kiểm tra số tiền và loại tiền tệ.
- Lưu webhook gốc phục vụ kiểm toán.
- Cơ chế retry an toàn.
- Đối soát định kỳ với nhà cung cấp.
- Xử lý hoàn tiền, thu hồi giao dịch và rút tiền.
