"""HTML + plain text bodies for transactional email (Brevo / SMTP)."""

from django.conf import settings
from django.utils.html import escape


def _brand() -> str:
    return escape(str(getattr(settings, "EMAIL_BRAND_NAME", "Attendance Mark")))


def _login_url() -> str:
    """Escaped URL safe for HTML href."""
    raw = (getattr(settings, "FRONTEND_LOGIN_URL", "") or "").strip().rstrip("/")
    return escape(raw) if raw else "#"


def _brand_plain() -> str:
    return str(getattr(settings, "EMAIL_BRAND_NAME", "Attendance Mark"))


def company_welcome_bundle(
    recipient_name: str,
    company_name: str,
    email: str,
    password: str,
) -> tuple[str, str, str]:
    """Subject, plain text, HTML for new company admin."""
    rn = escape(recipient_name.strip() or "there")
    cn = escape((company_name or "").strip() or "Your company")
    em = escape(email)
    pw = escape(password)
    brand = _brand()
    login = _login_url()
    subject = f"Welcome to {_brand_plain()} — {(company_name or '').strip() or 'Your company'}"
    text = (
        f"Hi {recipient_name},\n\n"
        f"Welcome! «{company_name}» is set up on {settings.EMAIL_BRAND_NAME}.\n\n"
        f"Login email: {email}\n"
        f"Password: {password}\n\n"
        f"Open the app: {(getattr(settings, 'FRONTEND_LOGIN_URL', '') or '').strip().rstrip('/') or '(ask your admin for the app URL)'}\n"
        f"Choose role «Company admin», then sign in.\n\n"
        f"— {settings.EMAIL_BRAND_NAME}"
    )
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0f172a;font-family:Segoe UI,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(165deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;border-radius:20px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.35);">
        <tr><td style="background:linear-gradient(135deg,#059669,#0d9488,#0891b2);padding:28px 32px;">
          <p style="margin:0;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.85);">{brand}</p>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;color:#fff;font-weight:800;">Welcome aboard, {rn}</h1>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:rgba(255,255,255,.92);">Your company <strong style="color:#fff;">{cn}</strong> is ready. Use the credentials below to open the <strong>Company admin</strong> portal.</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px 32px;color:#0f172a;">
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">Shift timings and office reference are managed in <strong>Django Admin</strong> on the server. This email is only for your web login.</p>
          <table role="presentation" width="100%" style="border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Login email</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a;word-break:break-all;">{em}</p>
              <p style="margin:18px 0 8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Password</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#059669;font-family:ui-monospace,monospace;letter-spacing:.04em;">{pw}</p>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0;"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);">
            <a href="{login}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">Open attendance app</a>
          </td></tr></table>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#64748b;">If the button does not work, copy this link: {escape((getattr(settings, 'FRONTEND_LOGIN_URL', '') or '').strip().rstrip('/') or '—')}</p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:11px;color:#64748b;">{brand} · secure attendance</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return subject, text, html


def member_invite_bundle(
    recipient_name: str,
    company_name: str,
    email: str,
    password: str,
) -> tuple[str, str, str]:
    """Subject, plain text, HTML for new member."""
    rn = escape(recipient_name.strip() or "there")
    cn = escape((company_name or "").strip() or "your team")
    em = escape(email)
    pw = escape(password)
    brand = _brand()
    login = _login_url()
    subject = f"You're invited — {(company_name or '').strip() or 'your team'} · {_brand_plain()}"
    text = (
        f"Hi {recipient_name},\n\n"
        f"{company_name} has added you on {settings.EMAIL_BRAND_NAME}.\n\n"
        f"Login email: {email}\n"
        f"Password: {password}\n\n"
        f"Open the app: {(getattr(settings, 'FRONTEND_LOGIN_URL', '') or '').strip().rstrip('/') or '(ask your manager for the app URL)'}\n"
        f"Choose role «Member», then sign in to mark attendance.\n\n"
        f"— {settings.EMAIL_BRAND_NAME}"
    )
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0f172a;font-family:Segoe UI,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(165deg,#1e1b4b 0%,#312e81 45%,#0f172a 100%);padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;border-radius:20px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.35);">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);padding:28px 32px;">
          <p style="margin:0;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.85);">{brand}</p>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;color:#fff;font-weight:800;">You’re on the team, {rn}</h1>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:rgba(255,255,255,.92);">You have been added to <strong style="color:#fff;">{cn}</strong>. Sign in as <strong>Member</strong> to mark check-in / check-out with live GPS when your shift window allows.</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px 32px;color:#0f172a;">
          <table role="presentation" width="100%" style="border-radius:14px;background:#faf5ff;border:1px solid #e9d5ff;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;">Your login email</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a;word-break:break-all;">{em}</p>
              <p style="margin:18px 0 8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;">Your password</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#7c3aed;font-family:ui-monospace,monospace;letter-spacing:.04em;">{pw}</p>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0;"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#6366f1,#9333ea);">
            <a href="{login}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">Open member portal</a>
          </td></tr></table>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#64748b;">Keep this email private. Change password after first login if your admin allows.</p>
        </td></tr>
        <tr><td style="background:#f5f3ff;padding:16px 32px;text-align:center;font-size:11px;color:#64748b;">{brand}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return subject, text, html
