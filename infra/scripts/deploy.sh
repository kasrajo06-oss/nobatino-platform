#!/usr/bin/env bash
# Build and (re)start the whole stack. Safe to run again after every update:
#   cd infra && ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "infra/.env is missing: cp .env.example .env and fill it in"; exit 1; }
set -a; . ./.env; set +a

# staging: password-protect the site and hide it from search engines
mkdir -p nginx certbot/conf certbot/www backups
if [ "${STAGING:-false}" = "true" ]; then
  printf '%s:%s\n' "${BASIC_AUTH_USER}" "$(openssl passwd -apr1 "${BASIC_AUTH_PASSWORD}")" > nginx/htpasswd
  export BASIC_AUTH="${BRAND_NAME} staging" ROBOTS_TAG="noindex, nofollow"
else
  : > nginx/htpasswd
  export BASIC_AUTH="off" ROBOTS_TAG="all"
fi

if [ ! -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
  echo ">> no certificate yet, running init-ssl.sh first"
  ./scripts/init-ssl.sh
fi

docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
docker compose -f docker-compose.prod.yml --env-file .env ps
echo
echo ">> deployed: https://${DOMAIN}"
[ "${STAGING:-false}" = "true" ] && echo ">> staging login: ${BASIC_AUTH_USER} / (BASIC_AUTH_PASSWORD from .env)"
echo ">> create your admin account:  ./scripts/manage.sh make_admin 09XXXXXXXXX --role superadmin"
