#!/bin/bash
set -euo pipefail

if ! python -c "import django" >/dev/null 2>&1; then
  echo "[deploy] Django not found. Installing backend requirements..."
  python -m pip install --no-cache-dir -r backend/requirements.txt
fi

if ! command -v gunicorn >/dev/null 2>&1; then
  echo "[deploy] gunicorn not found. Installing backend requirements..."
  python -m pip install --no-cache-dir -r backend/requirements.txt
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "[deploy] frontend/node_modules missing. Installing frontend dependencies..."
  npm ci --prefix frontend
fi

echo "[deploy] Running Django migrations..."
python backend/manage.py migrate --noinput

echo "[deploy] Starting Django API on 4000 (gunicorn)..."
gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:4000 --workers "${GUNICORN_WORKERS:-2}" &

echo "[deploy] Starting Next.js on ${PORT:-3000}..."
exec npm run start --prefix frontend -- -p "${PORT:-3000}"
