# Các lệnh vận hành trên VPS

## Cấu trúc thực tế

```text
/opt/review-shop/
├── app/                 # Git repository Backend, branch backend
├── frontend/            # Git repository Frontend, branch frontend
└── docker-compose.yml   # Compose chạy backend, frontend và MySQL
```

## Cập nhật Backend

```bash
cd /opt/review-shop/app
git status
git pull --ff-only origin backend

cd /opt/review-shop
docker compose up -d --build --force-recreate backend
docker compose ps backend
docker compose logs --tail=200 backend
```

## Cập nhật Frontend

Frontend được build từ context `/opt/review-shop/frontend`. Dockerfile chạy `npm ci`, `npm run build`, rồi copy `dist` vào Nginx.

```bash
cd /opt/review-shop/frontend
git status
git pull --ff-only origin frontend

cd /opt/review-shop
docker compose build frontend
docker compose up -d --force-recreate frontend
docker compose ps frontend
docker compose logs --tail=100 frontend
```

Có thể gộp hai bước build và recreate:

```bash
cd /opt/review-shop
docker compose up -d --build --force-recreate frontend
```

Không dùng `docker compose pull frontend`: image `review-shop-frontend:latest` được build trực tiếp trên VPS, không pull từ registry. Chỉ dùng `--no-cache` khi nghi ngờ cache:

```bash
docker compose build --no-cache frontend
docker compose up -d --force-recreate frontend
```

## Cập nhật toàn bộ hệ thống

```bash
cd /opt/review-shop/app
git pull --ff-only origin backend
cd /opt/review-shop/frontend
git pull --ff-only origin frontend
cd /opt/review-shop
docker compose config
docker compose up -d --build --force-recreate backend frontend
docker compose ps
```

## Kiểm tra service, API và FE

```bash
cd /opt/review-shop
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=100 frontend
curl -i http://127.0.0.1:8080/api/v1/required-levels
curl -I http://127.0.0.1:8081
```

Backend hiện map `127.0.0.1:8080 -> 8080`; Frontend map `127.0.0.1:8081 -> 80`. Project chưa bật Spring Actuator; response `401` từ API vẫn chứng minh backend đã nhận request.

Kiểm tra image/container FE:

```bash
docker inspect review-shop-frontend --format 'created={{.Created}} image={{.Image}}'
docker exec review-shop-frontend ls -l /usr/share/nginx/html/index.html
```

## Nginx và domain

```bash
nginx -t
systemctl reload nginx
nginx -T 2>/dev/null | grep -n -E '8080|8081|proxy_pass|root'
curl -I https://<domain>
```

Nếu `127.0.0.1:8081` là bản mới nhưng domain là bản cũ, kiểm tra Nginx, DNS, Cloudflare/CDN và cache trình duyệt.

## Backup database

```bash
mkdir -p /opt/review-shop/backups
cd /opt/review-shop
docker compose exec -T mysql sh -c 'mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > /opt/review-shop/backups/review-shop-$(date +%F-%H%M).sql
ls -lh /opt/review-shop/backups
```

Không chạy `docker compose down -v`; có thể xóa volume database. Backup trước Flyway migration hoặc deploy Backend.

## Rollback

```bash
git -C /opt/review-shop/app rev-parse HEAD
git -C /opt/review-shop/frontend rev-parse HEAD
```

Sau khi xác định commit cũ:

```bash
git -C /opt/review-shop/app checkout <backend-commit-cu>
git -C /opt/review-shop/frontend checkout <frontend-commit-cu>
cd /opt/review-shop
docker compose up -d --build --force-recreate backend frontend
```

Không xóa volume MySQL khi rollback.
