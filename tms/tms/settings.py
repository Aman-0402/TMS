import os
from pathlib import Path
from datetime import timedelta
from urllib.parse import parse_qs, unquote, urlparse
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent


def _get_env_list(name, default=None):
    raw_value = os.getenv(name, "")
    if raw_value.strip():
        return [item.strip() for item in raw_value.split(",") if item.strip()]
    return default[:] if default else []


def _get_database_config():
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        parsed_url = urlparse(database_url)
        if parsed_url.scheme not in {"mysql", "mysql2"}:
            raise ValueError("DATABASE_URL must use a MySQL scheme.")

        query_params = parse_qs(parsed_url.query)
        options = {"charset": "utf8mb4"}
        if query_params.get("ssl-mode"):
            options["ssl_mode"] = query_params["ssl-mode"][0]

        return {
            "ENGINE": "django.db.backends.mysql",
            "NAME": unquote(parsed_url.path.lstrip("/")),
            "USER": unquote(parsed_url.username or ""),
            "PASSWORD": unquote(parsed_url.password or ""),
            "HOST": parsed_url.hostname or "localhost",
            "PORT": str(parsed_url.port or "3306"),
            "OPTIONS": options,
        }

    return {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("MYSQLDATABASE", "tms"),
        "USER": os.getenv("MYSQLUSER", "root"),
        "PASSWORD": os.getenv("MYSQLPASSWORD", ""),
        "HOST": os.getenv("MYSQLHOST", "localhost"),
        "PORT": os.getenv("MYSQLPORT", "3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    }

# ================= SECURITY =================
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-ds!)*!uhqyrz1-4mc=@!6t#87(2m4gfp1@cci$oqzu_o4ds=mh')

# Set DEBUG based on environment (False in production for Railway)
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = _get_env_list(
    "ALLOWED_HOSTS",
    [
        ".railway.app",
        ".up.railway.app",
        "localhost",
        "127.0.0.1",
    ],
)

# ================= INSTALLED APPS =================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'corsheaders',
    'rest_framework',

    'accounts',
    'batch',
    'students',
    'trainers',
    'labs',
    'attendance',
    'results',
    'exams',
    'certificates',
]

# ================= MIDDLEWARE =================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 🔥 MUST BE FIRST
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tms.urls'

# ================= TEMPLATES =================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tms.wsgi.application'

# ================= DATABASE =================
DATABASES = {
    'default': _get_database_config()
}

# ================= AUTH =================
AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ================= INTERNATIONAL =================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ================= STATIC =================
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# ================= DEFAULT =================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ================= DRF =================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',  # Allow unauthenticated access to public endpoints
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
}
# ================= CORS CONFIG =================
CORS_ALLOW_ALL_ORIGINS = False

DEFAULT_FRONTEND_ORIGINS = [
    "https://tms-gules-iota.vercel.app",
    "https://tmsethnotec.netlify.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOWED_ORIGINS = _get_env_list("CORS_ALLOWED_ORIGINS", DEFAULT_FRONTEND_ORIGINS)

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["authorization"]
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
CORS_PREFLIGHT_MAX_AGE = 86400
CORS_EXPOSE_HEADERS = ["Content-Type", "Authorization"]

CSRF_TRUSTED_ORIGINS = _get_env_list("CSRF_TRUSTED_ORIGINS", CORS_ALLOWED_ORIGINS)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
