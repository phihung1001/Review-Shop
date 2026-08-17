# Tích hợp nạp tiền SePay

## Cấu hình môi trường

Điền các biến sau vào `.env` của backend:

```properties
SEPAY_ENABLED=true
SEPAY_WEBHOOK_API_KEY=<API_KEY_CAU_HINH_TRONG_WEBHOOK_SEPAY>
SEPAY_BANK_ACCOUNT=<SO_TAI_KHOAN_NHAN>
SEPAY_BANK_CODE=<MA_NGAN_HANG_VI_DU_VCB>
SEPAY_ACCOUNT_HOLDER=<TEN_CHU_TAI_KHOAN>
SEPAY_PAYMENT_CODE_PREFIX=SEPAY
SEPAY_WEBHOOK_BANK_ACCOUNT=<SO_TAI_KHOAN_NHAN>
```

`SEPAY_WEBHOOK_BANK_ACCOUNT` có thể bỏ trống để dùng lại `SEPAY_BANK_ACCOUNT`. Prefix `SEPAY` phải được đăng ký trong phần mã thanh toán của SePay.

## Luồng sử dụng

Client gọi API hiện tại:

```http
POST /api/v1/client/account/deposits
Authorization: Bearer <client-token>
Content-Type: application/json
```

```json
{
  "amount": 500000,
  "provider": "SEPAY",
  "idempotencyKey": "deposit-request-001"
}
```

Response có thêm `payment.paymentCode` và `payment.qrCodeUrl`. Người dùng quét QR hoặc chuyển khoản với đúng số tiền và nội dung `payment.paymentCode`.

Trong SePay, tạo webhook với các thiết lập:

- URL: `https://<public-host>/api/v1/webhooks/sepay`
- Sự kiện: tiền vào (`In_only`)
- Kiểu dữ liệu: JSON
- Xác thực: API Key
- API Key: trùng với `SEPAY_WEBHOOK_API_KEY`

Webhook nhận giao dịch tại `POST /api/v1/webhooks/sepay`. Backend kiểm tra API Key, tài khoản nhận, loại giao dịch, mã lệnh và số tiền trước khi gọi `DepositService.confirm`. Callback lặp của cùng giao dịch không cộng tiền lần hai.
