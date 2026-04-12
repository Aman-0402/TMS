#!/bin/bash

echo "Running migrations..."
python manage.py migrate

echo "Starting server..."
gunicorn tms.wsgi:application --bind 0.0.0.0:$PORT