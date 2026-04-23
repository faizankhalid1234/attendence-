import os
from urllib.parse import urlparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _env_first(*names: str, default: str = "") -> str:
    for n in names:
        v = os.getenv(n, "").strip()
        if v:
            return v
    return default


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("JWT_SECRET", "replace-with-a-strong-secret")

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

DATABASES = {
    "default": {}
}

db_url = os.getenv("DATABASE_URL", "")
if db_url:
    parsed = urlparse(db_url)
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": parsed.username,
        "PASSWORD": parsed.password,
        "HOST": parsed.hostname,
        "PORT": parsed.port or 5432,
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
DEFAULT_FROM_EMAIL = _env_first("DEFAULT_FROM_EMAIL", "BREVO_SENDER_EMAIL", "SMTP_FROM", default="noreply@localhost")
EMAIL_BRAND_NAME = _env_first("EMAIL_BRAND_NAME", "BANK_NAME_EMAIL", default="Attendance Mark")
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
