# Base image and package indexes are build args so the image can be built inside Iran with mirrors.
ARG PY_IMAGE=python:3.12-slim
FROM ${PY_IMAGE}

ARG PIP_INDEX_URL=https://pypi.org/simple
ARG APT_MIRROR=
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_INDEX_URL=${PIP_INDEX_URL}
WORKDIR /app

RUN if [ -n "$APT_MIRROR" ]; then sed -i "s|http://deb.debian.org|$APT_MIRROR|g" /etc/apt/sources.list.d/debian.sources; fi \
    && apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install -r requirements.txt sentry-sdk==2.19.2

COPY . .
RUN DJANGO_SETTINGS_MODULE=config.settings.base python manage.py collectstatic --noinput \
    && useradd --create-home app && mkdir -p /app/private_media /app/media && chown -R app /app
USER app

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "60", "--access-logfile", "-"]
