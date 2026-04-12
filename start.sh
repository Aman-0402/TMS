#!/bin/bash
source /opt/venv/bin/activate
cd tms
gunicorn tms.wsgi
