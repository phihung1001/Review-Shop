# Cloudflare R2 proof image flow

Backend dùng Cloudflare R2 qua S3-compatible API. File không đi qua Spring MVC: backend tạo presigned URL,
frontend `PUT` trực tiếp lên R2, sau đó gửi `objectKey` khi submit proof. Database lưu object key; API đọc proof
trả presigned GET URL mới. Các HTTPS URL của proof cũ vẫn được trả nguyên trạng.

## Cấu hình

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
R2_BUCKET_NAME=<bucket-name>
R2_REGION=auto
R2_UPLOAD_URL_DURATION=PT10M
R2_DOWNLOAD_URL_DURATION=PT30M
R2_MAX_IMAGE_SIZE=3145728
```

R2 bucket phải có CORS cho origin frontend, method `PUT`, header `Content-Type` và `Content-Length`.
Không đưa access key hoặc secret key xuống frontend. Presigned URL là bearer credential.

## Upload ảnh

```http
POST /api/v1/freelancer/proof-images/uploads
Authorization: Bearer <access-token>
Content-Type: application/json

{"fileName":"proof.png","contentType":"image/png","fileSize":1024}
```

Chấp nhận `image/jpeg`, `image/png`, `image/webp`; mặc định tối đa 3 MiB. Response gồm `objectKey`,
`uploadUrl`, `requiredHeaders` và `expiresAt`. Frontend gọi `PUT uploadUrl` với chính xác các header được trả về
và binary file. Sau đó dùng `objectKey` trong `proofImages` của
`POST /api/v1/freelancer/jobs/{jobId}/proofs`.

Object key luôn có prefix `proofs/{freelancerId}/`; backend từ chối key của tài khoản khác. Khi đọc proof,
`proofImages` chứa presigned GET URL có thời hạn thay vì object key nội bộ.

Để không phá vỡ client hiện có, submit vẫn chấp nhận HTTPS URL tối đa 2048 ký tự. Client mới nên dùng object
key do API upload cấp; object key được kiểm tra quyền sở hữu, còn URL ngoài không được R2 flow quản lý.
