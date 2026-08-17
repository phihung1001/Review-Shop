# Docker build và triển khai

Tài liệu này mô tả cách build, kiểm thử và chạy image Docker của `review-shop-backend`.

## 1. Yêu cầu

- Docker Engine 24 trở lên.
- Một file `.env` hợp lệ, tạo từ `.env.example`.
- MySQL có thể truy cập được từ container.
- Các dịch vụ ngoài nếu bật: SMTP, Cloudflare R2, SerpApi, SePay.

Không copy `.env` vào image và không commit file này lên Git. Secret phải được truyền lúc chạy container hoặc qua secret manager của nền tảng deploy.

## 2. Chuẩn bị cấu hình

```powershell
Copy-Item .env.example .env
# Chỉnh .env bằng secret thật trong môi trường local/deploy
```

Trong `.env`, `DB_URL` phải trỏ tới hostname mà container truy cập được. Không dùng `localhost` nếu MySQL chạy ở container khác; hãy dùng tên service Docker hoặc hostname của máy chủ database.

Các secret bắt buộc chính gồm `DB_PASSWORD`, `PASSWORD_RESET_OTP_PEPPER`, `JWT_SECRET`, `PAYOUT_ENCRYPTION_KEY` và các credential của dịch vụ đang bật. `JWT_SECRET`, `PASSWORD_RESET_OTP_PEPPER` và `PAYOUT_ENCRYPTION_KEY` nên có ít nhất 32 byte và phải khác nhau trong production.

## 3. Build image

Đặt tag theo registry và version:

```powershell
docker build --pull -t review-shop-backend:local .
```

Build production:

```powershell
docker build --pull -t ghcr.io/<owner>/review-shop-backend:<version> .
```

Không dùng tag `latest` làm tag duy nhất trong production; nên giữ version bất biến để rollback.

## 4. Kiểm thử image

Kiểm tra image đã tạo:

```powershell
docker image inspect review-shop-backend:local
```

Chạy container:

```powershell
docker run --rm --name review-shop-backend \
  --env-file .env \
  -p 8080:8080 \
  review-shop-backend:local
```

PowerShell có thể dùng lệnh một dòng nếu dấu `\` không được shell hiện tại xử lý:

```powershell
docker run --rm --name review-shop-backend --env-file .env -p 8080:8080 review-shop-backend:local
```

Kiểm tra log:

```powershell
docker logs -f review-shop-backend
```

Ứng dụng hiện chưa có Spring Actuator health endpoint. Có thể kiểm tra endpoint public của API bằng:

```powershell
Invoke-WebRequest http://localhost:8080/api/v1/required-levels
```

Nếu endpoint yêu cầu database hoặc trả `401`, điều đó vẫn chứng minh container đã nhận request; cần xem log để phân biệt lỗi cấu hình database với lỗi ứng dụng.

## 5. Push lên registry

Đăng nhập registry trước khi push:

```powershell
docker login ghcr.io
docker push ghcr.io/<owner>/review-shop-backend:<version>
```

Với Docker Hub, thay registry bằng `docker.io` và tag theo namespace Docker Hub.

## 6. Deploy trên máy chủ

Trên máy chủ deploy:

```bash
docker login <registry>
docker pull <registry>/<owner>/review-shop-backend:<version>
docker stop review-shop-backend 2>/dev/null || true
docker rm review-shop-backend 2>/dev/null || true
docker run -d \
  --name review-shop-backend \
  --restart unless-stopped \
  --env-file /opt/review-shop/.env \
  -p 8080:8080 \
  <registry>/<owner>/review-shop-backend:<version>
```

Đặt reverse proxy/TLS (Nginx, Caddy hoặc load balancer cloud) ở phía trước ứng dụng. Không expose trực tiếp database, SMTP hoặc bucket credential ra Internet.

## 7. Rollback

Deploy lại version trước đó bằng tag bất biến:

```bash
docker pull <registry>/<owner>/review-shop-backend:<previous-version>
docker rm -f review-shop-backend
docker run -d \
  --name review-shop-backend \
  --restart unless-stopped \
  --env-file /opt/review-shop/.env \
  -p 8080:8080 \
  <registry>/<owner>/review-shop-backend:<previous-version>
```

## 8. Checklist trước production

- [ ] Image được build từ commit đã review.
- [ ] Không có `.env`, database local hoặc private key trong image/context.
- [ ] Các secret production được cấp từ secret manager hoặc file quyền hạn chế.
- [ ] `JPA_DDL_AUTO=validate` và Flyway migration đã được kiểm tra.
- [ ] `JWT_SECRET` và khóa mã hóa payout đủ mạnh, không dùng lại giữa môi trường.
- [ ] Có backup database và kế hoạch rollback image.
- [ ] Reverse proxy đã bật HTTPS và giới hạn request phù hợp.
