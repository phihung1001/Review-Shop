# Quy trình cập nhật Backend trên VPS

Tài liệu cập nhật production.

## Quy trình cập nhật

1. Trên máy local chạy `.\mvnw.cmd clean verify`.
2. Commit và push: `git add .`, `git commit -m "mô tả thay đổi"`, `git push origin main`.
3. SSH vào VPS và chạy `cd /opt/review-shop/app`.
4. Kiểm tra rồi cập nhật source bằng `git status` và `git pull origin main`.
5. Kiểm tra Compose bằng `cd /opt/review-shop` rồi `docker compose config`.
6. Build và chạy backend bằng `docker compose up -d --build backend`.
7. Kiểm tra bằng `docker compose ps` và `docker compose logs --tail=200 backend`.
8. Test nội bộ bằng `curl -i http://127.0.0.1:8080/api/v1/required-levels`.

## Lưu ý

- Không commit `.env`, password, JWT secret, API key hoặc private key.
- Nếu có Flyway migration, backup database trước khi deploy.
- Không xóa volume `mysql_data` nếu chưa có backup.
- Ghi lại commit hiện tại trước khi cập nhật để có thể rollback.
- Rollback bằng `git checkout <commit-cu>` rồi chạy lại `docker compose up -d --build backend`.
