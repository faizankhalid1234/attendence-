"""HTML + plain text bodies for transactional email (Brevo / SMTP)."""

from django.conf import settings
from django.utils.html import escape

_FONT = (
    "'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',"
    "Arial,sans-serif"
)


def _brand() -> str:
    return escape(str(getattr(settings, "EMAIL_BRAND_NAME", "Attendance Mark")))


def _login_url() -> str:
    """Escaped URL safe for HTML href."""
    raw = (getattr(settings, "FRONTEND_LOGIN_URL", "") or "").strip().rstrip("/")
    return escape(raw) if raw else "#"


def _brand_plain() -> str:
    return str(getattr(settings, "EMAIL_BRAND_NAME", "Attendance Mark"))


def _login_plain() -> str:
    return (getattr(settings, "FRONTEND_LOGIN_URL", "") or "").strip().rstrip("/") or ""


def _preheader(text: str) -> str:
    t = escape(text[:140])
    return (
        f'<div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;'
        f'max-height:0;max-width:0;opacity:0;overflow:hidden;">{t}</div>'
    )


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
    login_raw = _login_plain() or "—"
    subject = f"Welcome to {_brand_plain()} — {(company_name or '').strip() or 'Your company'}"
    text = (
        f"Hi {recipient_name},\n\n"
        f"Welcome! «{company_name}» is set up on {settings.EMAIL_BRAND_NAME}.\n\n"
        f"Login email: {email}\n"
        f"Password: {password}\n\n"
        f"Open the app: {_login_plain() or '(ask your admin for the app URL)'}\n"
        f"Choose role «Company admin», then sign in.\n\n"
        f"— {settings.EMAIL_BRAND_NAME}"
    )
    preview = f"{brand}: {cn} — company admin login ready"
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#e8eef4;font-family:{_FONT};-webkit-font-smoothing:antialiased;">
{_preheader(preview)}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#dfe7f0 0%,#eef2f7 40%,#f4f6fa 100%);padding:40px 16px 48px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-radius:24px;overflow:hidden;box-shadow:0 4px 6px rgba(15,23,42,.04),0 24px 48px rgba(15,23,42,.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 42%,#115e59 100%);padding:36px 40px 40px;position:relative;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.18);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ecfdf5;">{brand}</span>
                  </td>
                </tr>
                <tr><td style="padding-top:20px;">
                  <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:#fff;letter-spacing:-.02em;">Welcome, {rn}</h1>
                  <p style="margin:14px 0 0;font-size:16px;line-height:1.65;color:rgba(255,255,255,.92);">
                    <strong style="color:#fff;">{cn}</strong> is live on {brand}. Sign in as <strong style="color:#fff;">Company admin</strong> to manage attendance, timings, and your team.
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px 40px 40px;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#475569;">
                Use the secure credentials below. Keep this email safe &mdash; anyone with these details can access your company dashboard.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:16px;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td style="width:4px;background:linear-gradient(180deg,#14b8a6,#0d9488);padding:0;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:24px 26px;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b;">Login email</p>
                    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#0f172a;word-break:break-all;line-height:1.35;">{em}</p>
                    <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#64748b;">Temporary password</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#0f766e;font-family:ui-monospace,Consolas,monospace;letter-spacing:.06em;line-height:1.4;">{pw}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
                <tr>
                  <td style="border-radius:14px;background:linear-gradient(135deg,#0d9488,#0f766e);box-shadow:0 8px 24px rgba(13,148,136,.35);">
                    <a href="{login}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;border-radius:14px;">Open company dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                Button not working? Paste this link in your browser:<br>
                <span style="color:#0f766e;word-break:break-all;">{escape(login_raw)}</span>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-top:1px solid #f1f5f9;">
                <tr><td style="padding-top:22px;">
                  <p style="margin:0;font-size:13px;line-height:1.55;color:#94a3b8;">
                    <strong style="color:#64748b;">Tip:</strong> Office hours &amp; map pin are set in Django Admin on the server. This email is only for your web login.
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(180deg,#f8fafc,#f1f5f9);padding:22px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;font-weight:700;color:#475569;letter-spacing:.04em;">{brand}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Secure attendance for your workplace</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;text-align:center;max-width:480px;">You received this because a company account was created with your email.</p>
      </td>
    </tr>
  </table>
</body>
</html>"""
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
    login_raw = _login_plain() or "—"
    subject = f"You're invited — {(company_name or '').strip() or 'your team'} · {_brand_plain()}"
    text = (
        f"Hi {recipient_name},\n\n"
        f"{company_name} has added you on {settings.EMAIL_BRAND_NAME}.\n\n"
        f"Login email: {email}\n"
        f"Password: {password}\n\n"
        f"Open the app: {_login_plain() or '(ask your manager for the app URL)'}\n"
        f"Choose role «Member», then sign in to mark attendance.\n\n"
        f"— {settings.EMAIL_BRAND_NAME}"
    )
    preview = f"{brand}: {cn} added you — member login"
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ede9fe;font-family:{_FONT};-webkit-font-smoothing:antialiased;">
{_preheader(preview)}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(165deg,#ddd6fe 0%,#ede9fe 35%,#f5f3ff 70%,#faf5ff 100%);padding:40px 16px 48px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-radius:24px;overflow:hidden;box-shadow:0 4px 6px rgba(76,29,149,.06),0 24px 48px rgba(76,29,149,.14);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 38%,#5b21b6 100%);padding:36px 40px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.2);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ede9fe;">{brand}</span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:8px 14px;border-radius:10px;background:rgba(255,255,255,.95);font-size:11px;font-weight:800;color:#5b21b6;letter-spacing:.06em;">MEMBER</span>
                  </td>
                </tr>
                <tr><td colspan="2" style="padding-top:20px;">
                  <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:#fff;letter-spacing:-.02em;">You are on the team, {rn}</h1>
                  <p style="margin:14px 0 0;font-size:16px;line-height:1.65;color:rgba(255,255,255,.93);">
                    <strong style="color:#fff;">{cn}</strong> has invited you to mark attendance with {brand}. Check in and check out from your phone when your shift allows.
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px 40px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;border-radius:14px;background:linear-gradient(135deg,#faf5ff,#f5f3ff);border:1px solid #e9d5ff;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b21a8;font-weight:600;">After opening the app, choose role <strong>Member</strong> on the login screen, then enter the details below.</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:16px;background:linear-gradient(180deg,#faf5ff 0%,#f5f3ff 100%);border:1px solid #e9d5ff;overflow:hidden;">
                <tr>
                  <td style="width:4px;background:linear-gradient(180deg,#a855f7,#7c3aed);padding:0;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:24px 26px;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;">Your login email</p>
                    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1e1b4b;word-break:break-all;line-height:1.35;">{em}</p>
                    <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;">Your password</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#6d28d9;font-family:ui-monospace,Consolas,monospace;letter-spacing:.06em;line-height:1.4;">{pw}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
                <tr>
                  <td style="border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);box-shadow:0 8px 28px rgba(124,58,237,.4);">
                    <a href="{login}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;border-radius:14px;">Open member app</a>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                Link not opening? Copy and paste:<br>
                <span style="color:#6d28d9;word-break:break-all;">{escape(login_raw)}</span>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;border-radius:14px;background:#fefce8;border:1px solid #fef08a;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:0;font-size:13px;line-height:1.55;color:#854d0e;">
                    <strong style="color:#a16207;">Privacy:</strong> Do not forward this email. Ask your manager if you need a new password.
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(180deg,#faf5ff,#f3e8ff);padding:22px 40px;text-align:center;border-top:1px solid #e9d5ff;">
              <p style="margin:0;font-size:12px;font-weight:700;color:#5b21b6;letter-spacing:.04em;">{brand}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#7c3aed;">Check-in &amp; check-out made simple</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#a78bfa;text-align:center;max-width:480px;">You received this because your team added you on {brand}.</p>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, text, html
