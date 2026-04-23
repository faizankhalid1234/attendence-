#!/bin/bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

echo "[deploy] Installing backend requirements..."
"${PYTHON_BIN}" -m ensurepip --upgrade >/dev/null 2>&1 || true
"${PYTHON_BIN}" -m pip install --upgrade pip
"${PYTHON_BIN}" -m pip install --no-cache-dir -r backend/requirements.txt

if ! "${PYTHON_BIN}" -c "import django" >/dev/null 2>&1; then
  echo "[deploy] Django import still failing after install."
  exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "[deploy] frontend/node_modules missing. Installing frontend dependencies..."
  npm ci --prefix frontend
fi

echo "[deploy] Running Django migrations..."
"${PYTHON_BIN}" backend/manage.py migrate --noinput

echo "[deploy] Starting Django API on 4000 (gunicorn)..."
"${PYTHON_BIN}" -m gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:4000 --workers "${GUNICORN_WORKERS:-2}" &

echo "[deploy] Starting Next.js on ${PORT:-3000}..."
exec npm run start --prefix frontend -- -p "${PORT:-3000}"
