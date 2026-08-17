# Luồng rút tiền Freelancer

## Nguyên tắc

Withdrawal tái sử dụng `account_balances` và `account_transactions`. Khi tạo yêu cầu, toàn bộ `amount` được chuyển từ `available` sang `held`. Chỉ khi chuyển khoản thành công tiền mới bị trừ khỏi `held`; khi hủy, từ chối hoặc thất bại tiền được hoàn về `available`.

Mỗi Freelancer chỉ có tối đa một withdrawal ở `PENDING` hoặc `PROCESSING`. Mọi thao tác tài chính khóa pessimistic balance/withdrawal và dùng ledger idempotency key.

## Tài khoản nhận tiền và QR

```http
POST /api/v1/freelancer/payout-method-images/uploads
Authorization: Bearer <token>
Content-Type: application/json

{"fileName":"vietcombank-qr.png","contentType":"image/png","fileSize":245678}
```

Upload ảnh trực tiếp lên `uploadUrl`, sau đó tạo payout method:

```http
POST /api/v1/freelancer/payout-methods

{
  "type": "BANK_ACCOUNT",
  "bankCode": "VCB",
  "bankName": "Vietcombank",
  "accountNumber": "0123456789",
  "accountHolderName": "NGUYEN VAN A",
  "qrImageObjectKey": "payout-methods/123/<uuid>.png",
  "isDefault": true
}
```

Số tài khoản được mã hóa AES-256-GCM; response chỉ trả `maskedAccountNumber`. QR nằm trong bucket private và response trả presigned download URL. `qrImageObjectKey` là tùy chọn và phải thuộc Freelancer hiện tại.

```http
GET    /api/v1/freelancer/payout-methods
DELETE /api/v1/freelancer/payout-methods/{id}
```

DELETE chuyển method sang `INACTIVE`, không xóa lịch sử.

## Tạo và tra cứu withdrawal

```http
POST /api/v1/freelancer/withdrawals
Idempotency-Key: wd-20260809-001

{"amount":500000,"currency":"VND","payoutMethodId":15}
```

`amount` là tổng tiền trừ khỏi ví; `netAmount = amount - feeAmount`. Phí và thông tin ngân hàng/QR được snapshot khi tạo. Retry cùng key/payload trả withdrawal cũ; cùng key với payload khác trả `409`.

```http
GET  /api/v1/freelancer/withdrawals?page=0&size=20&status=PENDING
GET  /api/v1/freelancer/withdrawals/{id}
POST /api/v1/freelancer/withdrawals/{id}/cancel
```

Chỉ withdrawal `PENDING` được Freelancer hủy.

## Xử lý bởi Admin

```http
GET  /api/v1/admin/withdrawals?page=0&size=20&status=PENDING
GET  /api/v1/admin/withdrawals/{id}
POST /api/v1/admin/withdrawals/{id}/approve
POST /api/v1/admin/withdrawals/{id}/reject
POST /api/v1/admin/withdrawals/{id}/complete
POST /api/v1/admin/withdrawals/{id}/fail
```

```text
PENDING -> CANCELLED | REJECTED | PROCESSING
PROCESSING -> SUCCEEDED | FAILED
```

`reject` và `fail` bắt buộc `reason`. `complete` bắt buộc `provider` và `providerReference`.

## Cấu hình

```http
PUT /api/v1/admin/platform-settings/withdrawals

{"enabled":true,"minimumAmount":100000,"feeType":"FIXED","feeValue":5000}
```

`feeType` hỗ trợ `FIXED` và `PERCENTAGE` (tỷ lệ nhỏ hơn `1`). Biến môi trường:

```text
PAYOUT_ENCRYPTION_KEY=<dedicated secret of at least 32 bytes; defaults to JWT_SECRET for compatibility>
WITHDRAWAL_MINIMUM=100000.00
WITHDRAWAL_FEE=5000.0000
```

Ledger sử dụng `WITHDRAWAL_HOLD`, `WITHDRAWAL_COMPLETED`, `WITHDRAWAL_RELEASE` với key `WITHDRAWAL:{id}:HOLD|COMPLETE|RELEASE`.
