import hashlib
import os
import re
from urllib.parse import unquote, urlparse
from pathlib import Path
from dotenv import load_dotenv

# Always load backend/.env — cwd par depend na ho (warna SMTP vars miss ho kar "SMTP off" dikhta hai).
_BASE = Path(__file__).resolve().parent.parent
load_dotenv(_BASE / ".env")


def _env_first(*names: str, default: str = "") -> str:
    for n in names:
        v = os.getenv(n, "").strip()
        if v:
            return v
    return default


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = _BASE


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# PyJWT HS256 warns if key material < 32 bytes — hamesha SHA-256 hex (64 char UTF-8 = 64 bytes) use karte hain.
# JWT_SECRET same rakho; deploy ke baad sab users ek dafa dubara login (signing key format badla).
def _django_secret_from_jwt_env() -> str:
    raw = (os.getenv("JWT_SECRET") or "").strip() or "replace-with-a-strong-secret"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


SECRET_KEY = _django_secret_from_jwt_env()

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = ["*"]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'attendance',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'attendance.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {"default": {}}


def _valid_pg_url(raw: str) -> bool:
    s = (raw or "").strip()
    if not s or "://" not in s:
        return False
    p = urlparse(s)
    return p.scheme in ("postgres", "postgresql", "psql") and bool(p.hostname)


db_url = _env_first("DATABASE_URL", "DATABASE_PRIVATE_URL", "DATABASE_PUBLIC_URL", "POSTGRES_URL", "POSTGRESQL_URL")
if _valid_pg_url(db_url):
    parsed = urlparse(db_url.strip())
    parsed_name = unquote((parsed.path or "").lstrip("/"))
    override_name = _env_first("PGDATABASE", "POSTGRES_DB", "DB_NAME")
    db_name = (override_name or parsed_name).strip()
    db_host = (
        _env_first("PGHOST", "POSTGRES_HOST", "DB_HOST")
        or (parsed.hostname or "").strip()
    )
    db_user = (
        _env_first("PGUSER", "POSTGRES_USER", "DB_USER")
        or (parsed.username or "").strip()
    )
    db_password = (
        _env_first("PGPASSWORD", "POSTGRES_PASSWORD", "DB_PASSWORD")
        or (parsed.password or "").strip()
    )
    db_port_raw = _env_first("PGPORT", "POSTGRES_PORT", "DB_PORT")
    db_port = int(db_port_raw or parsed.port or 5432)
    # PostgreSQL identifier limit (Django validates this before connecting).
    # Some platforms occasionally inject a malformed DATABASE_URL path; in that case
    # allow explicit DB-name env vars to take precedence.
    if len(db_name) > 63:
        fallback_name = (parsed_name[:63]).strip()
        db_name = fallback_name

    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": db_name,
        "USER": db_user,
        "PASSWORD": db_password,
        "HOST": db_host,
        "PORT": db_port,
        "OPTIONS": {"sslmode": "require"},
    }
else:
    # Fallback: Railway style discrete PG vars (without DATABASE_URL).
    pg_host = _env_first("PGHOST", "POSTGRES_HOST", "DB_HOST")
    pg_name = _env_first("PGDATABASE", "POSTGRES_DB", "DB_NAME")
    pg_user = _env_first("PGUSER", "POSTGRES_USER", "DB_USER")
    pg_password = _env_first("PGPASSWORD", "POSTGRES_PASSWORD", "DB_PASSWORD")
    pg_port = int(_env_first("PGPORT", "POSTGRES_PORT", "DB_PORT") or "5432")

    if pg_host and pg_name and pg_user:
        DATABASES["default"] = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": pg_name[:63],
            "USER": pg_user,
            "PASSWORD": pg_password,
            "HOST": pg_host,
            "PORT": pg_port,
            "OPTIONS": {"sslmode": "require"},
        }
    else:
        DATABASES["default"] = {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

FILE_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# Brevo: EMAIL_HOST=smtp-relay.brevo.com, BREVO_SMTP_LOGIN + BREVO_SMTP_KEY (or legacy SMTP_*)
EMAIL_HOST = _env_first("EMAIL_HOST", "SMTP_HOST")
EMAIL_PORT = int(_env_first("EMAIL_PORT", "SMTP_PORT") or "587")
EMAIL_HOST_USER = _env_first("EMAIL_HOST_USER", "SMTP_USER", "BREVO_SMTP_LOGIN")
EMAIL_HOST_PASSWORD = _env_first("EMAIL_HOST_PASSWORD", "SMTP_PASS", "BREVO_SMTP_KEY")
EMAIL_USE_TLS = _env_first("EMAIL_USE_TLS", default="true").lower() in ("1", "true", "yes", "on")

# Inbox "From" display name + HTML templates (do not use BANK_NAME_EMAIL — that was a misleading alias)
EMAIL_BRAND_NAME = _env_first("EMAIL_BRAND_NAME", default="Attendance Mark")
EMAIL_FROM_NAME = _env_first("EMAIL_FROM_NAME", default=EMAIL_BRAND_NAME)


def _parse_angle_bracket_email(raw: str) -> str | None:
    """'Any Name <addr@domain>' se sirf email nikalta hai."""
    m = re.search(r"<\s*([^>\s]+@[^>\s]+)\s*>", raw)
    return m.group(1).strip() if m else None


def _default_from_email() -> str:
    raw = _env_first("DEFAULT_FROM_EMAIL", "BREVO_SENDER_EMAIL", "SMTP_FROM")
    display = (EMAIL_FROM_NAME or EMAIL_BRAND_NAME or "Attendance Mark").strip().replace('"', "")
    if not raw:
        return "noreply@localhost"
    inner = _parse_angle_bracket_email(raw)
    if inner:
        # Purani "Ally Bank <...>" jaisi strings ignore — From naam hamesha EMAIL_BRAND_NAME se
        return f"{display} <{inner}>" if display else inner
    if "@" in raw:
        return f"{display} <{raw}>" if display else raw
    return raw


DEFAULT_FROM_EMAIL = _default_from_email()
FRONTEND_LOGIN_URL = _env_first("FRONTEND_LOGIN_URL", default="http://localhost:3000").rstrip("/")

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Purane bcrypt hashes (agar DB me hon) verify karne ke liye
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.BCryptPasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
]
