#!/bin/sh
# Run migrations and load reference data before starting the API container.
set -e
python manage.py migrate --noinput
python manage.py seed_reference
if [ "$SEED_FAKE_DATA" = "true" ] && [ "$STAGING" = "true" ]; then
  # demo doctors/centers only on a staging server, and only once
  python manage.py shell -c "from apps.doctors.models import DoctorProfile; import sys; sys.exit(0 if DoctorProfile.objects.exists() else 1)" \
    || python manage.py seed_fake --days 21
fi
exec "$@"
