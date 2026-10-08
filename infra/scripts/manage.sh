#!/usr/bin/env bash
# Run a Django management command inside the backend container, e.g.:
#   ./scripts/manage.sh make_admin 09121234567 --role superadmin
#   ./scripts/manage.sh createsuperuser
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml --env-file .env exec backend python manage.py "$@"
