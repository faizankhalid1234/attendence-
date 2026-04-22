#!/bin/bash
set -euo pipefail

echo "[deploy] Running Django migrations..."
python backend/manage.py migrate --noinput

echo "[deploy] Starting Django API on 4000 (gunicorn)..."
gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:4000 --workers "${GUNICORN_WORKERS:-2}" &

echo "[deploy] Starting Next.js on ${PORT:-3000}..."
exec npm run start --prefix frontend -- -p "${PORT:-3000}"
