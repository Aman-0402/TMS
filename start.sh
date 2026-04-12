#!/bin/bash

set -e

# Activate the venv created by Railpack/Nixpacks during the install phase
source /opt/venv/bin/activate

# manage.py lives in the tms/ subdirectory
cd /app/tms

echo "Running migrations..."
python manage.py migrate

echo "Starting server..."
python -m gunicorn tms.wsgi:application --bind 0.0.0.0:$PORT