#!/bin/sh
# Starts Django (internal, with the periodic-jobs thread instead of Celery beat) and the public Next.js server.
set -e
: "${DJANGO_SECRET_KEY:=$(python -c 'import secrets; print(secrets.token_urlsafe(50))')}"
export DJANGO_SECRET_KEY

cd /app/backend
gunicorn config.wsgi:application -c /app/gunicorn.conf.py --bind 127.0.0.1:8000 --workers 1 --threads 8 --timeout 60 &

# wait for Django so the first visitors don't get proxy errors
python - <<'PY'
import time, urllib.request
for _ in range(60):
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/api/provinces/", timeout=2)
        break
    except Exception:
        time.sleep(1)
PY

cd /app/web
# keep Node's heap small enough to share 512 MB with Django
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=192}"
exec node server.js
