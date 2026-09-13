# Quy trình cập nhật production trên VPS

## Cấu trúc deploy

```text
/opt/review-shop/app/       # source Backend, branch backend
/opt/review-shop/frontend/  # source Frontend, branch frontend
/opt/review-shop/docker-compose.yml
```

## 1. Chuẩn bị và backup

```bash
cd /opt/review-shop
docker compose ps
mkdir -p backups
docker compose exec -T mysql sh -c 'mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > backups/review-shop-$(date +%F-%H%M).sql
```

## 2. Cập nhật Backend

```bash
cd /opt/review-shop/app
git status
git pull --ff-only origin backend
```

## 3. Cập nhật Frontend

```bash
cd /opt/review-shop/frontend
git status
git pull --ff-only origin frontend
```

Không pull `origin main` nếu source đang theo branch `frontend`. Không chạy `git reset` hoặc merge khi chưa xác định đúng branch.

## 4. Kiểm tra Compose và build

```bash
cd /opt/review-shop
docker compose config
docker compose up -d --build --force-recreate backend frontend
docker compose ps
```

Frontend được build từ `/opt/review-shop/frontend`; Dockerfile tự chạy `npm ci` và `npm run build`. Không dùng `docker compose pull frontend` vì image FE được build local trên VPS.

Nếu build thường vẫn lấy artifact cũ:

```bash
docker compose build --no-cache frontend
docker compose up -d --force-recreate frontend
```

## 5. Kiểm tra sau cập nhật

```bash
docker compose logs --tail=200 backend
docker compose logs --tail=100 frontend
curl -i http://127.0.0.1:8080/api/v1/required-levels
curl -I http://127.0.0.1:8081
nginx -t
systemctl reload nginx
```

Sau đó kiểm tra domain bằng cửa sổ ẩn danh hoặc `Ctrl + F5`. Nếu localhost đã mới nhưng domain cũ, kiểm tra Nginx, DNS và cache CDN.

## 6. Rollback

Ghi lại commit trước khi deploy:

```bash
git -C /opt/review-shop/app rev-parse HEAD
git -C /opt/review-shop/frontend rev-parse HEAD
```

Checkout đúng commit cũ rồi build lại service tương ứng. Không xóa volume MySQL.
