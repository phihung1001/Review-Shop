# Các lệnh vận hành trên VPS

Tài liệu này chứa các lệnh thường dùng khi vận hành project bằng Docker Compose.

## 1. Vào thư mục project

```bash
cd /opt/review-shop
```

## 2. Kiểm tra trạng thái service

```bash
docker compose ps
```

## 3. Khởi động, dừng và khởi động lại

```bash
# Khởi động ở background
docker compose up -d

# Dừng service nhưng giữ dữ liệu
docker compose stop

# Khởi động lại một service
docker compose restart backend

# Dừng và xóa container/network, không xóa volume
docker compose down
```

Không chạy `docker compose down -v` nếu chưa chắc chắn, vì lệnh này xóa volume database.

## 4. Xem log

```bash
# Xem log realtime
docker compose logs -f backend

# Xem 100 dòng cuối
docker compose logs --tail=100 backend

# Dừng xem log realtime
# Nhấn Ctrl + C
```

## 5. Build và deploy lại backend

```bash
docker compose build backend
docker compose up -d --force-recreate backend
docker compose logs --tail=100 backend
```

Nếu chỉ thay đổi `.env`, không cần build image:

```bash
docker compose up -d --force-recreate backend
```

## 6. Kiểm tra API

```bash
curl -i http://127.0.0.1:8080/actuator/health
curl -i http://127.0.0.1:8080/api/v1/required-levels
```

HTTP `401` nghĩa là API đã phản hồi nhưng endpoint yêu cầu xác thực. Kiểm tra thêm log nếu nhận `connection refused` hoặc container bị restart.

## 7. Kiểm tra file `.env`

```bash
nano /opt/review-shop/.env
cat /opt/review-shop/.env
grep -E 'DB_|MYSQL_|WITHDRAWAL_' /opt/review-shop/.env
```

Không commit `.env` và không gửi nội dung secret lên chat hoặc Git.

## 8. Kiểm tra biến môi trường trong container

```bash
docker inspect review-shop-backend \
  --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'DB_|MYSQL_|WITHDRAWAL_'
```

## 9. Truy cập MySQL

Đăng nhập bằng user ứng dụng mà không ghi password trực tiếp vào shell history:

```bash
docker compose exec mysql sh -c 'mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

Trong MySQL:

```sql
SHOW DATABASES;
USE `review-shop-prod`;
SHOW TABLES;
DESCRIBE users;
SELECT COUNT(*) FROM users;
SELECT * FROM users LIMIT 10;
EXIT;
```

## 10. Backup database

```bash
mkdir -p /opt/review-shop/backups
docker compose exec -T mysql sh -c 'mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > /opt/review-shop/backups/review-shop-$(date +%F-%H%M).sql
```

Kiểm tra file backup:

```bash
ls -lh /opt/review-shop/backups
```

## 11. Kiểm tra IP server

```bash
curl -4 ifconfig.me
hostname -I
```

Backend hiện được bind tại `127.0.0.1:8080`; nên dùng Nginx reverse proxy thay vì expose trực tiếp backend hoặc MySQL ra Internet.

## 12. Cập nhật source từ Git

```bash
git pull
docker compose build backend
docker compose up -d --force-recreate backend
docker compose ps
```
ssh -N -L 18081:127.0.0.1:8081 root@169.58.210.240