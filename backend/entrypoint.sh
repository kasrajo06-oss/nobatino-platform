#!/bin/sh
# Run migrations and load reference data before starting the API container.
set -e
python manage.py migrate --noinput
python manage.py seed_reference
exec "$@"
