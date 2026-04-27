#!/bin/bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

echo "[deploy] Installing backend requirements..."
"${PYTHON_BIN}" -m ensurepip --upgrade >/dev/null 2>&1 || true
"${PYTHON_BIN}" -m pip install --root-user-action=ignore --upgrade pip
"${PYTHON_BIN}" -m pip install --root-user-action=ignore --no-cache-dir -r backend/requirements.txt

if ! "${PYTHON_BIN}" -c "import django" >/dev/null 2>&1; then
  echo "[deploy] Django import still failing after install."
  exit 1
fi

echo "[deploy] Running Django migrations..."
"${PYTHON_BIN}" backend/manage.py migrate --noinput

echo "[deploy] Starting Django API on ${PORT:-8000} (gunicorn)..."
exec "${PYTHON_BIN}" -m gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:"${PORT:-8000}" --workers "${GUNICORN_WORKERS:-2}" --log-level warning
