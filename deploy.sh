#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/safe-meet
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"
COMPOSE="docker compose -f $COMPOSE_FILE -p safemeet"
ACTIVE_FILE="$APP_DIR/.active_color"
SERVER_IP="204.168.203.203"

cd "$APP_DIR"

echo "[1/10] Updating source..."
git fetch origin main
git reset --hard origin/main

ACTIVE="none"
if [[ -f "$ACTIVE_FILE" ]]; then
  ACTIVE=$(cat "$ACTIVE_FILE")
fi

if [[ "$ACTIVE" == "blue" ]]; then
  NEW="green"
  OLD="blue"
  WEB_PORT=3102
  API_PORT=4102
else
  NEW="blue"
  OLD="green"
  WEB_PORT=3101
  API_PORT=4101
fi

echo "Active color: $ACTIVE"
echo "Deploying color: $NEW"

echo "[2/10] Ensuring env files..."
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

echo "[3/10] Building app image for $NEW..."
docker build -t "safe-meet-app:$NEW" -f "$APP_DIR/infra/Dockerfile" "$APP_DIR"

echo "[4/10] Starting core services (Postgres, Redis)..."
$COMPOSE up -d postgres redis

echo "[5/10] Running database migrations..."
docker run --rm --network safemeet_default --env-file "$APP_DIR/.env.api" "safe-meet-app:$NEW" sh -lc "cd /app/apps/api && npx prisma migrate deploy"

echo "[6/10] Starting new API/Web stack ($NEW)..."
$COMPOSE up -d "api_$NEW" "web_$NEW"

echo "[7/10] Waiting for health checks..."
API_HEALTHY=0
for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    API_HEALTHY=1
    break
  fi
  echo "  API not ready yet ($i/40)..."
  sleep 3
done

if [[ $API_HEALTHY -eq 0 ]]; then
  echo "ERROR: API ($NEW) failed to become healthy after 120s. Aborting." >&2
  $COMPOSE logs "api_$NEW" | tail -40
  exit 1
fi

WEB_HEALTHY=0
for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}" >/dev/null 2>&1; then
    WEB_HEALTHY=1
    break
  fi
  echo "  Web not ready yet ($i/40)..."
  sleep 3
done

if [[ $WEB_HEALTHY -eq 0 ]]; then
  echo "ERROR: Web ($NEW) failed to become healthy after 120s. Aborting." >&2
  $COMPOSE logs "web_$NEW" | tail -40
  exit 1
fi

echo "[8/10] Configuring nginx and switching traffic..."
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y nginx
  systemctl enable nginx
fi

sed -e "s/API_PORT/${API_PORT}/g" -e "s/WEB_PORT/${WEB_PORT}/g" "$APP_DIR/infra/nginx.safe-meet.conf.template" > /etc/nginx/sites-available/safe-meet
ln -sf /etc/nginx/sites-available/safe-meet /etc/nginx/sites-enabled/safe-meet
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "$NEW" > "$ACTIVE_FILE"

echo "[9/10] Stopping old stack ($OLD)..."
if [[ "$OLD" != "none" ]]; then
  $COMPOSE stop "api_$OLD" "web_$OLD" 2>/dev/null || true
  $COMPOSE rm -f "api_$OLD" "web_$OLD" 2>/dev/null || true
fi

echo "[10/10] Pruning unused Docker images..."
docker image prune -f
# Remove the old color image to free disk space
docker rmi "safe-meet-app:$OLD" 2>/dev/null || true

echo "Deployment complete."
echo "Live URL: http://$SERVER_IP"
echo "Active color is now: $NEW"
