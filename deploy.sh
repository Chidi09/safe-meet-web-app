#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/safe-meet
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"
COMPOSE="docker compose -f $COMPOSE_FILE -p safemeet"
ACTIVE_FILE="$APP_DIR/.active_color"
SERVER_IP="204.168.203.203"

cd "$APP_DIR"

echo "[1/9] Updating source..."
git fetch origin main
git reset --hard origin/main

ACTIVE="none"
if [[ -f "$ACTIVE_FILE" ]]; then
  ACTIVE=$(cat "$ACTIVE_FILE")
fi

if [[ "$ACTIVE" == "blue" ]]; then
  NEW="green"
  WEB_PORT=3102
  API_PORT=4102
else
  NEW="blue"
  WEB_PORT=3101
  API_PORT=4101
fi

echo "Active color: $ACTIVE"
echo "Deploying color: $NEW"

echo "[2/9] Ensuring env files..."
if [[ ! -f "$APP_DIR/.env.api" ]]; then
  JWT_SECRET=$(openssl rand -hex 32)
  QR_SECRET=$(openssl rand -hex 32)
  cat > "$APP_DIR/.env.api" <<EOT
DATABASE_URL=postgresql://safemeet:safemeet_password@postgres:5432/safemeet
JWT_SECRET=$JWT_SECRET
QR_SECRET=$QR_SECRET
FRONTEND_URL=http://$SERVER_IP
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
EOT
fi

if [[ ! -f "$APP_DIR/.env.web" ]]; then
  cat > "$APP_DIR/.env.web" <<EOT
NEXT_PUBLIC_API_URL=http://$SERVER_IP/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=local-dev-project-id
NODE_ENV=production
EOT
fi

echo "[3/9] Building app image for $NEW..."
docker build -t "safe-meet-app:$NEW" -f "$APP_DIR/infra/Dockerfile" "$APP_DIR"

echo "[4/9] Starting core services (Postgres, Redis)..."
$COMPOSE up -d postgres redis

echo "[5/9] Running database migrations..."
docker run --rm --network safemeet_default --env-file "$APP_DIR/.env.api" "safe-meet-app:$NEW" sh -lc "cd /app/apps/api && npx prisma migrate deploy"

echo "[6/9] Starting new API/Web stack..."
$COMPOSE up -d "api_$NEW" "web_$NEW"

echo "[7/9] Waiting for health checks..."
for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null; then
    break
  fi
  sleep 3
done

for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}" >/dev/null; then
    break
  fi
  sleep 3
done

echo "[8/9] Configuring nginx and switching traffic..."
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update
  apt-get install -y nginx
  systemctl enable nginx
fi

sed -e "s/API_PORT/${API_PORT}/g" -e "s/WEB_PORT/${WEB_PORT}/g" "$APP_DIR/infra/nginx.safe-meet.conf.template" > /etc/nginx/sites-available/safe-meet
ln -sf /etc/nginx/sites-available/safe-meet /etc/nginx/sites-enabled/safe-meet
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "$NEW" > "$ACTIVE_FILE"

echo "[9/9] Deployment complete."
echo "Live URL: http://$SERVER_IP"
echo "Active color is now: $NEW"
