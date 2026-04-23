import datetime
import logging
import os
import random
import jwt
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail

from .email_html import company_welcome_bundle, member_invite_bundle

logger = logging.getLogger(__name__)


def _smtp_ready() -> bool:
    return bool(settings.EMAIL_HOST and settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)

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


def send_credentials_email(
    to: str,
    name: str,
    password: str,
    role: str,
    *,
    company_name: str | None = None,
) -> dict:
    """
    HTML welcome / invite mail for Company or Member; plain fallback always included.
    Returns {"sent": bool, "mocked": bool, "error": optional str}
    """
    if not _smtp_ready():
        logger.warning("[EMAIL MOCK] %s credentials to=%s (EMAIL_* / Brevo env khali)", role, to)
        print(f"[EMAIL MOCK] {role} credentials", {"to": to, "name": name, "password": password})
        return {"sent": False, "mocked": True}

    role_key = (role or "").strip()
    cn = (company_name or "").strip()
    try:
        if role_key in ("Company", "COMPANY_ADMIN"):
            subject, text_body, html_body = company_welcome_bundle(name, cn, to, password)
        elif role_key in ("Member", "MEMBER"):
            subject, text_body, html_body = member_invite_bundle(name, cn, to, password)
        else:
            subject = f"{role_key} — login credentials"
            text_body = f"Hi {name},\n\nEmail: {to}\nPassword: {password}\n"
            html_body = None

        kwargs = {
            "subject": subject,
            "message": text_body,
            "from_email": settings.DEFAULT_FROM_EMAIL,
            "recipient_list": [to],
            "fail_silently": False,
        }
        if html_body:
            kwargs["html_message"] = html_body
        send_mail(**kwargs)
        return {"sent": True, "mocked": False}
    except Exception as exc:  # noqa: BLE001
        logger.exception("SMTP send failed for %s", to)
        return {"sent": False, "mocked": False, "error": str(exc)}


def send_test_email(to: str) -> dict:
    """
    Returns {"mocked": bool} after sending (or mock). Raises on SMTP send failure.
    """
    if not _smtp_ready():
        print("[EMAIL MOCK] test email", {"to": to})
        return {"mocked": True}

    brand = getattr(settings, "EMAIL_BRAND_NAME", "Attendance Mark")
    html = f"""<html><body style="font-family:system-ui,sans-serif;padding:24px;background:#f8fafc;">
<p style="font-size:18px;font-weight:700;color:#0f172a;">{brand} — SMTP test OK</p>
<p style="color:#475569;">Agar ye HTML email inbox me sahi dikhe to Brevo / SMTP theek configure hai.</p>
</body></html>"""
    send_mail(
        subject=f"{brand} — SMTP test",
        message="Agar ye plain text message aa gaya to SMTP sahi configure hai.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to],
        fail_silently=False,
        html_message=html,
    )
    return {"mocked": False}
