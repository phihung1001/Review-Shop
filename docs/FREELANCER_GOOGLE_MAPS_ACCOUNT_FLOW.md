# Luồng kiểm tra Google Maps contributor profile của Freelancer

## 1. Phạm vi kiểm tra

Luồng hiện tại kiểm tra một contributor profile công khai có tồn tại và đủ điều kiện nhận Job. Nó
không chứng minh user đang đăng nhập thực sự sở hữu Google Maps profile đó, vì Google Maps
Contributor Reviews API chỉ cung cấp dữ liệu công khai và không liên kết với danh tính đăng nhập của
hệ thống.

Các điều kiện được kiểm tra:

- URL là Google Maps contributor profile hợp lệ.
- Profile là Local Guide, có level từ `1` trở lên.
- Profile có ít nhất một review công khai.
- Contributor ID chưa được đăng ký trong hệ thống.

## 2. Kiểm tra profile

```http
POST /api/v1/freelancer/google-maps-accounts/verify
Authorization: Bearer <freelancer-token>
Content-Type: application/json

{"profileUrl":"https://www.google.com/maps/contrib/117642509766343273456/contribute/..."}
```

Backend chỉ chấp nhận HTTPS `google.com`/`www.google.com`, tách `contributorId` từ
`/maps/contrib/{digits}`, rồi gọi SerpApi engine `google_maps_contributor_reviews` với:

```text
hl=en
gl=vn
num=1
```

`hl=en` chuẩn hóa tên field máy đọc như `contributions.reviews`. Nó không giới hạn ngôn ngữ hoặc
quốc gia của contributor. `gl=vn` đặt khu vực truy vấn; dữ liệu eligibility vẫn dựa trên contributor
ID, Local Guide status và level.

Backend kiểm tra cả `search_metadata.status = Success` và contributor data. Tổng review ưu tiên
`contributions.reviews`; nếu field tổng bị thiếu hoặc localized, backend dùng số phần tử trong mảng
`reviews` làm fallback. Vì request dùng `num=1`, fallback chỉ dùng để xác nhận có ít nhất một review,
không đại diện cho tổng review thật.

Ứng dụng bật strict JSON cho request/response nội bộ, nhưng DTO SerpApi được cấu hình riêng để bỏ qua
các field provider bổ sung ngoài contract đang dùng. Điều này tránh việc SerpApi thêm metadata hoặc
chi tiết review làm hỏng toàn bộ bước deserialize.

Account hợp lệ khi SerpApi trả `local_guide=true`, `level >= 1` và có ít nhất một review công khai.
Thành công lưu tên, thumbnail, points, level, số review, canonical profile URL và thời điểm xác thực.
Một contributor ID chỉ được đăng ký một lần trong hệ thống.

Account vừa xác thực chưa dùng nhận Job cho tới khi chọn loại:

```http
PATCH /api/v1/freelancer/google-maps-accounts/{id}/type

{"accountType":"VIETNAM"}
```

Loại hỗ trợ: `VIETNAM`, `FOREIGN`. `GET /api/v1/freelancer/google-maps-accounts` trả các account của
Freelancer hiện tại.

## 3. Chọn account khi nhận Job

Khi mở bước nhận Job, frontend gọi:

```http
GET /api/v1/freelancer/jobs/{jobId}/eligible-google-maps-accounts
```

API chỉ trả account thuộc Freelancer, đang active, đã chọn loại và có
`localGuideLevel >= requiredLevel.rank`.

- Mảng rỗng: khóa nút **Nhận Job** và yêu cầu Freelancer thêm account đủ điều kiện.
- Có dữ liệu: cho chọn đúng một account rồi gọi API claim.

```http
POST /api/v1/freelancer/jobs/{jobId}/assignments

{"reviewContentIndex":0,"googleMapsAccountId":12}
```

Backend kiểm tra lại ownership, trạng thái sẵn sàng và level; frontend không thể bypass bằng cách
gọi claim trực tiếp. Assignment lưu snapshot tên, contributor ID, level và loại account tại thời
điểm nhận Job.

## 4. Phụ thuộc SerpApi và hành vi lỗi

| Status | Trường hợp |
|---|---|
| `400` | Link contributor sai hoặc payload không hợp lệ. |
| `404` | Account không thuộc Freelancer khi cập nhật loại. |
| `409` | Contributor đã đăng ký, account claim không sẵn sàng hoặc không đủ level. |
| `422` | Không phải Local Guide hoặc chưa có review được xuất bản. |
| `503` | SerpApi chưa cấu hình, lỗi kết nối/HTTP, timeout, status không thành công hoặc thiếu contributor data. |

API không tạo Google Maps account khi provider lỗi. Client có thể cho phép retry sau; không nên tự
động gửi liên tục. API key chỉ được dùng ở backend và không xuất hiện trong response.

Eligibility khi claim dùng snapshot đã lưu trong `google_maps_accounts`, không gọi SerpApi lại trên
mỗi request claim. Điều này giảm latency và tránh việc provider tạm lỗi làm gián đoạn Job đã mở.

Giới hạn hiện tại:

- Verify vẫn là request đồng bộ; chưa có background job, retry/backoff hoặc circuit breaker.
- Chưa có lịch re-verify để làm mới level, points và review count.
- Chưa có provider dự phòng hoặc quy trình admin review khi SerpApi không khả dụng.
- Chưa có cơ chế chứng minh ownership của contributor profile.

## 5. Cấu hình

```env
SERPAPI_API_KEY=replace-with-real-key
SERPAPI_BASE_URL=https://serpapi.com
```

API key chỉ tồn tại ở backend và không được trả cho frontend hoặc commit vào repository.

## 6. Hướng phát triển production

Khi đưa vào production nên tách provider sau một interface, chuyển verify sang trạng thái chờ xử lý,
cache kết quả theo contributor ID, retry có backoff cho timeout/`429`/`5xx`, thêm circuit breaker và
re-verify định kỳ. Account đã xác minh gần đây có thể dùng snapshot trong một grace period khi
provider tạm lỗi; account chưa từng xác minh phải fail closed.
