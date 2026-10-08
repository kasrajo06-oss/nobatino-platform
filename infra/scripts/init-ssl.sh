#!/usr/bin/env bash
# First-time Let's Encrypt certificate (nginx needs a certificate to start, so we bootstrap with a dummy one).
#   cd infra && ./scripts/init-ssl.sh
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

LIVE="certbot/conf/live/${DOMAIN}"
mkdir -p "$LIVE" certbot/www
if [ ! -f "$LIVE/fullchain.pem" ]; then
  echo ">> creating temporary self-signed certificate"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 -subj "/CN=${DOMAIN}" \
    -keyout "$LIVE/privkey.pem" -out "$LIVE/fullchain.pem" >/dev/null 2>&1
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d nginx

echo ">> requesting Let's Encrypt certificate for ${DOMAIN} and www.${DOMAIN}"
rm -rf "$LIVE" "certbot/conf/archive/${DOMAIN}" "certbot/conf/renewal/${DOMAIN}.conf"
docker compose -f docker-compose.prod.yml --env-file .env run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot -d "${DOMAIN}" -d "www.${DOMAIN}" \
  --email "${LETSENCRYPT_EMAIL}" --agree-tos --no-eff-email --non-interactive

docker compose -f docker-compose.prod.yml --env-file .env exec nginx nginx -s reload
echo ">> SSL ready: https://${DOMAIN}"
