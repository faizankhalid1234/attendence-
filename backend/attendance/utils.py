import datetime
import logging
import os
import random
import jwt
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

COOKIE_NAME = "attendance_session"


def hash_password(password: str) -> str:
    return make_password(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password(password, password_hash)


def generate_password(length: int = 10) -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$"
    return "".join(random.choice(chars) for _ in range(length))


def make_token(payload: dict) -> str:
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    token_payload = {**payload, "exp": exp}
    return jwt.encode(token_payload, settings.SECRET_KEY, algorithm="HS256")


def read_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None


def _auth_cookie_secure() -> bool:
    """
    Secure cookies are HTTPS-only. Use Django DEBUG (not NODE_ENV) so local HTTP dev works.
    Override with DJANGO_AUTH_COOKIE_SECURE=true|false if needed behind HTTPS terminators.
    """
    raw = os.getenv("DJANGO_AUTH_COOKIE_SECURE", "").strip().lower()
    if raw in ("1", "true", "yes"):
        return True
    if raw in ("0", "false", "no"):
        return False
    return not settings.DEBUG


def set_auth_cookie(response, token: str):
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=60 * 60 * 24 * 7,
        httponly=True,
        samesite="Lax",
        secure=_auth_cookie_secure(),
        path="/",
    )


def clear_auth_cookie(response):
    response.delete_cookie(COOKIE_NAME, path="/")


def send_credentials_email(to: str, name: str, password: str, role: str) -> dict:
    """
    Returns {"sent": bool, "mocked": bool, "error": optional str}
    """
    host = os.getenv("SMTP_HOST", "")
    user = os.getenv("SMTP_USER", "")
    pwd = os.getenv("SMTP_PASS", "")
    if not host or not user or not pwd:
        logger.warning("[EMAIL MOCK] %s credentials to=%s (SMTP env khali)", role, to)
        print(f"[EMAIL MOCK] {role} credentials", {"to": to, "name": name, "password": password})
        return {"sent": False, "mocked": True}

    try:
        send_mail(
            subject=f"{role} Account Credentials",
            message=f"Hi {name},\nEmail: {to}\nPassword: {password}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )
        return {"sent": True, "mocked": False}
    except Exception as exc:  # noqa: BLE001
        logger.exception("SMTP send failed for %s", to)
        return {"sent": False, "mocked": False, "error": str(exc)}


def send_test_email(to: str) -> dict:
    """
    Returns {"mocked": bool} after sending (or mock). Raises on SMTP send failure.
    """
    host = os.getenv("SMTP_HOST", "")
    user = os.getenv("SMTP_USER", "")
    pwd = os.getenv("SMTP_PASS", "")
    if not host or not user or not pwd:
        print("[EMAIL MOCK] test email", {"to": to})
        return {"mocked": True}

    send_mail(
        subject="Attendance app — SMTP test",
        message="Agar ye message Gmail par aa gaya to SMTP sahi configure hai.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to],
        fail_silently=False,
    )
    return {"mocked": False}
