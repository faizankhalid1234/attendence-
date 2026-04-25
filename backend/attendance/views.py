import datetime
import json
import logging
import uuid
import math
import os
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal
from functools import wraps
from zoneinfo import ZoneInfo

from django.conf import settings as django_settings
from django.db import DatabaseError, IntegrityError
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .geo import haversine_meters
from .models import Attendance, Company, Role, User
from .time_rules import company_local_date, company_local_now, in_work_window, stored_timezone_is_valid
from .utils import (
    COOKIE_NAME,
    clear_auth_cookie,
    generate_password,
    hash_password,
    make_token,
    read_token,
    send_credentials_email,
    send_test_email,
    set_auth_cookie,
    verify_password,
)

logger = logging.getLogger(__name__)


def _clamp_distance_meters(distance_m: float) -> int:
    """PositiveIntegerField-safe distance in meters (haversine output)."""
    if not math.isfinite(distance_m) or distance_m < 0:
        return 0
    v = int(round(min(distance_m, 2_000_000_000)))
    return max(0, min(v, 2_147_483_647))


def _geo_decimal(v: float) -> Decimal:
    """Fit company/attendance DecimalField(max_digits=10, decimal_places=7)."""
    if not math.isfinite(v):
        raise ValueError("non-finite coordinate")
    return Decimal(str(v)).quantize(Decimal("0.0000001"))


