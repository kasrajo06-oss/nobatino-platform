#!/bin/sh
# Daily compressed Postgres dump with rotation. Copy /backups off-server (e.g. to object storage) as well.
set -e
STAMP=$(date +%Y%m%d-%H%M%S)
pg_dump --format=custom --no-owner > "/backups/db-$STAMP.dump"
find /backups -name 'db-*.dump' -mtime +"${KEEP_DAYS:-14}" -delete
echo "backup done: db-$STAMP.dump"
