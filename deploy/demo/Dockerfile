# Public demo: the whole platform in ONE container — Next.js (public port) + Django (127.0.0.1:8000) + SQLite
# with fake data seeded at build time. For free hosts without a domain; see docs/16-free-demo-hosting.md.
#   docker build -f deploy/demo/Dockerfile -t nobatino-demo .   &&   docker run -p 8080:8080 nobatino-demo

FROM node:22-slim AS web
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm config set registry ${NPM_REGISTRY} && npm config set fetch-retries 6 \
    && npm config set fetch-retry-maxtimeout 120000 && npm ci --no-audit --no-fund
COPY frontend/ .
ARG NEXT_PUBLIC_BRAND_NAME=نوبتینو
ARG NEXT_PUBLIC_SITE_URL=http://localhost:8080
ARG NEXT_PUBLIC_SUPPORT_PHONE=021-00000000
ARG NEXT_PUBLIC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"}]
ENV NEXT_TELEMETRY_DISABLED=1 API_INTERNAL_URL=http://127.0.0.1:8000 \
    NEXT_PUBLIC_STAGING=true NEXT_PUBLIC_DEMO_MODE=true \
    NEXT_PUBLIC_BRAND_NAME=${NEXT_PUBLIC_BRAND_NAME} NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_SUPPORT_PHONE=${NEXT_PUBLIC_SUPPORT_PHONE} NEXT_PUBLIC_ICE_SERVERS=${NEXT_PUBLIC_ICE_SERVERS}
RUN npm run build

FROM python:3.12-slim
ARG PIP_INDEX_URL=https://pypi.org/simple
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_DEFAULT_TIMEOUT=120 PIP_RETRIES=10 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings.demo DATABASE_URL=sqlite:////data/demo.sqlite3 \
    PRIVATE_MEDIA_ROOT=/data/private_media \
    NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=8080 API_INTERNAL_URL=http://127.0.0.1:8000
# the standalone Next.js server only needs the node binary
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
# seed once here (build machines are much faster than free-tier runtimes); data resets on every restart
RUN useradd --create-home --uid 1000 app && mkdir -p /data/private_media /app/backend/media \
    && DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput -v0 \
    && DJANGO_SECRET_KEY=build-only python manage.py migrate --noinput -v0 \
    && DJANGO_SECRET_KEY=build-only python manage.py seed_reference \
    && DJANGO_SECRET_KEY=build-only python manage.py seed_fake --doctors 150 --centers 60 \
    && chown -R app /data /app/backend
COPY --from=web --chown=app /app/.next/standalone /app/web
COPY --from=web --chown=app /app/.next/static /app/web/.next/static
COPY --from=web --chown=app /app/public /app/web/public
COPY --chmod=755 deploy/demo/start.sh /app/start.sh
COPY deploy/demo/gunicorn.conf.py /app/gunicorn.conf.py
USER app
EXPOSE 8080
CMD ["/app/start.sh"]