def parse_body(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception:
        return {}


def _first_float(body: dict, *keys: str) -> float | None:
    for key in keys:
        if key not in body:
            continue
        raw = body.get(key)
        if raw is None or raw == "":
            continue
        try:
            return float(raw)
        except (TypeError, ValueError):
            raise ValueError(f"{key} must be numeric.")
    return None


def _first_int(body: dict, *keys: str) -> int | None:
    for key in keys:
        if key not in body:
            continue
        raw = body.get(key)
        if raw is None or raw == "":
            continue
        try:
            return int(raw)
        except (TypeError, ValueError):
            raise ValueError(f"{key} must be numeric.")
    return None


def require_valid_iana_timezone(tz_name: str) -> str | None:
    raw = (tz_name or "").strip()
    if not raw:
        return None
    try:
        ZoneInfo(raw)
    except Exception:
        return None
    return raw


def parse_hhmm(value: str):
    raw = (value or "").strip()
    parts = raw.split(":")
    if len(parts) < 2:
        raise ValueError("time format HH:MM")
    h, m = int(parts[0]), int(parts[1])
    return datetime.time(h, m, 0)


def email_already_taken(email: str, *, ignore_company_id: str | None = None, ignore_user_id: str | None = None) -> bool:
    company_qs = Company.objects.filter(email__iexact=email)
    if ignore_company_id:
        company_qs = company_qs.exclude(id=ignore_company_id)
    if company_qs.exists():
        return True
    user_qs = User.objects.filter(email__iexact=email)
    if ignore_user_id:
        user_qs = user_qs.exclude(id=ignore_user_id)
    return user_qs.exists()


def allowed_image_type(upload) -> bool:
    ctype = (getattr(upload, "content_type", "") or "").lower()
    if ctype in ("image/jpeg", "image/png", "image/webp", "image/jpg", "application/octet-stream"):
        return True
    name = (getattr(upload, "name", "") or "").lower()
    return name.endswith((".jpg", ".jpeg", ".png", ".webp"))


def _normalize_expected_role(raw: str) -> str | None:
    r = (raw or "").strip().upper().replace("-", "_")
    if r in ("COMPANY", "OWNER", "BUSINESS", "COMPANY_ADMIN", "ADMIN"):
        return Role.COMPANY_ADMIN
    if r in ("MEMBER", "STAFF", "EMPLOYEE", "TEAM"):
        return Role.MEMBER
    if r in ("SUPER", "SUPERADMIN", "SUPER_ADMIN"):
        return Role.SUPER_ADMIN
    return None


def auth_required(*roles):
    def outer(fn):
        @wraps(fn)
        def inner(request, *args, **kwargs):
            token = request.COOKIES.get(COOKIE_NAME)
            if not token:
                payload = {"error": "Unauthorized"}
                if django_settings.DEBUG:
                    payload["hint"] = "No session cookie — log in again (same host as the app, e.g. localhost not 127.0.0.1)."
                return JsonResponse(payload, status=401)
            session = read_token(token)
            if not session:
                payload = {"error": "Unauthorized"}
                if django_settings.DEBUG:
                    payload["hint"] = "Invalid or expired token — log in again; check JWT_SECRET unchanged since login."
                return JsonResponse(payload, status=401)
            if roles and session.get("role") not in roles:
                payload = {"error": "Unauthorized"}
                if django_settings.DEBUG:
                    payload["hint"] = (
                        f"Role {session.get('role')!r} is not allowed — this action needs one of: {list(roles)}."
                    )
                return JsonResponse(payload, status=401)
            request.session_user = session
            return fn(request, *args, **kwargs)

        return inner

    return outer


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    body = parse_body(request)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password")
    password = password if isinstance(password, str) else ""
    if not email or not password:
        return JsonResponse({"error": "Invalid credentials payload"}, status=400)

    role_labels = {
        Role.COMPANY_ADMIN: "Company admin",
        Role.MEMBER: "Member (staff)",
        Role.SUPER_ADMIN: "Super admin",
    }
    expected = _normalize_expected_role(str(body.get("expectedRole") or body.get("role") or ""))

    base = list(
        User.objects.select_related("company")
        .filter(email__iexact=email)
        .order_by("-created_at")
    )

    def first_password_match(users: list, role: str | None):
        for u in users:
            if role is not None and u.role != role:
                continue
            if verify_password(password, u.password_hash):
                return u
        return None

    user = first_password_match(base, expected) if expected else first_password_match(base, None)

    if not user:
        payload: dict = {"error": "Invalid email or password"}
        if not base:
            if Company.objects.filter(email__iexact=email).exists():
                payload["hint"] = (
                    "Company record is email par hai lekin user login set nahi. "
                    "Django Admin > Companies > edit > Company login password save karein."
                )
            if django_settings.DEBUG:
                payload["debug_hint"] = "user_not_found"
            return JsonResponse(payload, status=401)

        pwd_user = first_password_match(base, None)
        if pwd_user and expected and pwd_user.role != expected:
            payload["accountRole"] = pwd_user.role
            payload["accountRoleLabel"] = role_labels.get(pwd_user.role, pwd_user.role)
            payload["hint"] = (
                f"Password sahi hai — is email par «{payload['accountRoleLabel']}» account mila. "
                f"Login form par wahi role chunein (aap ne «{role_labels.get(expected, expected)}» chuna tha)."
            )
        elif expected and not any(u.role == expected for u in base):
            roles_here = sorted({role_labels.get(u.role, u.role) for u in base})
            payload["hint"] = (
                f"Is email par «{role_labels.get(expected, expected)}» wala account nahi hai — "
                f"yahan ye roles hain: {', '.join(roles_here)}."
            )
        else:
            roles_here = sorted({role_labels.get(u.role, u.role) for u in base})
            if len(base) > 1:
                payload["hint"] = (
                    f"Password in mein se kisi se match nahi hua. Is email par {len(base)} account(s): {', '.join(roles_here)}. "
                    "Role sahi chunein aur usi role wala password likhein."
                )
            else:
                u0 = base[0]
                payload["accountRole"] = u0.role
                payload["accountRoleLabel"] = role_labels.get(u0.role, u0.role)
                payload["hint"] = (
                    f"Email mili; «{payload['accountRoleLabel']}» — password galat. "
                    "Django Admin wala password exact likhein."
                )
        if django_settings.DEBUG:
            payload["debug_hint"] = "bad_password"
        return JsonResponse(payload, status=401)

    token = make_token({"userId": str(user.id), "role": user.role, "companyId": str(user.company_id) if user.company_id else None})
    login_payload = {
        "message": "Login successful",
        "role": user.role,
        "userName": user.name,
        "companyId": str(user.company_id) if user.company_id else None,
        "companyName": user.company.name if user.company_id else None,
        "loginAs": (
            "company"
            if user.role == Role.COMPANY_ADMIN
            else "member"
            if user.role == Role.MEMBER
            else "super_admin"
            if user.role == Role.SUPER_ADMIN
            else user.role
        ),
    }
    response = JsonResponse(login_payload)
    set_auth_cookie(response, token)
    return response


@csrf_exempt
@require_http_methods(["POST"])
def demo_login(_request):
    demo_name = "Faizan"
    demo_email = "faizandemo@yopmail.com"
    demo_company_name = "Demo Company"

    company = Company.objects.filter(name=demo_company_name).first()
    if not company:
        company = Company.objects.create(
            name=demo_company_name,
            email="demo-company@attendance.local",
        )
    user = User.objects.select_related("company").filter(email=demo_email).first()
    if not user:
        user = User.objects.create(
            name=demo_name,
            email=demo_email,
            password_hash=hash_password(generate_password()),
            role=Role.MEMBER,
            company=company,
        )
    elif user.role != Role.MEMBER or not user.company_id:
        user.role = Role.MEMBER
        user.company = company
        user.save(update_fields=["role", "company", "updated_at"])

    token = make_token({"userId": str(user.id), "role": user.role, "companyId": str(user.company_id) if user.company_id else None})
    body = {
        "message": "Demo login successful",
        "role": user.role,
        "userName": user.name,
        "companyId": str(user.company_id) if user.company_id else None,
        "companyName": user.company.name if user.company_id else None,
        "demoMode": True,
    }
    response = JsonResponse(body)
    set_auth_cookie(response, token)
    return response


@csrf_exempt
@require_http_methods(["POST"])
def logout(_request):
    response = JsonResponse({"message": "Logged out"})
    clear_auth_cookie(response)
    return response


@csrf_exempt
@require_http_methods(["GET", "POST"])
@auth_required(Role.SUPER_ADMIN)
def super_admin_companies(request):
    if request.method == "GET":
        companies = Company.objects.all().order_by("-created_at")
        data = []
        for company in companies:
            members_count = User.objects.filter(company=company, role=Role.MEMBER).count()
            data.append(
                {
                    "id": str(company.id),
                    "name": company.name,
                    "email": company.email,
                    "membersCount": members_count,
                    "workStart": company.work_start_time.strftime("%H:%M"),
                    "workEnd": company.work_end_time.strftime("%H:%M"),
                    "timezone": company.timezone,
                    "officeLatitude": float(company.office_latitude),
                    "officeLongitude": float(company.office_longitude),
                    "locationRadiusMeters": company.location_radius_meters,
                }
            )
        return JsonResponse({"companies": data})

    body = parse_body(request)
    company_name = (body.get("companyName") or "").strip()
    company_email = (body.get("companyEmail") or "").strip().lower()
    admin_name = (body.get("adminName") or "").strip()
    work_start_s = (body.get("workStart") or "").strip()
    work_end_s = (body.get("workEnd") or "").strip()
    tz_name = (body.get("timezone") or "Asia/Karachi").strip()
    tz_valid = require_valid_iana_timezone(tz_name)
    if not tz_valid:
        return JsonResponse(
            {"error": "Timezone must use a valid IANA name, for example Asia/Karachi."},
            status=400,
        )
    tz_name = tz_valid
    try:
        work_start = parse_hhmm(work_start_s)
        work_end = parse_hhmm(work_end_s)
    except (ValueError, TypeError):
        return JsonResponse(
            {
                "error": "workStart and workEnd must be in HH:MM format.",
            },
            status=400,
        )

    try:
        # Auto-fill support: clients can send admin/current location keys too.
        office_lat = _first_float(body, "officeLatitude", "adminLatitude", "latitude", "lat")
        office_lng = _first_float(body, "officeLongitude", "adminLongitude", "longitude", "lng")
        location_radius_meters = _first_int(body, "locationRadiusMeters", "officeRadiusMeters", "radiusMeters", "radius")
    except ValueError:
        return JsonResponse({"error": "Office latitude/longitude and radius must be numeric values."}, status=400)

    if (office_lat is None) != (office_lng is None):
        return JsonResponse({"error": "Both office latitude and longitude are required together."}, status=400)
    if office_lat is None or office_lng is None:
        office_lat, office_lng = 24.860966, 67.001100
    if not (-90 <= office_lat <= 90 and -180 <= office_lng <= 180):
        return JsonResponse({"error": "Office latitude/longitude values are out of valid range."}, status=400)

    if location_radius_meters is None:
        location_radius_meters = 200
    if location_radius_meters < 20 or location_radius_meters > 5000:
        return JsonResponse({"error": "locationRadiusMeters must be between 20 and 5000."}, status=400)

    if not company_name or not company_email or not admin_name:
        return JsonResponse({"error": "Invalid payload"}, status=400)
    if email_already_taken(company_email):
        return JsonResponse(
            {"error": "This email is already in use. Company and member emails must be globally unique."},
            status=400,
        )
    password = generate_password()
    company = Company.objects.create(
        name=company_name,
        email=company_email,
        work_start_time=work_start,
        work_end_time=work_end,
        timezone=tz_name,
        office_latitude=Decimal(str(office_lat)),
        office_longitude=Decimal(str(office_lng)),
        location_radius_meters=location_radius_meters,
    )
    User.objects.create(
        name=admin_name,
        email=company_email,
        password_hash=hash_password(password),
        role=Role.COMPANY_ADMIN,
        company=company,
    )
    mail_result = send_credentials_email(
        company_email, admin_name, password, "Company", company_name=company_name
    )
    payload = {
        "message": "Company created",
        "company": {"id": str(company.id), "name": company.name, "email": company.email, "tempPassword": password},
    }
    if mail_result.get("mocked"):
        miss = mail_result.get("missing") or []
        payload["emailWarning"] = (
            "Real email nahi gayi — "
            + ("; ".join(miss) if miss else "SMTP/Brevo env")
            + " backend/.env ya server Variables mein set karo; password abhi response/console par hai."
        )
    elif not mail_result.get("sent"):
        payload["emailWarning"] = f"Email send fail: {mail_result.get('error', 'unknown')}"
    return JsonResponse(payload)


@csrf_exempt
@require_http_methods(["POST"])
@auth_required(Role.SUPER_ADMIN)
def super_admin_members(request):
    """Deprecated: member creation is handled by company admins from the company dashboard."""
    return JsonResponse({"error": "This endpoint is disabled. Add members from the company admin dashboard."}, status=410)


@csrf_exempt
@require_http_methods(["GET", "POST"])
@auth_required(Role.COMPANY_ADMIN)
def company_members(request):
    company_id = request.session_user.get("companyId")
    if not company_id:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method == "GET":
        members = User.objects.filter(company_id=company_id, role=Role.MEMBER).order_by("-created_at")
        data = [
            {"id": str(member.id), "name": member.name, "email": member.email, "createdAt": member.created_at.isoformat()}
            for member in members
        ]
        return JsonResponse({"members": data})

    body = parse_body(request)
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    if not name or not email:
        return JsonResponse({"error": "Invalid payload"}, status=400)

    raw_pw = body.get("password")
    if isinstance(raw_pw, str) and raw_pw.strip():
        password = raw_pw.strip()
        if len(password) < 8:
            return JsonResponse({"error": "Member password must be at least 8 characters."}, status=400)
        if len(password) > 128:
            return JsonResponse({"error": "Member password is too long."}, status=400)
    else:
        password = generate_password()

    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company not found."}, status=404)
    if email_already_taken(email):
        return JsonResponse(
            {"error": "This email is already in use. Company and member emails must be globally unique."},
            status=400,
        )

    member = User.objects.create(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=Role.MEMBER,
        company_id=company_id,
    )
    mail_result = send_credentials_email(
        email, name, password, "Member", company_name=company.name
    )
    payload = {
        "message": "Member created",
        "member": {
            "id": str(member.id),
            "name": member.name,
            "email": member.email,
            "createdAt": member.created_at.isoformat(),
            "tempPassword": password,
        },
    }
    if mail_result.get("mocked"):
        miss = mail_result.get("missing") or []
        payload["emailWarning"] = (
            "Real email nahi gayi — "
            + ("; ".join(miss) if miss else "SMTP/Brevo env")
            + " set karo; password API response me hai."
        )
    elif not mail_result.get("sent"):
        payload["emailWarning"] = f"Email send fail: {mail_result.get('error', 'unknown')}"
    return JsonResponse(payload)


@csrf_exempt
@require_http_methods(["GET", "PATCH"])
@auth_required(Role.COMPANY_ADMIN)
def company_settings(request):
    company_id = request.session_user.get("companyId")
    if not company_id:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company not found"}, status=404)

    if request.method == "GET":
        payload = {
            "company": {
                "name": company.name,
                "email": company.email,
                "workStart": company.work_start_time.strftime("%H:%M"),
                "workEnd": company.work_end_time.strftime("%H:%M"),
                "timezone": company.timezone,
                "officeLatitude": float(company.office_latitude),
                "officeLongitude": float(company.office_longitude),
                "locationRadiusMeters": company.location_radius_meters,
            }
        }
        if not stored_timezone_is_valid(company):
            payload["timezoneWarning"] = (
                "Database me timezone invalid hai (mis: 'gujranwala'). "
                "Abhi calculations Asia/Karachi fallback use ho rahi hain — yahan Asia/Karachi save kar dein."
            )
        return JsonResponse(payload)

    body = parse_body(request)
    if "workStart" in body:
        try:
            company.work_start_time = parse_hhmm(str(body.get("workStart")))
        except ValueError:
            return JsonResponse({"error": "workStart HH:MM format me hona chahiye."}, status=400)
    if "workEnd" in body:
        try:
            company.work_end_time = parse_hhmm(str(body.get("workEnd")))
        except ValueError:
            return JsonResponse({"error": "workEnd HH:MM format me hona chahiye."}, status=400)
    if "timezone" in body:
        tz = require_valid_iana_timezone(str(body.get("timezone")))
        if not tz:
            return JsonResponse(
                {"error": "Timezone IANA hona chahiye, maslan Asia/Karachi."},
                status=400,
            )
        company.timezone = tz
    try:
        olat = _first_float(body, "officeLatitude", "adminLatitude", "latitude", "lat")
        olng = _first_float(body, "officeLongitude", "adminLongitude", "longitude", "lng")
    except ValueError:
        return JsonResponse({"error": "officeLatitude / officeLongitude number hon."}, status=400)
    if (olat is None) != (olng is None):
        return JsonResponse({"error": "officeLatitude aur officeLongitude dono sath bhejein."}, status=400)
    if olat is not None and olng is not None:
        if not (-90 <= olat <= 90 and -180 <= olng <= 180):
            return JsonResponse({"error": "Office lat/lng range galat."}, status=400)
        company.office_latitude = Decimal(str(olat))
        company.office_longitude = Decimal(str(olng))
    try:
        r = _first_int(body, "locationRadiusMeters", "officeRadiusMeters", "radiusMeters", "radius")
    except ValueError:
        return JsonResponse({"error": "locationRadiusMeters number hona chahiye."}, status=400)
    if r is not None:
        if r < 20 or r > 5000:
            return JsonResponse({"error": "locationRadiusMeters 20-5000 ke beech hon."}, status=400)
        company.location_radius_meters = r

    company.save()
    return JsonResponse({"message": "Company settings save ho gayin."})


@csrf_exempt
@require_http_methods(["GET"])
@auth_required(Role.COMPANY_ADMIN)
def company_attendance_reports(request):
    """Har member ka din-wise status (complete / pending / absent) — graphs ke liye."""
    company_id = request.session_user.get("companyId")
    if not company_id:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse({"error": "Company not found"}, status=404)

    try:
        days = int(request.GET.get("days") or 21)
    except (TypeError, ValueError):
        days = 21
    days = max(7, min(days, 90))

    now = timezone.now()
    end_d = company_local_date(company, now)
    start_d = end_d - datetime.timedelta(days=days - 1)

    members = list(User.objects.filter(company_id=company_id, role=Role.MEMBER).order_by("name"))
    filter_raw = (request.GET.get("memberId") or request.GET.get("member_id") or "").strip()
    if filter_raw:
        try:
            fid = uuid.UUID(filter_raw)
        except ValueError:
            return JsonResponse({"error": "memberId must be a valid UUID."}, status=400)
        members = [m for m in members if m.id == fid]
        if not members:
            return JsonResponse({"error": "Member not found in your company."}, status=404)

    member_ids = [m.id for m in members]

    att_map = {}
    if member_ids:
        for a in Attendance.objects.filter(member_id__in=member_ids, date__gte=start_d, date__lte=end_d):
            att_map[(a.member_id, a.date)] = a

    def status_for_row(row):
        if row is None:
            return "absent"
        if row.is_check_in_fake or row.is_check_out_fake:
            return "fake"
        if row.checked_in_at and row.checked_out_at:
            return "complete"
        if row.checked_in_at:
            return "pending"
        return "absent"

    all_dates = []
    d = start_d
    while d <= end_d:
        all_dates.append(d.isoformat())
        d += datetime.timedelta(days=1)

    out_members = []
    for m in members:
        series = []
        summary = {"complete": 0, "pending": 0, "absent": 0, "fake": 0}
        d2 = start_d
        while d2 <= end_d:
            row = att_map.get((m.id, d2))
            st = status_for_row(row)
            series.append({"date": d2.isoformat(), "status": st})
            summary[st] = summary.get(st, 0) + 1
            d2 += datetime.timedelta(days=1)
        out_members.append(
            {
                "id": str(m.id),
                "name": m.name,
                "email": m.email,
                "series": series,
                "summary": summary,
            }
        )

    return JsonResponse(
        {
            "timezone": company.timezone,
            "startDate": start_d.isoformat(),
            "endDate": end_d.isoformat(),
            "dates": all_dates,
            "members": out_members,
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
@auth_required(Role.MEMBER)
def member_location_label(request):
    """OpenStreetMap Nominatim reverse geocode — jagah ka naam (street-level zoom)."""
    try:
        lat = float(request.GET.get("latitude") or request.GET.get("lat", ""))
        lng = float(request.GET.get("longitude") or request.GET.get("lng", ""))
    except ValueError:
        return JsonResponse({"error": "latitude aur longitude bhejein"}, status=400)
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return JsonResponse({"error": "range galat"}, status=400)

    # zoom=19: finer reverse result near the exact pin (label is still an approximation vs GPS error).
    params = urllib.parse.urlencode(
        {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "zoom": 19,
            "addressdetails": 1,
            "accept-language": "en,ur",
        }
    )
    url = f"https://nominatim.openstreetmap.org/reverse?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AttendanceMarkApp/1.0 (internal attendance demo)",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, ValueError):
        short = f"{lat:.5f}, {lng:.5f}"
        return JsonResponse(
            {
                "label": short,
                "shortAddress": short,
                "fallback": True,
                "latitude": lat,
                "longitude": lng,
            }
        )

    addr = payload.get("address") or {}
    feat_name = (payload.get("name") or "").strip()
    parts = [
        feat_name,
        addr.get("amenity"),
        addr.get("shop"),
        addr.get("marketplace"),
        addr.get("commercial"),
        addr.get("retail"),
        addr.get("tourism"),
        addr.get("road"),
        addr.get("neighbourhood"),
        addr.get("quarter"),
        addr.get("suburb"),
        addr.get("hamlet"),
        addr.get("village"),
        addr.get("city_district"),
        addr.get("city") or addr.get("town") or addr.get("municipality"),
        addr.get("state"),
        addr.get("country"),
    ]
    seen = set()
    ordered = []
    for p in parts:
        if not p:
            continue
        s = str(p).strip()
        if not s:
            continue
        key = s.casefold()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(s)
    label = ", ".join(ordered)
    if not label.strip():
        dn = (payload.get("display_name") or "").strip()
        label = dn[:220] if dn else f"{lat:.5f}, {lng:.5f}"

    out = {
        "label": label,
        "displayName": payload.get("display_name"),
        "fallback": False,
        "latitude": lat,
        "longitude": lng,
    }
    return JsonResponse(out)


@csrf_exempt
@require_http_methods(["GET", "POST"])
@auth_required(Role.MEMBER)
def member_attendance(request):
    member_id = request.session_user.get("userId")
    member = User.objects.select_related("company").filter(id=member_id).first()
    if not member:
        return JsonResponse({"error": "Member account nahi mila — dubara login karein."}, status=401)

    # Kabhi-kabhi admin ne role MEMBER rakha ho lekin company khali — GET par 400 se UI toot jata hai
    if not member.company_id:
        cid = (request.session_user.get("companyId") or "").strip()
        if cid:
            co = Company.objects.filter(id=cid).first()
            if co:
                member.company = co
                member.save(update_fields=["company", "updated_at"])
                member = User.objects.select_related("company").filter(id=member_id).first()

    if not member or not member.company:
        return JsonResponse(
            {
                "history": [],
                "company": None,
                "companies": [],
                "demoMode": False,
                "setupError": (
                    "Is member par company assign nahi — Django Admin > Users > is user ko company select karke save karein."
                ),
            },
            status=200,
        )
    company = member.company

    if request.method == "GET":
        rows = Attendance.objects.filter(member_id=member_id).order_by("-date")[:60]
        data = []
        for row in rows:
            data.append(
                {
                    "id": str(row.id),
                    "date": row.date.isoformat(),
                    "checkedInAt": row.checked_in_at.isoformat() if row.checked_in_at else None,
                    "checkedOutAt": row.checked_out_at.isoformat() if row.checked_out_at else None,
                    "checkInLatitude": float(row.check_in_latitude) if row.check_in_latitude is not None else None,
                    "checkInLongitude": float(row.check_in_longitude) if row.check_in_longitude is not None else None,
                    "checkOutLatitude": float(row.check_out_latitude) if row.check_out_latitude is not None else None,
                    "checkOutLongitude": float(row.check_out_longitude) if row.check_out_longitude is not None else None,
                    "checkInPhotoUrl": row.check_in_photo.url if row.check_in_photo else None,
                    "checkOutPhotoUrl": row.check_out_photo.url if row.check_out_photo else None,
                    "checkInDistanceMeters": row.check_in_distance_meters,
                    "checkOutDistanceMeters": row.check_out_distance_meters,
                    "isCheckInFake": row.is_check_in_fake,
                    "isCheckOutFake": row.is_check_out_fake,
                    "isFake": row.is_check_in_fake or row.is_check_out_fake,
                }
            )
        company_payload = {
            "id": str(company.id),
            "name": company.name,
            "workStart": company.work_start_time.strftime("%H:%M"),
            "workEnd": company.work_end_time.strftime("%H:%M"),
            "timezone": company.timezone,
            "officeLatitude": float(company.office_latitude),
            "officeLongitude": float(company.office_longitude),
            "locationRadiusMeters": company.location_radius_meters,
            "localToday": company_local_date(company, timezone.now()).isoformat(),
        }
        companies = [{"id": str(company.id), "name": company.name}]
        return JsonResponse({"history": data, "company": company_payload, "companies": companies, "demoMode": member.email == "faizandemo@yopmail.com"})

    if member.email == "faizandemo@yopmail.com":
        return JsonResponse({"error": "Demo user is view-only. Attendance marking is disabled."}, status=403)

    now = timezone.now()
    if not in_work_window(company, now):
        local = company_local_now(company, now)
        ws = company.work_start_time.strftime("%H:%M")
        we = company.work_end_time.strftime("%H:%M")
        return JsonResponse(
            {
                "error": (
                    f"Attendance is only allowed during shift hours "
                    f"({ws} - {we}, timezone: {company.timezone}). "
                    f"Current local time: {local.strftime('%H:%M')}."
                ),
                "hint": "Ask your company admin to verify shift start/end and timezone settings.",
                "currentLocalTime": local.strftime("%H:%M"),
                "windowStart": ws,
                "windowEnd": we,
            },
            status=400,
        )

    ct = (request.content_type or "").lower()
    if "multipart/form-data" not in ct:
        return JsonResponse(
            {
                "error": "Send multipart/form-data with latitude, longitude, and live camera photo.",
                "hint": f"Current Content-Type is {request.content_type!r}. Submit using browser FormData, not JSON.",
            },
            status=400,
        )

    lat_s = request.POST.get("latitude")
    lng_s = request.POST.get("longitude")
    posted_company_id = (request.POST.get("companyId") or "").strip()
    action = (request.POST.get("action") or "").strip().lower()
    if action and action not in ("check_in", "check_out"):
        return JsonResponse({"error": 'Use action "check_in" or "check_out", or omit it for legacy submit.'}, status=400)
    photo = request.FILES.get("photo")
    if not lat_s or not lng_s or not photo:
        return JsonResponse({"error": "latitude, longitude, and a live photo are required."}, status=400)
    if posted_company_id and posted_company_id != str(company.id):
        return JsonResponse(
            {"error": "You can only mark attendance for your assigned company."},
            status=403,
        )
    try:
        lat = float(lat_s)
        lng = float(lng_s)
    except ValueError:
        return JsonResponse({"error": "latitude/longitude must be numeric values."}, status=400)

    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return JsonResponse({"error": "Location values are out of valid range."}, status=400)
    if not allowed_image_type(photo):
        return JsonResponse({"error": "Photo must be JPEG/PNG/WebP."}, status=400)
    if photo.size > 5 * 1024 * 1024:
        return JsonResponse({"error": "Photo must be smaller than 5MB."}, status=400)

    try:
        if hasattr(photo, "seek"):
            photo.seek(0)
    except OSError:
        pass

    office_lat = float(company.office_latitude)
    office_lng = float(company.office_longitude)
    distance_m = haversine_meters(lat, lng, office_lat, office_lng)
    is_fake = distance_m > float(company.location_radius_meters)
    dm = _clamp_distance_meters(distance_m)

    try:
        lat_dec = _geo_decimal(lat)
        lng_dec = _geo_decimal(lng)
    except ValueError:
        return JsonResponse({"error": "Invalid location coordinates (non-finite)."}, status=400)

    today_local = company_local_date(company, now)
    existing = Attendance.objects.filter(member_id=member_id, date=today_local).first()

    try:
        if not existing:
            if action == "check_out":
                return JsonResponse(
                    {"error": "Check in first — there is no attendance record for today yet."},
                    status=400,
                )
            row = Attendance.objects.create(
                member_id=member_id,
                date=today_local,
                checked_in_at=now,
                check_in_latitude=lat_dec,
                check_in_longitude=lng_dec,
                check_in_photo=photo,
                check_in_distance_meters=dm,
                is_check_in_fake=is_fake,
            )
            return JsonResponse(
                {
                    "message": "Checked in",
                    "row": {"id": str(row.id)},
                    "distanceMeters": dm,
                    "isFake": is_fake,
                }
            )
        if not existing.checked_in_at:
            return JsonResponse(
                {
                    "error": "Today's attendance row has no check-in time. Ask an admin to fix or delete the row in Django Admin.",
                },
                status=400,
            )
        if not existing.checked_out_at:
            if action == "check_in":
                return JsonResponse(
                    {"error": "You already checked in today. Use Check out when you leave."},
                    status=400,
                )
            existing.checked_out_at = now
            existing.check_out_latitude = lat_dec
            existing.check_out_longitude = lng_dec
            existing.check_out_photo = photo
            existing.check_out_distance_meters = dm
            existing.is_check_out_fake = is_fake
            existing.save()
            return JsonResponse(
                {
                    "message": "Checked out",
                    "row": {"id": str(existing.id)},
                    "distanceMeters": dm,
                    "isFake": existing.is_check_in_fake or existing.is_check_out_fake,
                }
            )
        return JsonResponse({"message": "Attendance already completed for today"})
    except IntegrityError:
        return JsonResponse(
            {"error": "Attendance for this day is already recorded — refresh the page and try again."},
            status=409,
        )
    except DatabaseError as exc:
        logger.exception("member_attendance database error")
        return JsonResponse(
            {
                "error": "Database error while saving attendance. On the server, run: python manage.py migrate",
                "hint": str(exc) if django_settings.DEBUG else "",
            },
            status=500,
        )
    except Exception as exc:
        logger.exception("member_attendance save failed")
        payload: dict = {"error": "Could not save attendance — please try again."}
        if django_settings.DEBUG:
            payload["hint"] = str(exc)
        return JsonResponse(payload, status=500)


@require_http_methods(["GET"])
def health(_request):
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def test_email(request):
    """
    Gmail / SMTP verify karne ke liye.
    .env: EMAIL_TEST_SECRET=apna-random-string
    Request: POST /api/test-email
      Header: X-Email-Test-Secret: <same as EMAIL_TEST_SECRET>
      Body JSON: {"to": "you@gmail.com"}
    """
    expected = (os.getenv("EMAIL_TEST_SECRET") or "").strip()
    if not expected:
        return JsonResponse(
            {
                "error": "EMAIL_TEST_SECRET .env me set karo (koi random string), phir server restart karo.",
            },
            status=400,
        )
    got = (request.headers.get("X-Email-Test-Secret") or "").strip()
    if got != expected:
        return JsonResponse({"error": "Header X-Email-Test-Secret galat ya missing hai."}, status=401)

    body = parse_body(request)
    to = (body.get("to") or "").strip().lower()
    if not to or "@" not in to:
        return JsonResponse({"error": "Body me valid \"to\" email chahiye."}, status=400)

    try:
        result = send_test_email(to)
    except Exception as exc:  # noqa: BLE001 — user-facing SMTP errors
        return JsonResponse({"error": str(exc)}, status=500)

    if result.get("mocked"):
        return JsonResponse(
            {
                "ok": True,
                "mocked": True,
                "message": "SMTP_HOST / SMTP_USER / SMTP_PASS khali hain — console me mock log dekho, real mail nahi gaya.",
            }
        )
    return JsonResponse({"ok": True, "mocked": False, "message": f"Test email bhej diya: {to}"})
