# Luồng Admin cấu hình hệ thống

## 1. Required Level

API đọc yêu cầu đăng nhập bằng JWT hợp lệ; mọi role đã đăng nhập đều có thể xem level và giá để phục vụ luồng chọn level. Tạo/sửa/xóa yêu cầu role `ADMIN`. Người chưa đăng nhập nhận `401`.

| Method | Endpoint | Quyền | Kết quả |
|---|---|---|---|
| GET | `/api/v1/required-levels` | Authenticated | Danh sách theo ID tăng dần. |
| GET | `/api/v1/required-levels/{id}` | Authenticated | Chi tiết; `404` nếu không tồn tại. |
| POST | `/api/v1/required-levels` | ADMIN | Tạo mới, trả `201`. |
| PUT | `/api/v1/required-levels/{id}` | ADMIN | Cập nhật, trả `200`. |
| DELETE | `/api/v1/required-levels/{id}` | ADMIN | Xóa, trả `204`. |

Request tạo/cập nhật:

```json
{
  "description": "Level 1",
  "pricePerReview": 10000.00,
  "rank": 1
}
```

`description` không được rỗng và được trim. `pricePerReview` phải lớn hơn 0, tối đa 2 chữ số thập phân.
`rank` là Local Guide level từ 1 đến 10. Khi tạo mới có thể bỏ qua và service dùng mặc định `1`;
khi cập nhật, bỏ qua `rank` sẽ giữ nguyên giá trị hiện tại.

```json
{"id": 1, "description": "Level 1", "pricePerReview": 10000.00, "rank": 1}
```

Đổi giá level chỉ ảnh hưởng Job tạo sau đó. Job cũ giữ snapshot giá/budget. Xóa level đang được Job tham chiếu có thể bị database từ chối; hiện chưa có error contract riêng cho trường hợp này.

## 2. Platform fee

### Đọc cấu hình

```http
GET /api/v1/admin/platform-settings
Authorization: Bearer <admin-access-token>
```

Hệ thống dùng một bản ghi ID `1`. Nếu chưa có, lần đọc đầu tạo từ `app.platform.default-fee-rate` (mặc định `0.5000`) với `updatedBy = SYSTEM`.

```json
{
  "platformFeeRate": 0.5000,
  "updatedBy": "SYSTEM",
  "version": 0,
  "updatedAt": "2026-07-17T00:00:00Z"
}
```

### Cập nhật

```http
PUT /api/v1/admin/platform-settings/fee-rate
Authorization: Bearer <admin-access-token>
Content-Type: application/json
```

```json
{"platformFeeRate": 0.2500}
```

Quy tắc: `0.0000 <= rate < 1.0000`, tối đa 4 chữ số thập phân. `0.2500` nghĩa là 25%. Backend lưu email admin trong `updatedBy`; entity dùng optimistic `version`.

```text
Đổi fee -> Job cũ không đổi
        -> Job mới snapshot fee mới
```

Fee không được đọc lại khi nộp hoặc duyệt proof.

## 3. Phân quyền và lỗi

| Status | Trường hợp |
|---|---|
| `400` | Payload, giá hoặc rate ngoài phạm vi. |
| `401` | Thiếu/sai token Admin. |
| `403` | Không có role ADMIN. |
| `404` | Required Level không tồn tại. |

## 4. Giới hạn

- Chưa có lịch sử/rollback/lịch áp dụng fee.
- Required Level chưa có code duy nhất, thứ tự hiển thị riêng hoặc trạng thái active; `rank` đã có và dùng để kiểm tra Google Maps account khi claim.
- Xóa level là hard delete; nên chuyển sang deactivate khi chạy production.
- API fee chưa nhận `version` từ client để compare-and-set.
